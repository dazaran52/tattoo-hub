-- Unified 10% marketplace success fee, five-proposal cap and atomic acceptance.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_master_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_token TEXT,
  ADD COLUMN IF NOT EXISTS client_session_id TEXT,
  ADD COLUMN IF NOT EXISTS session_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'new';

UPDATE public.leads
SET client_session_id = client_token
WHERE client_session_id IS NULL AND client_token IS NOT NULL;

ALTER TABLE public.lead_proposals
  ADD COLUMN IF NOT EXISTS offer_currency VARCHAR(3) NOT NULL DEFAULT 'CZK',
  ADD COLUMN IF NOT EXISTS success_fee_rate NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS success_fee_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS success_fee_currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS success_fee_charged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS success_fee_transaction_id UUID;

ALTER TABLE public.lead_proposals
  ALTER COLUMN price_offer TYPE NUMERIC(12,2) USING price_offer::NUMERIC;

-- Older master-controlled status endpoints allowed self-acceptance. Only the lead's
-- assigned master is a trustworthy legacy selection signal.
UPDATE public.lead_proposals AS proposal
SET status = 'pending'
FROM public.leads AS lead
WHERE proposal.lead_id = lead.id
  AND proposal.status IN ('accepted', 'booked', 'completed')
  AND lead.assigned_master_id IS DISTINCT FROM proposal.user_id
  AND proposal.success_fee_charged_at IS NULL
  AND proposal.success_fee_transaction_id IS NULL;

-- Apply the unified 10% rate to pending proposals created before this migration.
UPDATE public.lead_proposals AS proposal
SET offer_currency = UPPER(COALESCE(master.currency, 'CZK')),
    success_fee_rate = 0.10,
    success_fee_amount = ROUND(proposal.price_offer * 0.10, 2),
    success_fee_currency = UPPER(COALESCE(master.currency, 'CZK'))
FROM public.users AS master
WHERE proposal.user_id = master.id
  AND proposal.success_fee_charged_at IS NULL
  AND proposal.status = 'pending'
  AND (
    proposal.success_fee_rate IS NULL
    OR proposal.success_fee_amount IS NULL
    OR proposal.success_fee_currency IS NULL
  );

-- Marketplace reads and writes are backend-only. RLS cannot mask the contacts column,
-- and direct proposal inserts would bypass verification and fee snapshots.
DROP POLICY IF EXISTS "Users can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view own proposals" ON public.lead_proposals;
DROP POLICY IF EXISTS "Users can create own proposals" ON public.lead_proposals;
DROP POLICY IF EXISTS "Users can view proposals for cheap leads" ON public.lead_proposals;
DROP POLICY IF EXISTS "Masters can view own chats" ON public.lead_chats;
DROP POLICY IF EXISTS "Masters can create chats" ON public.lead_chats;
DROP POLICY IF EXISTS "Masters can view own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Masters can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Participants can update message read status" ON public.chat_messages;

-- CRM data is served through acceptance-aware backend endpoints. Direct policies
-- cannot express the proposal-status checks needed to protect marketplace contacts.
DROP POLICY IF EXISTS "Masters can view own clients" ON public.master_clients;
DROP POLICY IF EXISTS "Masters can insert own clients" ON public.master_clients;
DROP POLICY IF EXISTS "Masters can update own clients" ON public.master_clients;
DROP POLICY IF EXISTS "Masters can delete own clients" ON public.master_clients;
DROP POLICY IF EXISTS "Masters can view own sessions" ON public.master_sessions;
DROP POLICY IF EXISTS "Masters can insert own sessions" ON public.master_sessions;
DROP POLICY IF EXISTS "Masters can update own sessions" ON public.master_sessions;
DROP POLICY IF EXISTS "Masters can delete own sessions" ON public.master_sessions;

-- Retire the legacy paid-unlock path: contacts open only after proposal acceptance.
DROP FUNCTION IF EXISTS public.unlock_lead(UUID, UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.unlock_lead(UUID, UUID);

CREATE OR REPLACE FUNCTION public.enforce_marketplace_proposal_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- UPSERT executes BEFORE INSERT triggers even when it later updates an existing row.
  IF EXISTS (
    SELECT 1 FROM public.lead_proposals
    WHERE lead_id = NEW.lead_id AND user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Serialize new proposals for one lead so concurrent requests cannot exceed five.
  PERFORM 1 FROM public.leads WHERE id = NEW.lead_id FOR UPDATE;
  IF (SELECT COUNT(*) FROM public.lead_proposals WHERE lead_id = NEW.lead_id) >= 5 THEN
    RAISE EXCEPTION 'MAX_PROPOSALS_REACHED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_marketplace_proposal_limit ON public.lead_proposals;
CREATE TRIGGER enforce_marketplace_proposal_limit
  BEFORE INSERT ON public.lead_proposals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_marketplace_proposal_limit();

CREATE OR REPLACE FUNCTION public.upsert_marketplace_proposal(
  p_lead_id UUID,
  p_master_id UUID,
  p_price_offer NUMERIC,
  p_proposed_dates TEXT,
  p_currency TEXT,
  p_success_fee_rate NUMERIC,
  p_success_fee_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_proposal public.lead_proposals%ROWTYPE;
BEGIN
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAD_NOT_FOUND';
  END IF;
  IF v_lead.is_personal
     OR v_lead.assigned_master_id IS NOT NULL
     OR v_lead.status IN ('closed', 'accepted') THEN
    RAISE EXCEPTION 'LEAD_NOT_ACCEPTING_PROPOSALS';
  END IF;
  IF p_price_offer IS NULL
     OR p_success_fee_rate IS NULL
     OR p_success_fee_amount IS NULL
     OR p_currency IS NULL
     OR p_proposed_dates IS NULL
     OR p_price_offer <= 0
     OR p_price_offer <> ROUND(p_price_offer, 2)
     OR p_success_fee_rate <> 0.10
     OR p_success_fee_amount <= 0
     OR p_success_fee_amount <> ROUND(p_price_offer * 0.10, 2)
     OR LENGTH(UPPER(p_currency)) <> 3
     OR NULLIF(BTRIM(p_proposed_dates), '') IS NULL THEN
    RAISE EXCEPTION 'INVALID_PROPOSAL_SNAPSHOT';
  END IF;

  SELECT * INTO v_proposal
  FROM public.lead_proposals
  WHERE lead_id = p_lead_id AND user_id = p_master_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_proposal.status <> 'pending'
       OR v_proposal.success_fee_charged_at IS NOT NULL
       OR v_proposal.success_fee_transaction_id IS NOT NULL THEN
      RAISE EXCEPTION 'ACCEPTED_PROPOSAL_CANNOT_BE_EDITED';
    END IF;
    UPDATE public.lead_proposals
    SET price_offer = p_price_offer,
        proposed_dates = BTRIM(p_proposed_dates),
        offer_currency = UPPER(p_currency),
        success_fee_rate = p_success_fee_rate,
        success_fee_amount = p_success_fee_amount,
        success_fee_currency = UPPER(p_currency)
    WHERE id = v_proposal.id
    RETURNING * INTO v_proposal;
  ELSE
    INSERT INTO public.lead_proposals (
      lead_id, user_id, price_offer, proposed_dates, status,
      offer_currency, success_fee_rate, success_fee_amount,
      success_fee_currency
    ) VALUES (
      p_lead_id, p_master_id, p_price_offer, BTRIM(p_proposed_dates), 'pending',
      UPPER(p_currency), p_success_fee_rate, p_success_fee_amount,
      UPPER(p_currency)
    )
    RETURNING * INTO v_proposal;
  END IF;

  RETURN to_jsonb(v_proposal);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_marketplace_proposal(
  UUID, UUID, NUMERIC, TEXT, TEXT, NUMERIC, NUMERIC
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_marketplace_proposal(
  UUID, UUID, NUMERIC, TEXT, TEXT, NUMERIC, NUMERIC
) TO service_role;

CREATE TABLE IF NOT EXISTS public.marketplace_fee_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL UNIQUE REFERENCES public.lead_proposals(id) ON DELETE RESTRICT,
  master_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lead_proposals
  DROP CONSTRAINT IF EXISTS lead_proposals_success_fee_transaction_id_fkey;
ALTER TABLE public.lead_proposals
  ADD CONSTRAINT lead_proposals_success_fee_transaction_id_fkey
  FOREIGN KEY (success_fee_transaction_id)
  REFERENCES public.marketplace_fee_transactions(id) ON DELETE SET NULL;

ALTER TABLE public.marketplace_fee_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'marketplace_fee_transactions'
      AND policyname = 'Masters read own marketplace fees'
  ) THEN
    CREATE POLICY "Masters read own marketplace fees"
      ON public.marketplace_fee_transactions FOR SELECT TO authenticated
      USING (master_id = auth.uid());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.accept_marketplace_proposal(
  p_lead_id UUID,
  p_master_id UUID,
  p_client_token TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_proposal public.lead_proposals%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_transaction_id UUID;
  v_chat_id UUID;
  v_already_charged BOOLEAN := FALSE;
  v_new_balance NUMERIC(12,2);
BEGIN
  SELECT * INTO v_lead
  FROM public.leads
  WHERE id = p_lead_id AND client_token = p_client_token
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_CLIENT_TOKEN';
  END IF;
  IF v_lead.assigned_master_id IS NOT NULL
     AND v_lead.assigned_master_id <> p_master_id THEN
    RAISE EXCEPTION 'PROPOSAL_ALREADY_ACCEPTED';
  END IF;

  SELECT * INTO v_proposal
  FROM public.lead_proposals
  WHERE lead_id = p_lead_id AND user_id = p_master_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROPOSAL_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.lead_proposals
    WHERE lead_id = p_lead_id
      AND status IN ('accepted', 'booked', 'completed')
      AND user_id <> p_master_id
  ) THEN
    RAISE EXCEPTION 'PROPOSAL_ALREADY_ACCEPTED';
  END IF;

  v_already_charged := (
    v_proposal.success_fee_charged_at IS NOT NULL
    AND v_proposal.success_fee_transaction_id IS NOT NULL
  );
  v_transaction_id := v_proposal.success_fee_transaction_id;

  IF NOT v_already_charged THEN
    IF v_proposal.success_fee_amount IS NULL OR v_proposal.success_fee_amount <= 0 THEN
      RAISE EXCEPTION 'SUCCESS_FEE_NOT_SNAPSHOTTED';
    END IF;

    SELECT * INTO v_user
    FROM public.users
    WHERE id = p_master_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'MASTER_NOT_FOUND';
    END IF;

    IF UPPER(COALESCE(v_user.currency, 'CZK')) <> UPPER(v_proposal.success_fee_currency) THEN
      RAISE EXCEPTION 'FEE_CURRENCY_MISMATCH';
    END IF;
    IF COALESCE(v_user.balance, 0) < v_proposal.success_fee_amount THEN
      RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
    END IF;

    UPDATE public.users
    SET balance = balance - v_proposal.success_fee_amount
    WHERE id = p_master_id
    RETURNING balance INTO v_new_balance;

    INSERT INTO public.marketplace_fee_transactions (
      proposal_id, master_id, lead_id, amount, currency
    ) VALUES (
      v_proposal.id,
      p_master_id,
      p_lead_id,
      v_proposal.success_fee_amount,
      v_proposal.success_fee_currency
    ) RETURNING id INTO v_transaction_id;

    UPDATE public.lead_proposals
    SET status = 'accepted',
        success_fee_charged_at = NOW(),
        success_fee_transaction_id = v_transaction_id
    WHERE id = v_proposal.id;
  ELSE
    -- Repair a partially completed or legacy accepted proposal without charging again.
    IF v_proposal.status NOT IN ('accepted', 'booked', 'completed') THEN
      UPDATE public.lead_proposals
      SET status = 'accepted'
      WHERE id = v_proposal.id;
    END IF;
    SELECT balance INTO v_new_balance FROM public.users WHERE id = p_master_id;
  END IF;

  UPDATE public.lead_proposals
  SET status = 'rejected'
  WHERE lead_id = p_lead_id AND user_id <> p_master_id;

  UPDATE public.leads
  SET assigned_master_id = p_master_id, status = 'accepted'
  WHERE id = p_lead_id;

  -- Create or reconnect the client-centric chat inside the same transaction.
  IF v_lead.client_id IS NOT NULL THEN
    INSERT INTO public.lead_chats (
      lead_id, master_id, client_session_id, client_id
    ) VALUES (
      p_lead_id,
      p_master_id,
      COALESCE(v_lead.client_session_id, v_lead.client_token),
      v_lead.client_id
    )
    ON CONFLICT (master_id, client_id) WHERE client_id IS NOT NULL
    DO UPDATE SET
      lead_id = EXCLUDED.lead_id,
      client_session_id = EXCLUDED.client_session_id
    RETURNING id INTO v_chat_id;
  ELSE
    INSERT INTO public.lead_chats (
      lead_id, master_id, client_session_id, client_id
    ) VALUES (
      p_lead_id,
      p_master_id,
      COALESCE(v_lead.client_session_id, v_lead.client_token),
      NULL
    )
    ON CONFLICT (master_id, client_session_id) WHERE client_id IS NULL
    DO UPDATE SET lead_id = EXCLUDED.lead_id
    RETURNING id INTO v_chat_id;
  END IF;

  INSERT INTO public.chat_messages (chat_id, sender_type, content)
  SELECT
    v_chat_id,
    'system',
    '[SYSTEM_CARD]: ' || jsonb_build_object(
      'type', 'session_created',
      'date', v_lead.session_date,
      'price', v_proposal.price_offer
    )::TEXT
  WHERE NOT EXISTS (
    SELECT 1 FROM public.chat_messages
    WHERE chat_id = v_chat_id
      AND sender_type = 'system'
      AND content LIKE '[SYSTEM_CARD]: %'
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'already_charged', v_already_charged,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance,
    'chat_id', v_chat_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_marketplace_proposal(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_marketplace_proposal(UUID, UUID, TEXT) TO service_role;
