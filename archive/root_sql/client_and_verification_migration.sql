-- Add role and verification fields to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'master';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified_master BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS certificate_url TEXT;

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    client_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    master_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.email_lead_conversations(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, master_id, lead_id)
);

-- Enable RLS for reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reviews are viewable by everyone." ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Clients can create reviews." ON public.reviews FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    client_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    master_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, master_id)
);

-- Enable RLS for favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients can view their own favorites." ON public.favorites FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Clients can insert favorites." ON public.favorites FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients can delete their own favorites." ON public.favorites FOR DELETE USING (auth.uid() = client_id);

-- Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Certificates are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'certificates');
CREATE POLICY "Authenticated users can upload certificates" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'certificates' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own certificates" ON storage.objects FOR UPDATE USING (bucket_id = 'certificates' AND auth.uid() = owner);
