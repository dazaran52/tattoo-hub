ALTER TABLE master_sessions ADD COLUMN IF NOT EXISTS style text;
ALTER TABLE master_sessions ADD COLUMN IF NOT EXISTS reference_images text[];
