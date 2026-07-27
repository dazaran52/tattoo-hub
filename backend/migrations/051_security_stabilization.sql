-- Security stabilization: retire legacy auctions, close client-controlled money writes,
-- and fund the same fiat balance used by marketplace success fees.

-- Transactions remain readable by their owner through the existing SELECT RLS policy,
-- but only trusted server code may create or mutate financial records.
DROP POLICY IF EXISTS "Service role can manage transactions" ON public.transactions;
REVOKE ALL ON TABLE public.transactions FROM PUBLIC;
REVOKE ALL ON TABLE public.transactions FROM anon;
REVOKE ALL ON TABLE public.transactions FROM authenticated;
GRANT SELECT ON TABLE public.transactions TO authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.transactions FROM anon, authenticated;
GRANT ALL ON TABLE public.transactions TO service_role;

-- Reviews are publicly readable, but only the owner-controlled backend may
-- create them. Masters must never edit or delete reviews about themselves.
DROP POLICY IF EXISTS "Clients can create reviews" ON public.master_reviews;
DROP POLICY IF EXISTS "Masters can update their reviews" ON public.master_reviews;
DROP POLICY IF EXISTS "Masters can delete their reviews" ON public.master_reviews;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.master_reviews
    FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.master_reviews TO anon, authenticated;

-- Public profile writes go through authenticated backend endpoints. In
-- particular, client roles must not self-promote or alter wallet fields.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.users
    FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.users TO anon, authenticated;

-- Remove the retired auction's public screenshot capabilities and objects.
DROP POLICY IF EXISTS "Allow anon uploads lead_images" ON storage.objects;
DELETE FROM storage.objects
WHERE bucket_id = 'lead_images' AND name LIKE 'auctions/%';

-- Retire every legacy auction policy and direct table surface. Historical rows are kept
-- for audit purposes, but they are not exposed through PostgREST.
DROP POLICY IF EXISTS "Anyone can view active auctions" ON public.auctions;
DROP POLICY IF EXISTS "Users can create their own auctions" ON public.auctions;
DROP POLICY IF EXISTS "Users can update active auctions if they are the seller" ON public.auctions;
DROP POLICY IF EXISTS "Anyone can view bids" ON public.auction_bids;
DROP POLICY IF EXISTS "Users can place bids" ON public.auction_bids;
REVOKE ALL ON TABLE public.auctions FROM PUBLIC;
REVOKE ALL ON TABLE public.auctions FROM anon, authenticated;
REVOKE ALL ON TABLE public.auction_bids FROM PUBLIC;
REVOKE ALL ON TABLE public.auction_bids FROM anon, authenticated;

-- Stop the settlement job before removing its SECURITY DEFINER function.
DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'process-expired-auctions-every-minute';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.process_expired_auctions();
DROP FUNCTION IF EXISTS public.place_bid(UUID, UUID, INTEGER);

-- Stripe fulfillment is atomic and idempotent. The signed Stripe amount funds
-- users.balance, which is the exact NUMERIC wallet charged by acceptance migration 050.
CREATE OR REPLACE FUNCTION public.credit_stripe_balance(
  p_user_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
  p_provider_tx_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_transaction_id UUID;
  v_new_balance NUMERIC;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_TOPUP';
  END IF;
  IF p_currency IS NULL OR UPPER(p_currency) NOT IN ('CZK', 'EUR', 'USD') THEN
    RAISE EXCEPTION 'INVALID_CURRENCY';
  END IF;
  IF p_provider_tx_id IS NULL OR p_provider_tx_id = '' THEN
    RAISE EXCEPTION 'INVALID_PROVIDER_TX_ID';
  END IF;

  SELECT id INTO v_transaction_id
  FROM public.transactions
  WHERE provider_tx_id = p_provider_tx_id;
  IF FOUND THEN
    SELECT balance INTO v_new_balance FROM public.users WHERE id = p_user_id;
    RETURN jsonb_build_object('processed', false, 'balance', v_new_balance);
  END IF;

  SELECT * INTO v_user
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;
  IF UPPER(COALESCE(v_user.currency, 'CZK')) <> UPPER(p_currency) THEN
    RAISE EXCEPTION 'WALLET_CURRENCY_MISMATCH';
  END IF;

  INSERT INTO public.transactions (
    user_id, amount, currency, credits_added, provider, provider_tx_id, status
  ) VALUES (
    p_user_id,
    ROUND(p_amount, 2),
    UPPER(p_currency),
    0,
    'stripe',
    p_provider_tx_id,
    'completed'
  )
  ON CONFLICT (provider_tx_id) DO NOTHING
  RETURNING id INTO v_transaction_id;

  IF v_transaction_id IS NULL THEN
    RETURN jsonb_build_object(
      'processed', false,
      'balance', v_user.balance
    );
  END IF;

  UPDATE public.users
  SET balance = COALESCE(balance, 0) + ROUND(p_amount, 2)
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  RETURN jsonb_build_object(
    'processed', true,
    'transaction_id', v_transaction_id,
    'balance', v_new_balance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.credit_stripe_balance(UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_stripe_balance(UUID, NUMERIC, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.credit_stripe_balance(UUID, NUMERIC, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.credit_stripe_balance(UUID, NUMERIC, TEXT, TEXT) TO service_role;

-- Direct booking is one transaction: lead, accepted relationship, chat, CRM session,
-- and notification either all exist or none do.
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
    p_master_id, v_input.session_date, v_input.client_name, TRUE, 'accepted'
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

  v_session_date := COALESCE(v_input.session_date::DATE, CURRENT_DATE);
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
    'Новая персональная заявка!',
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
