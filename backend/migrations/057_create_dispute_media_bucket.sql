-- Create dispute_media bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('dispute_media', 'dispute_media', true)
ON CONFLICT (id) DO NOTHING;

-- Policies
CREATE POLICY "Public Access dispute_media" ON storage.objects FOR SELECT USING (bucket_id = 'dispute_media');
CREATE POLICY "Auth Insert dispute_media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'dispute_media' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update dispute_media" ON storage.objects FOR UPDATE USING (bucket_id = 'dispute_media' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete dispute_media" ON storage.objects FOR DELETE USING (bucket_id = 'dispute_media' AND auth.role() = 'authenticated');
