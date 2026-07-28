-- Migration 055: Sync legacy credits to fiat balance
-- Ensures that accounts with legacy credits but 0 fiat balance have their balance populated so marketplace acceptance works.

UPDATE public.users
SET balance = credits::numeric
WHERE (balance IS NULL OR balance = 0) AND COALESCE(credits, 0) > 0;

-- Optional: create a trigger or rule to keep balance in sync if legacy credits are updated directly
CREATE OR REPLACE FUNCTION public.sync_legacy_credits_to_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.credits IS DISTINCT FROM OLD.credits AND NEW.credits > 0 AND (NEW.balance IS NULL OR NEW.balance = 0 OR NEW.balance = OLD.balance) THEN
    NEW.balance := NEW.credits::numeric;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_legacy_credits ON public.users;
CREATE TRIGGER trg_sync_legacy_credits
  BEFORE UPDATE OF credits ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_legacy_credits_to_balance();
