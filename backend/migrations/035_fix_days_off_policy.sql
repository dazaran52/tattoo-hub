ALTER TABLE master_days_off ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Masters can update their own days off" ON master_days_off FOR UPDATE USING (auth.uid() = master_id);
