-- Migration: Add status field to users table
-- Adds status column to track master approval state

-- Add status column with default 'pending'
ALTER TABLE public.users 
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- Add check constraint for valid statuses
ALTER TABLE public.users
    ADD CONSTRAINT users_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing users to 'approved' so current users don't get blocked
UPDATE public.users SET status = 'approved' WHERE status = 'pending';

-- Add comment for documentation
COMMENT ON COLUMN public.users.status IS 'Master approval status: pending, approved, rejected';
