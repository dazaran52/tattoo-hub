-- Migration 012: Create payment_receipts bucket

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment_receipts', 'payment_receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Enable public read access to all files in the payment_receipts bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'payment_receipts' );

-- Enable authenticated users to upload files to the payment_receipts bucket
CREATE POLICY "Allow authenticated uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'payment_receipts' );

-- Admins can update/delete
CREATE POLICY "Allow admin to manage receipts" 
ON storage.objects FOR ALL 
USING (
    bucket_id = 'payment_receipts' AND 
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.is_admin = true
    )
);
