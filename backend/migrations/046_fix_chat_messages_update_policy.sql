-- Migration 046: Fix chat_messages update policy for clients
DROP POLICY IF EXISTS "Participants can update message read status" ON public.chat_messages;

CREATE POLICY "Participants can update message read status" ON public.chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.lead_chats 
            WHERE id = chat_messages.chat_id 
            AND (master_id = auth.uid() OR client_id = auth.uid())
        )
    );
