-- Migration 009: Create transactions table

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    credits_added INTEGER NOT NULL,
    provider TEXT NOT NULL, -- 'donatello' or 'cryptobot'
    provider_tx_id TEXT UNIQUE NOT NULL, -- To prevent double processing
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Admins can see all transactions
CREATE POLICY "Admins can view all transactions"
    ON public.transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT
    USING ( auth.uid() = user_id );

-- Only service role can insert/update (backend API)
CREATE POLICY "Service role can manage transactions"
    ON public.transactions FOR ALL
    USING ( true )
    WITH CHECK ( true );
