-- Migration: Transform lead_chats to client-centric chats

-- 1. Add client_id column to lead_chats
ALTER TABLE public.lead_chats
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Drop the NOT NULL constraint on lead_id
ALTER TABLE public.lead_chats
ALTER COLUMN lead_id DROP NOT NULL;

-- 3. Populate client_id from leads if the lead is associated with a client
UPDATE public.lead_chats lc
SET client_id = l.client_id
FROM public.leads l
WHERE lc.lead_id = l.id AND l.client_id IS NOT NULL;

-- 4. Drop the UNIQUE(lead_id, master_id) constraint
ALTER TABLE public.lead_chats
DROP CONSTRAINT IF EXISTS lead_chats_lead_id_master_id_key;

-- 5. Add new unique constraints for client_id and client_session_id
CREATE UNIQUE INDEX IF NOT EXISTS unique_master_client_id ON public.lead_chats (master_id, client_id) WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS unique_master_client_session ON public.lead_chats (master_id, client_session_id) WHERE client_id IS NULL;
