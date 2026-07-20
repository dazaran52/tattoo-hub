-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    master_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, master_id)
);

-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own favorites"
    ON favorites FOR SELECT
    USING (auth.uid() = client_id);

CREATE POLICY "Users can insert their own favorites"
    ON favorites FOR INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can delete their own favorites"
    ON favorites FOR DELETE
    USING (auth.uid() = client_id);
