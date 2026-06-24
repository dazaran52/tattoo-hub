CREATE TABLE IF NOT EXISTS master_days_off (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    master_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(master_id, date)
);

ALTER TABLE master_days_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Masters can view their own days off" 
ON master_days_off FOR SELECT USING (auth.uid() = master_id);

CREATE POLICY "Masters can insert their own days off" 
ON master_days_off FOR INSERT WITH CHECK (auth.uid() = master_id);

CREATE POLICY "Masters can delete their own days off" 
ON master_days_off FOR DELETE USING (auth.uid() = master_id);

-- Allow public read so the widget can fetch
CREATE POLICY "Public can view master days off" 
ON master_days_off FOR SELECT USING (true);
