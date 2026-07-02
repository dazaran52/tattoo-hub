-- Create lead_images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead_images', 'lead_images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable public read access (if not already done)
CREATE POLICY "Public Access lead_images" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'lead_images' );

-- Enable anonymous users to upload files to the lead_images bucket
CREATE POLICY "Allow anon uploads lead_images" 
ON storage.objects FOR INSERT 
TO anon
WITH CHECK ( bucket_id = 'lead_images' );
