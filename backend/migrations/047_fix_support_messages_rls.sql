-- Migration 047: Add UPDATE policy for support_messages so users can mark them as read
CREATE POLICY "Users can update their own messages"
    ON public.support_messages FOR UPDATE
    USING ( auth.uid() = user_id );
