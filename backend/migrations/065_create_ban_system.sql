-- Add ban_reason to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Create ban_appeals table
CREATE TABLE IF NOT EXISTS public.ban_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    appeal_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_ban_appeals_user_id ON public.ban_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_ban_appeals_status ON public.ban_appeals(status);

-- Enable RLS
ALTER TABLE public.ban_appeals ENABLE ROW LEVEL SECURITY;

-- Policies for ban_appeals
DROP POLICY IF EXISTS "Users can create their own appeals" ON public.ban_appeals;
CREATE POLICY "Users can create their own appeals" ON public.ban_appeals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own appeals" ON public.ban_appeals;
CREATE POLICY "Users can view their own appeals" ON public.ban_appeals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all appeals" ON public.ban_appeals;
CREATE POLICY "Admins can view all appeals" ON public.ban_appeals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

DROP POLICY IF EXISTS "Admins can update all appeals" ON public.ban_appeals;
CREATE POLICY "Admins can update all appeals" ON public.ban_appeals
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

-- Set up realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'ban_appeals'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ban_appeals;
    END IF;
END
$$;
