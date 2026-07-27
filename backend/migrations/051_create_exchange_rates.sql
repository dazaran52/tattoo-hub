-- 051_create_exchange_rates.sql
-- Create table for storing dynamic currency exchange rates relative to EUR (base currency)

CREATE TABLE IF NOT EXISTS public.exchange_rates (
    currency_code VARCHAR(10) PRIMARY KEY,
    rate_to_eur DOUBLE PRECISION NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow public read access (so any user/master/client can view rates for price calculation)
DROP POLICY IF EXISTS "Allow public read access on exchange_rates" ON public.exchange_rates;
CREATE POLICY "Allow public read access on exchange_rates"
    ON public.exchange_rates
    FOR SELECT
    USING (true);

-- Allow write access only for service role or admin users
DROP POLICY IF EXISTS "Allow admin and service role write on exchange_rates" ON public.exchange_rates;
CREATE POLICY "Allow admin and service role write on exchange_rates"
    ON public.exchange_rates
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- Seed initial exchange rates (ECB approximate mid-market rates as of July 2026)
INSERT INTO public.exchange_rates (currency_code, rate_to_eur, is_active, updated_at)
VALUES
    ('EUR', 1.0, true, NOW()),
    ('CZK', 25.2, true, NOW()),
    ('PLN', 4.3, true, NOW()),
    ('USD', 1.08, true, NOW()),
    ('UAH', 42.0, true, NOW()),
    ('GBP', 0.84, true, NOW())
ON CONFLICT (currency_code) DO UPDATE
SET 
    rate_to_eur = EXCLUDED.rate_to_eur,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
