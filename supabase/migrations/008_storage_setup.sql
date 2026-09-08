-- ============================================================
-- Migration 008: Setup Storage Bucket 'media' dan RLS Policies
-- ============================================================

-- 1. Buat bucket 'media' jika belum ada dan pastikan public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- 2. Kebijakan Read: Siapa saja (termasuk anon & keluarga) bisa melihat foto silsilah
DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
CREATE POLICY "media_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

-- 3. Kebijakan Upload: User terautentikasi bisa mengunggah foto
DROP POLICY IF EXISTS "media_auth_insert" ON storage.objects;
CREATE POLICY "media_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'media' 
    AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
  );

-- 4. Kebijakan Update: User terautentikasi bisa memperbarui file
DROP POLICY IF EXISTS "media_auth_update" ON storage.objects;
CREATE POLICY "media_auth_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'media'
    AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
  );

-- 5. Kebijakan Delete: User terautentikasi bisa menghapus file
DROP POLICY IF EXISTS "media_auth_delete" ON storage.objects;
CREATE POLICY "media_auth_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media'
    AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
  );
