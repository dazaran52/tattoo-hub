-- Migration 043: Add is_read to chat_messages

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Allow update of is_read by the chat participants
CREATE POLICY "Participants can update message read status" ON public.chat_messages
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.lead_chats 
            WHERE id = chat_messages.chat_id 
            AND master_id = auth.uid()
        )
    );
