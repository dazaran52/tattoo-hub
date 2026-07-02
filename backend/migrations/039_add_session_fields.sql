ALTER TABLE master_sessions ADD COLUMN IF NOT EXISTS body_place text;
ALTER TABLE master_sessions ADD COLUMN IF NOT EXISTS size text;
