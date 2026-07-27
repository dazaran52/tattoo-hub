-- 1. Create table for manual payment requests
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- e.g., 'revolut', 'donatello'
    amount_credits INTEGER NOT NULL,
    currency VARCHAR(10) DEFAULT 'EUR',
    status VARCHAR(50) DEFAULT 'pending', -- pending, screenshot_uploaded, approved, rejected, cancelled
    screenshot_url TEXT,
    admin_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own requests
CREATE POLICY "Users can view their own payment requests" 
    ON public.payment_requests FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own requests
CREATE POLICY "Users can insert their own payment requests" 
    ON public.payment_requests FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own requests (e.g. upload screenshot or cancel)
CREATE POLICY "Users can update their own payment requests" 
    ON public.payment_requests FOR UPDATE 
    USING (auth.uid() = user_id);

-- Policy: Admins can view and update all requests
-- Assuming you have a way to identify admins, or we bypass RLS for admin operations via service role key on backend.
-- We will use the service role key on the backend, so we don't strictly need admin policies here, but just in case:
-- (We skip complex admin policies since we use the backend service_role)

-- 2. Create Storage Bucket for Receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment_receipts', 'payment_receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'payment_receipts' bucket
CREATE POLICY "Public Receipt Viewing" 
    ON storage.objects FOR SELECT 
    USING ( bucket_id = 'payment_receipts' );

CREATE POLICY "Authenticated Users can upload receipts" 
    ON storage.objects FOR INSERT 
    WITH CHECK ( bucket_id = 'payment_receipts' AND auth.role() = 'authenticated' );
