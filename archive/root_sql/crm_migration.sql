-- Add CRM fields to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS assigned_master_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS session_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_personal BOOLEAN DEFAULT FALSE;

-- Policy: Masters can view and update their personal leads
CREATE POLICY "Masters can view their personal leads"
    ON public.leads FOR SELECT
    USING (auth.uid() = assigned_master_id OR auth.uid() = client_id OR auth.role() = 'service_role');

CREATE POLICY "Masters can update their personal leads"
    ON public.leads FOR UPDATE
    USING (auth.uid() = assigned_master_id);

CREATE POLICY "Masters can insert personal leads"
    ON public.leads FOR INSERT
    WITH CHECK (auth.uid() = assigned_master_id OR auth.uid() = client_id);
