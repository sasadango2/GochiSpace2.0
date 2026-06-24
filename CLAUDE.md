# GochiSpace

美味しい発見をシェアする、飲食店レビュー共有サービス（再構築版）

## プロジェクト概要
家族・友人など信頼できる人同士でのみ飲食店レビューを共有できるWebサービス。
匿名性・サクラ投稿の問題を解消し、相手の好みを理解した上で飲食店を選べる環境を実現する。

## 主な機能
- ユーザー認証（Supabase Auth）
- 相互フォロー機能（クローズドな設計）
- マップ表示機能（地図上のマーカーからレビューを閲覧）
- 嗜好設定（好きなジャンル最大3つを登録）
- フォローユーザー検索・フォロー申請
- レビュー投稿（店舗検索・カテゴリー・評価・コメント）

## 技術スタック

### フロントエンド
- **React 19** + **TypeScript** + **Vite**
- **React Router v7** - ルーティング
- **Material-UI (MUI) v7** - UIコンポーネント
- **Leaflet.js + OpenStreetMap** - 地図表示（完全無料）
- **ホットペッパーグルメAPI** - 店舗検索（無料）

### バックエンド（Docker で管理）
- **Node.js + Hono + TypeScript**
- Docker / Docker Compose でローカル開発・デプロイ管理

### データベース・認証
- **Supabase**（PostgreSQL）- データベース（無料枠：500MB）
- **Supabase Auth** - ユーザー認証

### ホスティング
- フロントエンド：**Vercel**（無料）
- バックエンド：**Render** または **Railway**（無料枠）
- DB：**Supabase**（無料枠）

## コスト方針
完全無料枠での運用を目指す。有料APIは使用しない。

## コーディング規約
- 変数・関数名：camelCase
- 関数は動詞始まり（例：fetchRestaurant, handleReview, validateUser）
- 1関数50行以内
- TypeScript の型定義を必ず書く（any 禁止）
- コメントは必要最低限（WHYが非自明な場合のみ）
- スマホとPCでの操作を想定したUIにすること

## DB設計方針
- PostgreSQL（リレーショナル）で相互フォローをSQLのJOINで管理
- Firestoreのような非正規化は行わない

## データベース設計について
- [DB.md](./DB.md) を参照する

## API設計について
- [API.md](./API.md) を参照する

## Docker構成について
- [DOCKER.md](./DOCKER.md) を参照する

## 未決定事項（要議論）
- [x] DBスキーマ設計（テーブル定義）
- [x] API設計（エンドポイント一覧）
- [x] Docker構成（docker-compose.yml の設計）
- [ ] ホットペッパーAPIの利用登録・キー取得
- [ ] デプロイ戦略（Render vs Railway）
- [ ] restaurants テーブルに photo_url カラムを追加するか（ホットペッパー photo.pc.m）
