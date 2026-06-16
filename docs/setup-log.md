# セットアップログ

## 実施日
2026-06-14 〜 2026-06-16

---

## 1. 環境変数ファイルの設定

### `.env` と `.env.example` の違い

| | `.env` | `.env.example` |
|---|---|---|
| 用途 | 実際の秘密情報を格納 | 必要な変数名のテンプレート |
| gitignore | 必ず除外（コミットしない） | コミットする |
| 内容 | `API_KEY=実際のキー` | `API_KEY=your_api_key_here` |

`.env.example` をコピーして `.env` を作成し、実際の値を書き込む運用。

### Docker Compose による `.env` の自動読み込み

`docker-compose.yml` は同ディレクトリの `.env` を自動で読み込む。  
`${HOTPEPPER_API_KEY}` のように記述することでコンテナ内に注入される。

Node.jsへの注入方式は Docker Compose の `env_file:` または `environment:` で行い、dotenv等のパッケージは不要。

---

## 2. ホットペッパーAPIキーの取得・設定

- ホットペッパーグルメAPIに登録し、APIキーを取得
- `.env` に以下を追記

```
HOTPEPPER_API_KEY=（取得したキー）
```

**採用理由：** 完全無料枠での運用方針のため、有料APIは使用しない。ホットペッパーグルメAPIは無料で店舗検索・位置情報・ジャンル情報を取得できる。

---

## 3. Supabase セットアップ

**採用理由：**
- PostgreSQL（リレーショナルDB）で相互フォローをSQLのJOINで管理できる
- Supabase Auth により認証基盤を自前実装せずに済む
- 無料枠（500MB）で運用可能
- Firestoreのような非正規化が不要で、設計がシンプルになる

### アカウント作成・プロジェクト作成

- [supabase.com](https://supabase.com) でアカウント作成（GitHub連携）
- 新規プロジェクトを作成

### Data API 設定

Settings → Data API で以下を設定：

| 設定 | 選択 | 理由 |
|---|---|---|
| データAPIを有効にする | ✅ オン | Supabase Auth の動作に必要。フロントエンドが supabase-js でAuth操作する |
| 新しいテーブルを自動的に公開する | ❌ オフ | 意図しない公開を防ぐため。テーブルごとに手動でアクセス制御する |
| 自動RLSを有効にする | ✅ オン | 新テーブル作成時にRLSが自動で有効になり、デフォルト全拒否で安全 |

### APIキーの取得と `.env` への設定

Settings → Data API から以下を取得して `.env` に追記：

| 変数名 | 取得場所 |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | Project API keys → anon public |
| `SUPABASE_JWT_SECRET` | JWT Settings → JWT Secret |

### 各変数の用途

| 変数 | 用途 | バックエンド（Docker） | フロントエンド |
|---|---|---|---|
| `HOTPEPPER_API_KEY` | ホットペッパーAPI呼び出し | ✅ docker-compose経由 | — |
| `SUPABASE_JWT_SECRET` | JWTトークンの署名検証 | ✅ docker-compose経由 | — |
| `SUPABASE_URL` | Supabase接続先URL | — | 後で `frontend/.env` に設定 |
| `SUPABASE_ANON_KEY` | Supabase匿名キー（Auth用） | — | 後で `frontend/.env` に設定 |

バックエンド（Hono）はDBに直接接続（`DATABASE_URL`）するため、`SUPABASE_URL` / `SUPABASE_ANON_KEY` はバックエンドでは不要。JWTの検証のみ `SUPABASE_JWT_SECRET` で行う。

---

## 4. DBスキーマ作成

Supabase ダッシュボード → SQL Editor → New query で以下を実行。

### テーブル構成と設計理由

| テーブル | 用途 | 設計のポイント |
|---|---|---|
| `profiles` | ユーザープロフィール | `auth.users` のIDをそのまま使い、Supabase Authと連携 |
| `genres` | ジャンルマスタ | 固定値をDBで管理。アプリ側ハードコードを避ける |
| `user_genre_preferences` | 嗜好設定（最大3件） | 上限3件はアプリ側で制御。`UNIQUE(user_id, genre_id)` で重複防止 |
| `follow_requests` | フォロー申請・承認管理 | 1レコードで `pending/accepted/rejected` を管理。相互フォローはJOINで判定 |
| `restaurants` | ホットペッパーAPIの店舗キャッシュ | APIを毎回叩かずDBにキャッシュ。`hotpepper_id` で一意管理 |
| `reviews` | レビュー | 評価はラベル方式（数値評価より主観が出にくい） |

### 実行SQL

```sql
-- ENUM型
CREATE TYPE follow_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE rating_type AS ENUM ('want_to_revisit', 'average', 'not_good');

-- profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- genres
CREATE TABLE genres (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL
);

-- user_genre_preferences
CREATE TABLE user_genre_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  genre_id INT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, genre_id)
);

-- follow_requests
CREATE TABLE follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status follow_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- restaurants
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotpepper_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  genre VARCHAR(100),
  hotpepper_url TEXT,
  photo_url TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating rating_type NOT NULL,
  comment TEXT,
  visited_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_follow_requests_from ON follow_requests(from_user_id, status);
CREATE INDEX idx_follow_requests_to   ON follow_requests(to_user_id, status);
CREATE INDEX idx_restaurants_location ON restaurants(lat, lng);
CREATE INDEX idx_reviews_user         ON reviews(user_id, created_at DESC);

-- genresマスタデータ
INSERT INTO genres (name) VALUES
  ('和食'), ('洋食'), ('中華'), ('イタリアン'), ('フレンチ'),
  ('焼肉'), ('寿司'), ('ラーメン'), ('カフェ'), ('居酒屋');
```

### 確認SQL

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## 完了状況

- ✅ ホットペッパーAPIキー取得・`.env` 設定
- ✅ Supabase プロジェクト作成・APIキー取得・`.env` 設定
- ✅ DBテーブル作成（6テーブル + インデックス + genresマスタ）
- ⬜ Docker起動確認
- ⬜ RLS設定
- ⬜ バックエンド実装
