-- RPC to allow a master to accept a targeted marketplace lead (auto-pay commission and unlock chat/contacts)
CREATE OR REPLACE FUNCTION public.master_accept_targeted_lead(
  p_lead_id UUID,
  p_master_id UUID
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
  -- Verify the lead
  SELECT * INTO v_lead FROM public.leads
  WHERE id = p_lead_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAD_NOT_FOUND';
  END IF;

  IF v_lead.assigned_master_id IS NULL OR v_lead.assigned_master_id <> p_master_id THEN
    RAISE EXCEPTION 'LEAD_NOT_TARGETED_TO_MASTER';
  END IF;

  IF v_lead.is_personal THEN
    RAISE EXCEPTION 'PERSONAL_LEADS_DO_NOT_REQUIRE_ACCEPTANCE';
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

    -- Allow negative balance logic as per 061_allow_negative_balance
    -- Deduct success fee from the purchasing master
    UPDATE public.users
    SET balance = balance - v_proposal.success_fee_amount
    WHERE id = p_master_id
    RETURNING balance INTO v_new_balance;

    -- Check if this lead was shared by another master (creator_master_id)
    IF v_lead.creator_master_id IS NOT NULL AND v_lead.creator_master_id <> p_master_id THEN
      v_shared_master := v_lead.creator_master_id;
      v_shared_reward := ROUND(v_proposal.success_fee_amount * 0.80, 2);
      
      -- Reward the referring master with 80% of the commission
      UPDATE public.users
      SET balance = COALESCE(balance, 0) + v_shared_reward
      WHERE id = v_shared_master;

      -- Send notification to the referring master
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        v_shared_master,
        'Ваш клиент куплен на маркетплейсе! 🎉',
        'Выставленный вами клиент по заявке «' || COALESCE(v_lead.title, 'Без названия') || '» нашел мастера. На ваш баланс зачислено вознаграждение: +' || v_shared_reward || ' ' || v_proposal.success_fee_currency || ' (80% от комиссии платформы).',
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

  -- Ensure lead status is accepted (since this skips the client's acceptance step)
  UPDATE public.leads
  SET status = 'accepted'
  WHERE id = p_lead_id;

  -- End any ongoing escrow actions
  UPDATE public.escrow_chat
  SET resolved_at = NOW(), resolution_decision = 'buyer_accepted'
  WHERE lead_id = p_lead_id AND resolved_at IS NULL;

  -- Add contact to CRM
  INSERT INTO public.master_clients (master_id, lead_id, full_name, email, phone, instagram)
  VALUES (
    p_master_id,
    p_lead_id,
    COALESCE(NULLIF(TRIM(v_lead.name), ''), 'Клиент из заявок'),
    v_lead.contact_email,
    v_lead.contacts,
    NULL -- Since we don't store instagram explicitly in leads table currently, it's fine. It's usually in contacts string.
  )
  ON CONFLICT (master_id, lead_id) DO NOTHING
  RETURNING id INTO v_crm_client_id;

  -- The chat was already created in create_direct_client_lead, but we retrieve its ID
  SELECT id INTO v_chat_id FROM public.lead_chats WHERE lead_id = p_lead_id AND master_id = p_master_id;
  
  IF v_chat_id IS NULL THEN
    INSERT INTO public.lead_chats (lead_id, master_id)
    VALUES (p_lead_id, p_master_id)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_chat_id;
  END IF;

  -- Insert the CRM session (Записан/В диалоге)
  IF v_crm_client_id IS NOT NULL THEN
    INSERT INTO public.master_sessions (master_id, client_id, lead_id, source, session_date, status, price)
    VALUES (p_master_id, v_crm_client_id, p_lead_id, 'marketplace', v_lead.session_date::DATE, 'discussing', v_proposal.price_offer)
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

REVOKE ALL ON FUNCTION public.master_accept_targeted_lead(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.master_accept_targeted_lead(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.master_accept_targeted_lead(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.master_accept_targeted_lead(UUID, UUID) TO service_role;
