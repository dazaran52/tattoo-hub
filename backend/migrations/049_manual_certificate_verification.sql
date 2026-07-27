-- Manual certificate review state and private certificate storage.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'master',
  ADD COLUMN IF NOT EXISTS is_verified_master BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS certificate_url TEXT,
  ADD COLUMN IF NOT EXISTS certificate_status TEXT NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS certificate_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS certificate_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS certificate_reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS certificate_rejection_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_certificate_status_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_certificate_status_check
      CHECK (certificate_status IN ('not_submitted', 'pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Deliberately do not infer certificate approval from is_verified_master:
-- that legacy flag grants marketplace access and is a separate verification type.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  FALSE,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Remove permissive policies from the legacy root-level certificate migration.
DROP POLICY IF EXISTS "Certificates are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload certificates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Masters replace own certificates" ON storage.objects;
DROP POLICY IF EXISTS "Masters delete own certificates" ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Masters upload own certificates' AND tablename = 'objects') THEN
    CREATE POLICY "Masters upload own certificates"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'certificates'
        AND split_part(name, '/', 1) = auth.uid()::text
        AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'master')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Masters read own certificates' AND tablename = 'objects') THEN
    CREATE POLICY "Masters read own certificates"
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'certificates'
        AND split_part(name, '/', 1) = auth.uid()::text
        AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'master')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Masters delete own certificates' AND tablename = 'objects') THEN
    CREATE POLICY "Masters delete own certificates"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'certificates'
        AND split_part(name, '/', 1) = auth.uid()::text
        AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'master')
        AND NOT EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid()
            AND certificate_url = storage.objects.name
            AND certificate_status = 'approved'
        )
      );
  END IF;
END $$;
