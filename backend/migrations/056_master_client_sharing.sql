-- Migration: 056_master_client_sharing.sql
-- Description: Enable masters to share their clients on the marketplace and receive 50% of the platform commission upon successful booking.

-- 1. Add creator_master_id to leads table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'creator_master_id'
  ) THEN
    ALTER TABLE public.leads 
    ADD COLUMN creator_master_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Add shared reward tracking columns to marketplace_fee_transactions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'marketplace_fee_transactions' AND column_name = 'shared_master_id'
  ) THEN
    ALTER TABLE public.marketplace_fee_transactions 
    ADD COLUMN shared_master_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'marketplace_fee_transactions' AND column_name = 'shared_reward_amount'
  ) THEN
    ALTER TABLE public.marketplace_fee_transactions 
    ADD COLUMN shared_reward_amount NUMERIC(12,2) DEFAULT 0;
  END IF;
END $$;

-- 3. Update accept_marketplace_proposal to distribute 50% commission to creator_master_id
CREATE OR REPLACE FUNCTION public.accept_marketplace_proposal(
  p_lead_id UUID,
  p_master_id UUID,
  p_client_token TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lead public.leads%ROWTYPE;
  v_proposal public.lead_proposals%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_transaction_id UUID;
  v_chat_id UUID;
  v_crm_client_id UUID;
  v_already_charged BOOLEAN := FALSE;
  v_new_balance NUMERIC(12,2);
  v_shared_reward NUMERIC(12,2) := 0;
  v_shared_master UUID := NULL;
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

    -- Deduct 10% success fee from the purchasing master
    UPDATE public.users
    SET balance = balance - v_proposal.success_fee_amount
    WHERE id = p_master_id
    RETURNING balance INTO v_new_balance;

    -- Check if this lead was shared by another master (creator_master_id)
    IF v_lead.creator_master_id IS NOT NULL AND v_lead.creator_master_id <> p_master_id THEN
      v_shared_master := v_lead.creator_master_id;
      v_shared_reward := ROUND(v_proposal.success_fee_amount * 0.50, 2);
      
      -- Reward the referring master with 50% of the commission
      UPDATE public.users
      SET balance = COALESCE(balance, 0) + v_shared_reward
      WHERE id = v_shared_master;

      -- Send notification to the referring master
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        v_shared_master,
        'Ваш клиент куплен на маркетплейсе! 🎉',
        'Выставленный вами клиент по заявке «' || COALESCE(v_lead.title, 'Без названия') || '» нашел мастера. На ваш баланс зачислено вознаграждение: +' || v_shared_reward || ' ' || v_proposal.success_fee_currency || ' (50% от комиссии платформы).',
        'system'
      );
    END IF;

    INSERT INTO public.marketplace_fee_transactions (
      proposal_id, master_id, lead_id, amount, currency, shared_master_id, shared_reward_amount
    ) VALUES (
      v_proposal.id,
      p_master_id,
      p_lead_id,
      v_proposal.success_fee_amount,
      v_proposal.success_fee_currency,
      v_shared_master,
      v_shared_reward
    ) RETURNING id INTO v_transaction_id;

    UPDATE public.lead_proposals
    SET status = 'accepted',
        success_fee_charged_at = NOW(),
        success_fee_transaction_id = v_transaction_id
    WHERE id = v_proposal.id;
  ELSE
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

  INSERT INTO public.master_clients (
    master_id, lead_id, name, source, kanban_status
  ) VALUES (
    p_master_id,
    p_lead_id,
    COALESCE(NULLIF(v_lead.client_name, ''), NULLIF(v_lead.title, ''), 'Клиент'),
    'marketplace',
    'new'
  )
  ON CONFLICT (master_id, lead_id) DO UPDATE
    SET source = 'marketplace', updated_at = NOW()
  RETURNING id INTO v_crm_client_id;

  INSERT INTO public.master_sessions (
    master_id, client_id, lead_id, source, session_date, status,
    style, body_place, size, reference_images, price
  ) VALUES (
    p_master_id, v_crm_client_id, p_lead_id, 'marketplace',
    COALESCE(v_lead.session_date::DATE, CURRENT_DATE), 'new',
    v_lead.style, v_lead.body_place, v_lead.size, v_lead.image_urls,
    v_proposal.price_offer
  )
  ON CONFLICT (lead_id) WHERE lead_id IS NOT NULL DO UPDATE
    SET client_id = EXCLUDED.client_id,
        master_id = EXCLUDED.master_id,
        price = EXCLUDED.price,
        source = 'marketplace';

  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT p_master_id, 'Сеанс подтвержден!',
         'Клиент выбрал вас для заявки «' || COALESCE(v_lead.title, 'Без названия') || '».',
         'system'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = p_master_id
      AND title = 'Сеанс подтвержден!'
      AND message = 'Клиент выбрал вас для заявки «' || COALESCE(v_lead.title, 'Без названия') || '».'
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'already_charged', v_already_charged,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance,
    'chat_id', v_chat_id,
    'shared_reward', v_shared_reward
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_marketplace_proposal(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_marketplace_proposal(UUID, UUID, TEXT) TO service_role;
