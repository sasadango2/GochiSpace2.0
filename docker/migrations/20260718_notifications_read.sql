-- 通知の既読処理
-- 適用先：本番 Supabase（SQL Editor で実行）
-- 注意：この SQL を適用してからバックエンドをデプロイすること

-- 通知ページを最後に開いた日時。これ以降に作成された pending リクエストだけを未読としてバッジに数える
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_read_at TIMESTAMPTZ;
