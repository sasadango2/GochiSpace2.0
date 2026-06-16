# DBスキーマ設計

## テーブル一覧

| テーブル | 用途 |
|---|---|
| `profiles` | ユーザープロフィール（auth.users の拡張） |
| `genres` | ジャンルマスタ |
| `user_genre_preferences` | 嗜好設定（ユーザーごとに最大3件） |
| `follow_requests` | フォロー申請・承認管理（相互フォロー） |
| `restaurants` | ホットペッパーAPI店舗キャッシュ |
| `reviews` | レビュー |

---

## テーブル定義

### `profiles`

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | UUID | PK, FK → auth.users | Supabase Auth と同一ID |
| `username` | VARCHAR(50) | UNIQUE NOT NULL | |
| `display_name` | VARCHAR(100) | NOT NULL | |
| `avatar_url` | TEXT | | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

---

### `genres`

| カラム | 型 | 制約 |
|---|---|---|
| `id` | SERIAL | PK |
| `name` | VARCHAR(50) | NOT NULL |

---

### `user_genre_preferences`

| カラム | 型 | 制約 |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles, NOT NULL |
| `genre_id` | INT | FK → genres, NOT NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

制約: `UNIQUE(user_id, genre_id)` / 上限3件はアプリ側で制御

---

### `follow_requests`

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | UUID | PK | |
| `from_user_id` | UUID | FK → profiles, NOT NULL | 申請した側 |
| `to_user_id` | UUID | FK → profiles, NOT NULL | 申請された側 |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' | `pending` / `accepted` / `rejected` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

制約: `UNIQUE(from_user_id, to_user_id)`

---

### `restaurants`

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | UUID | PK | |
| `hotpepper_id` | VARCHAR(50) | UNIQUE NOT NULL | ホットペッパーのID |
| `name` | VARCHAR(200) | NOT NULL | |
| `address` | TEXT | | |
| `lat` | DECIMAL(9,6) | | マップ表示用 |
| `lng` | DECIMAL(9,6) | | マップ表示用 |
| `genre` | VARCHAR(100) | | |
| `hotpepper_url` | TEXT | | |
| `cached_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `photo_url` | TEXT | | 未決定。ホットペッパー photo.pc.m を想定 |

---

### `reviews`

| カラム | 型 | 制約 | 備考 |
|---|---|---|---|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → profiles, NOT NULL | |
| `restaurant_id` | UUID | FK → restaurants, NOT NULL | |
| `rating` | ENUM | NOT NULL | `want_to_revisit` / `average` / `not_good` |
| `comment` | TEXT | | |
| `visited_at` | DATE | | 訪問日 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

---

## 設計方針

- フォロー：申請→承認で相互フォロー成立（`follow_requests` 1レコードで状態管理）
- 店舗データ：ホットペッパーAPIの結果をDBにキャッシュ（`hotpepper_id` で一意管理）
- レビュー評価：ラベル方式（`want_to_revisit` / `average` / `not_good`）
- レビュー閲覧権限：相互フォロワー限定（アプリ側クエリで制御、DB制約なし）

---

## 推奨インデックス

```sql
CREATE INDEX idx_follow_requests_from ON follow_requests(from_user_id, status);
CREATE INDEX idx_follow_requests_to   ON follow_requests(to_user_id, status);
CREATE INDEX idx_restaurants_location ON restaurants(lat, lng);
CREATE INDEX idx_reviews_user         ON reviews(user_id, created_at DESC);
```

---

## ER図（簡略）

```
auth.users ──── profiles ────┬──── user_genre_preferences ──── genres
                              │
                              ├──── follow_requests (from/to)
                              │
                              └──── reviews ──── restaurants
```
