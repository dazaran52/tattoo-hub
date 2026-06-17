-- Migration 028: Multi Currency and Cross Border B2B Logic

-- 1. Update users table with currency and balance
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'CZK';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) DEFAULT 0.00;

-- Migrate existing credits to balance (assuming 1 credit = 1 CZK for old users)
UPDATE public.users SET balance = credits;

-- 2. Update leads table with budget info and country
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS client_budget NUMERIC(10,2);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS client_currency VARCHAR(3);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_negotiable_budget BOOLEAN DEFAULT FALSE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id);

-- Optional: If we want to rename price_credits to unlock_price_base on leads
-- we could just keep price_credits and use it as the base price in EUR or CZK.
-- Let's just keep price_credits for backward compatibility, but in the backend we'll treat it as CZK base.
