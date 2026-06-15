-- Migration: Add client_token to leads

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS client_token VARCHAR(255);

-- Update existing leads with random tokens
UPDATE public.leads SET client_token = md5(random()::text || clock_timestamp()::text) WHERE client_token IS NULL;

ALTER TABLE public.leads 
ALTER COLUMN client_token SET NOT NULL;
