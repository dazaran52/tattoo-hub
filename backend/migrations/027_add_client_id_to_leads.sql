-- Add client_id column to leads referencing public.users
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
