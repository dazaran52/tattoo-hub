-- Migration 064: Drop legacy credits column and sync trigger
-- We have fully migrated to using the 'balance' column for wallet funds.

-- 1. Drop the trigger that synced credits to balance
DROP TRIGGER IF EXISTS trg_sync_legacy_credits ON public.users;

-- 2. Drop the trigger function
DROP FUNCTION IF EXISTS public.sync_legacy_credits_to_balance();

-- 3. Drop the legacy column
ALTER TABLE public.users DROP COLUMN IF EXISTS credits;
