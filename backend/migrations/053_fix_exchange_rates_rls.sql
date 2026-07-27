-- Harden exchange_rates RLS: JWT user_metadata is client-controlled and must
-- not decide write access. Admin checks must come from server-controlled data.

DROP POLICY IF EXISTS "Allow admin and service role write on exchange_rates"
ON public.exchange_rates;

CREATE POLICY "Allow admin and service role write on exchange_rates"
    ON public.exchange_rates
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR EXISTS (
            SELECT 1
            FROM public.users AS u
            WHERE u.id = auth.uid()
              AND u.is_admin = TRUE
        )
    )
    WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role'
        OR EXISTS (
            SELECT 1
            FROM public.users AS u
            WHERE u.id = auth.uid()
              AND u.is_admin = TRUE
        )
    );
