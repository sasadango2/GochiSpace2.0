# Docker構成

## 構成概要

| 環境 | 管理対象 | 起動方法 |
|---|---|---|
| ローカル開発 | backend + db (PostgreSQL) | `docker compose up` |
| 本番 | backend のみ（DBはSupabase） | `docker compose -f docker-compose.prod.yml up` |
| フロントエンド | Docker管理外 | `npm run dev`（ローカル直接起動） |

---

## ファイル構成

```
/
├── docker-compose.yml          # ローカル開発用（backend + db）
├── docker-compose.prod.yml     # 本番用（backend のみ）
├── .env.example                # 環境変数テンプレート
└── backend/
    └── Dockerfile              # マルチステージビルド（dev / production）
```

---

## Dockerfile（マルチステージ）

| ステージ | 用途 | 起動コマンド |
|---|---|---|
| `dev` | ローカル開発。ホットリロード有効 | `tsx watch src/index.ts` |
| `builder` | TypeScript ビルド（中間ステージ） | - |
| `production` | 本番用。コンパイル済みJSを実行 | `node dist/index.js` |

---

## ローカル開発の起動手順

```bash
# 1. 環境変数ファイルを作成
cp .env.example .env
# .env を編集して SUPABASE_JWT_SECRET, HOTPEPPER_API_KEY を設定

# 2. 起動（backend + db）
docker compose up

# 3. フロントエンドは別ターミナルで
cd frontend && npm run dev
```

### アクセス先
- バックエンド：http://localhost:3000
- PostgreSQL：localhost:5432（DB名: gochispace, ユーザー: postgres）

---

## 本番デプロイ手順

```bash
# Render / Railway 側での実行イメージ
docker compose -f docker-compose.prod.yml up
```

本番では `DATABASE_URL` を Supabase の接続文字列に変更する。

---

## 環境変数一覧

| 変数名 | 必須 | 説明 |
|---|---|---|
| `SUPABASE_JWT_SECRET` | ✅ | JWT検証用シークレット（Supabase管理画面から取得） |
| `SUPABASE_URL` | ✅ | SupabaseプロジェクトURL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase匿名キー |
| `DATABASE_URL` | ✅ | PostgreSQL接続文字列 |
| `HOTPEPPER_API_KEY` | ✅ | ホットペッパーグルメAPIキー |
| `PORT` | | バックエンドポート（デフォルト: 3000） |
| `NODE_ENV` | | `development` or `production` |
