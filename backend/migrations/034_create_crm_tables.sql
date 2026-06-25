-- Create enum for sources if not exists
CREATE TABLE IF NOT EXISTS master_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_info TEXT,
    source TEXT DEFAULT 'manual', -- 'marketplace', 'direct', 'manual'
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL, 
    kanban_status TEXT DEFAULT 'new', -- 'new', 'discussing', 'booked', 'completed', 'cancelled'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(master_id, lead_id)
);

CREATE TABLE IF NOT EXISTS master_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES master_clients(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    price DECIMAL,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modify master_days_off
ALTER TABLE master_days_off 
ADD COLUMN IF NOT EXISTS is_full_day BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Migrate existing proposals to master_clients
INSERT INTO master_clients (master_id, lead_id, name, source, kanban_status)
SELECT p.user_id, p.lead_id, l.title, 'marketplace', 
  CASE 
    WHEN p.status = 'accepted' THEN 'discussing'
    WHEN p.status = 'rejected' THEN 'cancelled'
    WHEN p.status = 'booked' THEN 'booked'
    WHEN p.status = 'completed' THEN 'completed'
    ELSE 'new'
  END
FROM lead_proposals p
JOIN leads l ON p.lead_id = l.id
ON CONFLICT DO NOTHING;

-- Policies for master_clients
ALTER TABLE master_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Masters can view own clients" ON master_clients FOR SELECT USING (auth.uid() = master_id);
CREATE POLICY "Masters can insert own clients" ON master_clients FOR INSERT WITH CHECK (auth.uid() = master_id);
CREATE POLICY "Masters can update own clients" ON master_clients FOR UPDATE USING (auth.uid() = master_id);
CREATE POLICY "Masters can delete own clients" ON master_clients FOR DELETE USING (auth.uid() = master_id);

-- Policies for master_sessions
ALTER TABLE master_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Masters can view own sessions" ON master_sessions FOR SELECT USING (auth.uid() = master_id);
CREATE POLICY "Masters can insert own sessions" ON master_sessions FOR INSERT WITH CHECK (auth.uid() = master_id);
CREATE POLICY "Masters can update own sessions" ON master_sessions FOR UPDATE USING (auth.uid() = master_id);
CREATE POLICY "Masters can delete own sessions" ON master_sessions FOR DELETE USING (auth.uid() = master_id);
