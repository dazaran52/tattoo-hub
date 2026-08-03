-- Fix direct booking status so it shows as 'Ожидает ответа' for the client initially
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
    p_master_id, v_input.session_date, v_input.client_name, COALESCE(v_input.is_personal, FALSE), 'new'
  ) RETURNING * INTO v_lead;

  INSERT INTO public.lead_proposals (
    lead_id, user_id, status, price_offer, proposed_dates
  ) VALUES (
    v_lead.id, p_master_id, 'new', 0, 'Прямая запись к мастеру'
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

-- Update existing personal leads that are 'accepted' to 'new' if their master_session is still 'new'
-- This fixes the state for the user's current lead!
UPDATE public.leads l
SET status = 'new'
FROM public.master_sessions s
WHERE l.id = s.lead_id
  AND l.is_personal = TRUE
  AND l.status = 'accepted'
  AND s.status = 'new';

UPDATE public.lead_proposals p
SET status = 'new'
FROM public.master_sessions s, public.leads l
WHERE p.lead_id = s.lead_id
  AND p.lead_id = l.id
  AND l.is_personal = TRUE
  AND p.status = 'accepted'
  AND s.status = 'new';
