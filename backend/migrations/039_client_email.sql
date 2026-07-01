-- 039_client_email.sql

-- Add email column to master_clients
ALTER TABLE master_clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);
