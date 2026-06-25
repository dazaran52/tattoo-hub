-- 038_client_contacts.sql

-- Add individual contact columns to master_clients
ALTER TABLE master_clients ADD COLUMN IF NOT EXISTS phone VARCHAR(255);
ALTER TABLE master_clients ADD COLUMN IF NOT EXISTS telegram VARCHAR(255);
ALTER TABLE master_clients ADD COLUMN IF NOT EXISTS instagram VARCHAR(255);

-- Attempt to migrate existing contact_info
UPDATE master_clients 
SET phone = contact_info 
WHERE contact_info IS NOT NULL AND contact_info != '' AND phone IS NULL;
