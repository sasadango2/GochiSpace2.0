-- reviews テーブルに photo_urls カラムを追加
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

-- Supabase Storage バケット作成（SQL Editorではなくダッシュボードで実施）
-- Storage > New bucket > 名前: review-photos > Public bucket: ON

-- Storage RLSポリシー（ダッシュボードの Storage > Policies で設定）
-- または以下のSQLで設定:

-- アップロード: 認証済みユーザーが自分のフォルダにのみ書き込める
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "authenticated users can upload their own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'review-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "anyone can view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'review-photos');

CREATE POLICY "users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'review-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
