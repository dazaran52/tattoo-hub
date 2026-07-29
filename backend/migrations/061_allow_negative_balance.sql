-- Remove balance check from accept_marketplace_proposal to allow negative balances
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
  v_chat_id UUID;
  v_crm_client_id UUID;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
  v_shared_master UUID := NULL;
  v_shared_reward NUMERIC := 0;
BEGIN
  -- Verify client token matches lead
  SELECT * INTO v_lead FROM public.leads
  WHERE id = p_lead_id AND client_token = p_client_token
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAD_NOT_FOUND_OR_UNAUTHORIZED';
  END IF;

  IF v_lead.assigned_master_id IS NOT NULL AND v_lead.assigned_master_id <> p_master_id THEN
    RAISE EXCEPTION 'LEAD_ALREADY_ASSIGNED';
  END IF;

  -- Lock proposal
  SELECT * INTO v_proposal FROM public.lead_proposals
  WHERE lead_id = p_lead_id AND user_id = p_master_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROPOSAL_NOT_FOUND';
  END IF;

  -- Deduct fee if not already charged
  IF v_proposal.success_fee_charged_at IS NULL AND v_proposal.success_fee_amount > 0 THEN
    SELECT * INTO v_user FROM public.users
    WHERE id = p_master_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'MASTER_NOT_FOUND';
    END IF;

    IF UPPER(COALESCE(v_user.currency, 'CZK')) <> UPPER(v_proposal.success_fee_currency) THEN
      RAISE EXCEPTION 'FEE_CURRENCY_MISMATCH';
    END IF;
    -- WE REMOVED THE INSUFFICIENT BALANCE CHECK HERE

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
    UPDATE public.lead_proposals
    SET status = 'accepted'
    WHERE id = v_proposal.id;
  END IF;

  UPDATE public.leads
  SET assigned_master_id = p_master_id
  WHERE id = p_lead_id;

  -- End any ongoing escrow actions
  UPDATE public.escrow_chat
  SET resolved_at = NOW(), resolution_decision = 'buyer_accepted'
  WHERE lead_id = p_lead_id AND resolved_at IS NULL;

  -- Add contact to CRM
  INSERT INTO public.master_clients (master_id, lead_id, full_name, email, phone)
  VALUES (
    p_master_id,
    p_lead_id,
    COALESCE(NULLIF(TRIM(v_lead.name), ''), 'Клиент из заявок'),
    v_lead.contact_email,
    v_lead.contacts
  )
  ON CONFLICT (master_id, lead_id) DO NOTHING
  RETURNING id INTO v_crm_client_id;

  -- Create a private chat thread
  INSERT INTO public.lead_chats (lead_id, master_id)
  VALUES (p_lead_id, p_master_id)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_chat_id;

  IF v_chat_id IS NULL THEN
    SELECT id INTO v_chat_id FROM public.lead_chats WHERE lead_id = p_lead_id AND master_id = p_master_id;
  END IF;

  -- Ensure we transition to discussing and attach the session to the chat/CRM
  IF v_crm_client_id IS NOT NULL THEN
    INSERT INTO public.master_sessions (master_id, client_id, status)
    VALUES (p_master_id, v_crm_client_id, 'discussing')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_charged', (v_proposal.success_fee_charged_at IS NOT NULL),
    'chat_id', v_chat_id,
    'new_balance', COALESCE(v_new_balance, 0)
  );
END;
$$;
