-- Fix "New" status bug in CRM (Marketplace purchased leads go to 'discussing')
-- Fix is_personal flag in create_direct_booking (Respect incoming value)

-- 1. Update accept_marketplace_proposal to use 'discussing' instead of 'new'
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
    'discussing'
  )
  ON CONFLICT (master_id, lead_id) DO UPDATE
    SET source = 'marketplace', updated_at = NOW(), kanban_status = 'discussing'
  RETURNING id INTO v_crm_client_id;

  INSERT INTO public.master_sessions (
    master_id, client_id, lead_id, source, session_date, status,
    style, body_place, size, reference_images, price
  ) VALUES (
    p_master_id, v_crm_client_id, p_lead_id, 'marketplace',
    v_lead.session_date::DATE, 'discussing',
    v_lead.style, v_lead.body_place, v_lead.size, v_lead.image_urls,
    v_proposal.price_offer
  )
  ON CONFLICT (lead_id) WHERE lead_id IS NOT NULL DO UPDATE
    SET client_id = EXCLUDED.client_id,
        master_id = EXCLUDED.master_id,
        price = EXCLUDED.price,
        status = 'discussing',
        source = 'marketplace';

  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT p_master_id, 'Сеанс подтвержден!',
         'Клиент выбрал вас для заявки «' || COALESCE(v_lead.title, 'Без названия') || '».',
         'system'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = p_master_id
      AND type = 'system'
      AND message LIKE 'Клиент выбрал вас для заявки «' || COALESCE(v_lead.title, 'Без названия') || '».'
      AND created_at >= NOW() - INTERVAL '1 minute'
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'lead_id', p_lead_id,
    'chat_id', v_chat_id,
    'new_balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_marketplace_proposal(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_marketplace_proposal(UUID, UUID, TEXT) TO service_role;


-- 2. Update create_direct_booking to respect incoming is_personal flag from payload
CREATE OR REPLACE FUNCTION public.create_direct_booking(
  p_lead JSONB,
  p_master_id UUID,
  p_client_id UUID,
  p_client_token TEXT,
  p_client_email TEXT,
  p_client_instagram TEXT,
  p_client_name TEXT,
  p_contact TEXT,
  p_session_time TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_input public.leads%ROWTYPE;
  v_lead public.leads%ROWTYPE;
  v_chat_id UUID;
  v_crm_client_id UUID;
  v_session_date DATE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_master_id
      AND role = 'master'
      AND status = 'approved'
      AND is_verified_master = TRUE
  ) THEN
    RAISE EXCEPTION 'MASTER_NOT_AVAILABLE';
  END IF;

  v_input := jsonb_populate_record(NULL::public.leads, p_lead);
  INSERT INTO public.leads (
    title, description, contacts, base_unlock_price_eur, client_priority,
    client_token, client_session_id, client_id, trust_score, client_budget,
    client_currency, is_negotiable_budget, country_id, city_id, image_urls,
    style, size, body_place, assigned_master_id, session_date, client_name,
    is_personal, status
  ) VALUES (
    v_input.title, v_input.description, v_input.contacts,
    v_input.base_unlock_price_eur, v_input.client_priority,
    p_client_token, p_client_token, p_client_id, v_input.trust_score,
    v_input.client_budget, v_input.client_currency,
    v_input.is_negotiable_budget, v_input.country_id, v_input.city_id,
    v_input.image_urls, v_input.style, v_input.size, v_input.body_place,
    p_master_id, v_input.session_date, v_input.client_name, COALESCE(v_input.is_personal, FALSE), 'accepted'
  ) RETURNING * INTO v_lead;

  INSERT INTO public.lead_proposals (
    lead_id, user_id, status, price_offer, proposed_dates
  ) VALUES (
    v_lead.id, p_master_id, 'accepted', 0, 'Прямая запись к мастеру'
  );

  IF p_client_id IS NOT NULL THEN
    INSERT INTO public.lead_chats (lead_id, master_id, client_session_id, client_id)
    VALUES (v_lead.id, p_master_id, p_client_token, p_client_id)
    ON CONFLICT (master_id, client_id) WHERE client_id IS NOT NULL
    DO UPDATE SET lead_id = EXCLUDED.lead_id,
                  client_session_id = EXCLUDED.client_session_id
    RETURNING id INTO v_chat_id;
  ELSE
    INSERT INTO public.lead_chats (lead_id, master_id, client_session_id, client_id)
    VALUES (v_lead.id, p_master_id, p_client_token, NULL)
    ON CONFLICT (master_id, client_session_id) WHERE client_id IS NULL
    DO UPDATE SET lead_id = EXCLUDED.lead_id
    RETURNING id INTO v_chat_id;
  END IF;

  INSERT INTO public.chat_messages (chat_id, sender_type, content)
  VALUES (
    v_chat_id,
    'system',
    '[SYSTEM_CARD]: ' || jsonb_build_object(
      'type', 'new_lead', 'lead_id', v_lead.id, 'title', v_lead.title
    )::TEXT
  );

  SELECT id INTO v_crm_client_id
  FROM public.master_clients
  WHERE master_id = p_master_id
    AND is_deleted = FALSE
    AND (
      (p_client_email IS NOT NULL AND email = p_client_email)
      OR (p_client_instagram IS NOT NULL AND instagram = p_client_instagram)
    )
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_crm_client_id IS NULL THEN
    INSERT INTO public.master_clients (
      master_id, lead_id, name, contact_info, phone, instagram, email,
      notes, source, kanban_status
    ) VALUES (
      p_master_id, v_lead.id, COALESCE(NULLIF(p_client_name, ''), 'Новый клиент'),
      p_contact,
      CASE WHEN p_client_email IS NULL AND p_client_instagram IS NULL THEN p_contact END,
      p_client_instagram, p_client_email, '', 'direct', 'new'
    ) RETURNING id INTO v_crm_client_id;
  ELSE
    UPDATE public.master_clients
    SET lead_id = v_lead.id, source = 'direct'
    WHERE id = v_crm_client_id;
  END IF;

  v_session_date := v_input.session_date::DATE;
  INSERT INTO public.master_sessions (
    master_id, client_id, lead_id, source, session_date, start_time,
    status, style, body_place, size, reference_images, price
  ) VALUES (
    p_master_id, v_crm_client_id, v_lead.id, 'direct', v_session_date,
    NULLIF(p_session_time, '')::TIME, 'new', v_input.style,
    v_input.body_place, v_input.size, v_input.image_urls, v_input.client_budget
  );

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    p_master_id,
    'Новая заявка!',
    'Клиент ' || COALESCE(NULLIF(p_client_name, ''), 'Без имени') || ' хочет записаться к вам.',
    'system'
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'lead', to_jsonb(v_lead),
    'chat_id', v_chat_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_direct_booking(JSONB, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_direct_booking(JSONB, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.create_direct_booking(JSONB, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_booking(JSONB, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
