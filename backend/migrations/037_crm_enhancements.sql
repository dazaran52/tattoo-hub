-- 037_crm_enhancements.sql

-- Add soft delete to master_clients
ALTER TABLE master_clients ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Add new columns to master_sessions
ALTER TABLE master_sessions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE master_sessions ADD COLUMN IF NOT EXISTS waiver_signed BOOLEAN DEFAULT false;
ALTER TABLE master_sessions ADD COLUMN IF NOT EXISTS waiver_signed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE master_sessions ADD COLUMN IF NOT EXISTS result_image_urls JSONB DEFAULT '[]'::jsonb;

-- Create default status for master_sessions if they don't have one (retroactively fixing past data)
UPDATE master_sessions SET status = 'booked' WHERE status IS NULL;
