-- 透明化 第2弾のためのカラム追加
-- 適用先：本番 Supabase（SQL Editor で実行）
-- 注意：この SQL を適用してから第2弾のバックエンドをデプロイすること
--（新コードは wanna_go.visited_at / profiles.bio を参照するため、順序が逆だとAPIがエラーになる）

-- 「行きたい→実行の転換率」の元データを残すため、レビュー投稿時の削除をやめて訪問済みマークに変える
ALTER TABLE wanna_go ADD COLUMN IF NOT EXISTS visited_at TIMESTAMPTZ;

-- 自己紹介文（「パクチー苦手」等、集計では拾えない嗜好の自由記述）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
