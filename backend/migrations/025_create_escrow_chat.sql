-- Migration: Add proposal status and create chat tables

-- 1. Add status to lead_proposals
ALTER TABLE public.lead_proposals 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- 2. Create lead_chats table
CREATE TABLE IF NOT EXISTS public.lead_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    master_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    client_session_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lead_id, master_id)
);

COMMENT ON TABLE public.lead_chats IS 'Chats between clients and masters for a specific lead';

-- 3. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.lead_chats(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL, -- 'client' or 'master'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.chat_messages IS 'Messages in lead_chats';

-- 4. Enable RLS
ALTER TABLE public.lead_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for lead_chats
CREATE POLICY "Masters can view own chats" ON public.lead_chats
    FOR SELECT TO authenticated USING (auth.uid() = master_id);

CREATE POLICY "Masters can create chats" ON public.lead_chats
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = master_id);

-- 6. RLS Policies for chat_messages
CREATE POLICY "Masters can view own messages" ON public.chat_messages
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.lead_chats WHERE id = chat_messages.chat_id AND master_id = auth.uid()
        )
    );

CREATE POLICY "Masters can insert messages" ON public.chat_messages
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lead_chats WHERE id = chat_messages.chat_id AND master_id = auth.uid()
        ) AND sender_type = 'master'
    );
