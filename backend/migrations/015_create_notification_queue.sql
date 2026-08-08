-- 015_create_notification_queue.sql

CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    entity_id UUID, -- For linking to a specific lead or message
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'cancelled', 'failed'
    send_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_poll ON public.notification_queue(status, send_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notification_queue_cancel ON public.notification_queue(user_id, event_type, entity_id) WHERE status = 'pending';

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage notification queue"
ON public.notification_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
