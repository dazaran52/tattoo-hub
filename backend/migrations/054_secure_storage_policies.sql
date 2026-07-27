-- Migration 054: Secure storage policies and enforce file size / MIME type limits
-- Resolves IDOR vulnerabilities in avatars, portfolio, and lead_images buckets.
-- Enforces server-side validation of file sizes and allowed MIME types.

-- 1. Server-side validation of file size and allowed MIME types for storage buckets
UPDATE storage.buckets
SET 
  file_size_limit = 5242880, -- 5 MB for avatars
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
WHERE id = 'avatars';

UPDATE storage.buckets
SET 
  file_size_limit = 10485760, -- 10 MB for portfolio
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
WHERE id = 'portfolio';

UPDATE storage.buckets
SET 
  file_size_limit = 10485760, -- 10 MB for lead_images
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'application/pdf']
WHERE id = 'lead_images';

-- 2. Avatars Policies: restrict modifications to owner or matching folder path
DROP POLICY IF EXISTS "Auth Insert avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete avatars" ON storage.objects;

CREATE POLICY "Auth Insert avatars" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text 
        OR split_part(name, '/', 1) = auth.uid()::text 
        OR owner = auth.uid()
    )
);

CREATE POLICY "Auth Update avatars" ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text 
        OR split_part(name, '/', 1) = auth.uid()::text 
        OR owner = auth.uid()
    )
);

CREATE POLICY "Auth Delete avatars" ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text 
        OR split_part(name, '/', 1) = auth.uid()::text 
        OR owner = auth.uid()
    )
);

-- 3. Portfolio Policies: restrict modifications to owner or matching folder path
DROP POLICY IF EXISTS "Auth Insert portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete portfolio" ON storage.objects;

CREATE POLICY "Auth Insert portfolio" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'portfolio' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text 
        OR split_part(name, '/', 1) = auth.uid()::text 
        OR owner = auth.uid()
    )
);

CREATE POLICY "Auth Update portfolio" ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'portfolio' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text 
        OR split_part(name, '/', 1) = auth.uid()::text 
        OR owner = auth.uid()
    )
);

CREATE POLICY "Auth Delete portfolio" ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'portfolio' 
    AND (
        (storage.foldername(name))[1] = auth.uid()::text 
        OR split_part(name, '/', 1) = auth.uid()::text 
        OR owner = auth.uid()
    )
);

-- 4. Lead Images Policies: restrict deletion to owner
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

CREATE POLICY "Allow authenticated deletes" ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'lead_images' 
    AND owner = auth.uid()
);
