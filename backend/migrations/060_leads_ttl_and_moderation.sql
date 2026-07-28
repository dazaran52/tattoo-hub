-- Migration: 060 Leads TTL, expiration logic, and moderation

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS timer_start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS ttl_warning_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure timer_start_at is populated for existing leads
UPDATE public.leads
SET timer_start_at = created_at
WHERE timer_start_at IS NULL;

-- Create the processing function
CREATE OR REPLACE FUNCTION public.process_expired_leads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lead record;
BEGIN
  -- 1. Warning: 20 hours passed, still 'new' in CRM (or no CRM entry yet but not rejected)
  -- For leads specifically assigned to a master (both personal and marketplace)
  FOR v_lead IN
    SELECT l.id, l.assigned_master_id, l.title
    FROM public.leads l
    WHERE l.assigned_master_id IS NOT NULL
      AND l.status = 'new'
      AND l.ttl_warning_sent = FALSE
      AND l.timer_start_at <= NOW() - INTERVAL '20 hours'
      AND l.timer_start_at > NOW() - INTERVAL '24 hours'
      -- Check CRM status: should still be 'new', or absent (meaning he hasn't accepted it)
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.master_clients mc 
          WHERE mc.lead_id = l.id AND mc.master_id = l.assigned_master_id AND mc.kanban_status != 'new'
        )
      )
  LOOP
    -- Mark warning sent
    UPDATE public.leads SET ttl_warning_sent = TRUE WHERE id = v_lead.id;
    -- Send notification to master
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_lead.assigned_master_id,
      'Истекает срок ответа на заявку!',
      'У вас осталось менее 4 часов, чтобы отреагировать на заявку «' || COALESCE(v_lead.title, 'Без названия') || '», иначе она будет передана другим мастерам.',
      'system'
    );
  END LOOP;

  -- 2. Marketplace (Specific Master) Timeout: 24 hours passed
  -- is_personal = false, assigned_master_id IS NOT NULL
  FOR v_lead IN
    SELECT l.id, l.assigned_master_id, l.title
    FROM public.leads l
    WHERE l.assigned_master_id IS NOT NULL
      AND l.is_personal = FALSE
      AND l.status = 'new'
      AND l.timer_start_at <= NOW() - INTERVAL '24 hours'
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.master_clients mc 
          WHERE mc.lead_id = l.id AND mc.master_id = l.assigned_master_id AND mc.kanban_status != 'new'
        )
      )
  LOOP
    -- Detach master, make public, reset timer
    UPDATE public.leads 
    SET assigned_master_id = NULL, 
        timer_start_at = NOW(), 
        ttl_warning_sent = FALSE 
    WHERE id = v_lead.id;
    
    -- Mark CRM card as expired if it exists
    UPDATE public.master_clients
    SET kanban_status = 'expired'
    WHERE lead_id = v_lead.id AND master_id = v_lead.assigned_master_id;

    -- Update session status if exists
    UPDATE public.master_sessions
    SET status = 'expired'
    WHERE lead_id = v_lead.id AND master_id = v_lead.assigned_master_id;

    -- Notify master
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      v_lead.assigned_master_id,
      'Время вышло',
      'Вы не успели отреагировать на заявку «' || COALESCE(v_lead.title, 'Без названия') || '» за 24 часа. Она передана в общую ленту маркетплейса.',
      'system'
    );
  END LOOP;

  -- 3. Personal Lead Timeout: 24 hours passed
  -- is_personal = true, assigned_master_id IS NOT NULL
  FOR v_lead IN
    SELECT l.id, l.assigned_master_id, l.title
    FROM public.leads l
    WHERE l.assigned_master_id IS NOT NULL
      AND l.is_personal = TRUE
      AND l.status = 'new'
      AND l.timer_start_at <= NOW() - INTERVAL '24 hours'
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.master_clients mc 
          WHERE mc.lead_id = l.id AND mc.master_id = l.assigned_master_id AND mc.kanban_status != 'new'
        )
      )
  LOOP
    -- Move to moderation
    UPDATE public.leads 
    SET status = 'moderation'
    WHERE id = v_lead.id;

    -- Notify admin role users
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT id, 'Требуется модерация (Личная заявка)', 'Личная заявка «' || COALESCE(v_lead.title, 'Без названия') || '» проигнорирована мастером более 24 часов.', 'system'
    FROM public.users WHERE role = 'admin';
  END LOOP;

  -- 4. Public Marketplace Timeout: 72 hours passed
  -- assigned_master_id IS NULL
  FOR v_lead IN
    SELECT l.id, l.title
    FROM public.leads l
    WHERE l.assigned_master_id IS NULL
      AND l.status = 'new'
      AND l.timer_start_at <= NOW() - INTERVAL '72 hours'
  LOOP
    -- Move to moderation
    UPDATE public.leads 
    SET status = 'moderation'
    WHERE id = v_lead.id;

    -- Notify admin role users
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT id, 'Требуется модерация (Маркетплейс)', 'Публичная заявка «' || COALESCE(v_lead.title, 'Без названия') || '» висит более 72 часов без отклика.', 'system'
    FROM public.users WHERE role = 'admin';
  END LOOP;

END;
$$;

-- Schedule the job if pg_cron is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('process-expired-leads')
    FROM cron.job
    WHERE jobname = 'process-expired-leads';
    
    PERFORM cron.schedule(
      'process-expired-leads',
      '*/15 * * * *',
      'SELECT public.process_expired_leads()'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if pg_cron schema is not accessible by the migrator user
    NULL;
END;
$$;
