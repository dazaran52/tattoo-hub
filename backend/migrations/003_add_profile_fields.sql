-- Migration: Add profile fields to users table
-- Adds display_name, phone, and bio columns

-- Add new columns
ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.users.display_name IS 'User display name/nickname';
COMMENT ON COLUMN public.users.phone IS 'User phone number';
COMMENT ON COLUMN public.users.bio IS 'User bio/description';
