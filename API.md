# API設計

ベースURL：`/api/v1`  
認証：全エンドポイントで `Authorization: Bearer <supabase_jwt>` 必須

---

## エンドポイント一覧

### ユーザー・プロフィール

| メソッド | パス | 説明 |
|---|---|---|
| `GET` | `/users/me` | 自分のプロフィール取得 |
| `PUT` | `/users/me` | プロフィール更新 |
| `GET` | `/users/search?q=:username` | ユーザー検索（フォロー申請用） |

### 嗜好設定

| メソッド | パス | 説明 |
|---|---|---|
| `GET` | `/users/me/genres` | 自分の嗜好ジャンル取得 |
| `PUT` | `/users/me/genres` | 嗜好ジャンル更新（最大3件） |
| `GET` | `/genres` | ジャンルマスタ一覧 |

### フォロー

| メソッド | パス | 説明 |
|---|---|---|
| `GET` | `/follows` | 相互フォロワー一覧 |
| `GET` | `/follows/requests/received` | 受信した申請一覧（pending） |
| `GET` | `/follows/requests/sent` | 送信した申請一覧 |
| `POST` | `/follows/requests` | フォロー申請送信 |
| `PATCH` | `/follows/requests/:id` | 申請への返答（accept / reject） |
| `DELETE` | `/follows/:id` | フォロー解除 |

### 店舗

| メソッド | パス | 説明 |
|---|---|---|
| `GET` | `/restaurants/search?q=:keyword` | Google Places API（New）経由で検索・キャッシュ保存 |
| `GET` | `/restaurants/:id` | 店舗詳細（DBキャッシュから返す） |

### レビュー

| メソッド | パス | 説明 |
|---|---|---|
| `GET` | `/reviews` | フィード（自分 + 相互フォロワー全員のレビュー） |
| `GET` | `/reviews/map` | マップ用（位置情報付きで全件返す） |
| `POST` | `/reviews` | レビュー投稿 |
| `GET` | `/reviews/:id` | レビュー詳細 |
| `PUT` | `/reviews/:id` | レビュー編集（自分のみ） |
| `DELETE` | `/reviews/:id` | レビュー削除（自分のみ） |
| `GET` | `/users/:userId/reviews` | 特定ユーザーのレビュー一覧（相互フォロワーのみ閲覧可） |

---

## リクエスト / レスポンス例

### `POST /reviews`

```json
// Request
{
  "restaurantId": "uuid",
  "rating": "want_to_revisit",
  "comment": "スープが濃厚で最高でした",
  "visitedAt": "2026-06-01"
}

// Response 201
{
  "id": "uuid",
  "restaurantId": "uuid",
  "rating": "want_to_revisit",
  "comment": "スープが濃厚で最高でした",
  "visitedAt": "2026-06-01",
  "createdAt": "2026-06-10T00:00:00Z"
}
```

### `GET /reviews/map`

```json
// Response 200
[
  {
    "id": "uuid",
    "user": { "id": "uuid", "displayName": "田中" },
    "restaurant": {
      "id": "uuid",
      "name": "ラーメン○○",
      "lat": 35.681236,
      "lng": 139.767125
    },
    "rating": "want_to_revisit"
  }
]
```

### `PATCH /follows/requests/:id`

```json
// Request
{ "status": "accepted" }

// Response 200
{
  "id": "uuid",
  "fromUserId": "uuid",
  "toUserId": "uuid",
  "status": "accepted",
  "updatedAt": "2026-06-10T00:00:00Z"
}
```

### `GET /restaurants/search?q=ラーメン`

```json
// Response 200
[
  {
    "id": "uuid",
    "place_id": "ChIJN1t_tDeuEmsR...",
    "name": "ラーメン○○",
    "address": "東京都渋谷区...",
    "lat": 35.681236,
    "lng": 139.767125,
    "genre": "ラーメン",
    "photo_url": "https://places.googleapis.com/v1/places/.../media?maxWidthPx=400&key=..."
  }
]
```

---

## エラーレスポンス共通形式

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です"
  }
}
```

| HTTPステータス | code | 用途 |
|---|---|---|
| 400 | `BAD_REQUEST` | バリデーションエラー |
| 401 | `UNAUTHORIZED` | 未認証 |
| 403 | `FORBIDDEN` | 権限なし（他人のレビュー編集など） |
| 404 | `NOT_FOUND` | リソースが存在しない |
| 500 | `INTERNAL_ERROR` | サーバーエラー |
