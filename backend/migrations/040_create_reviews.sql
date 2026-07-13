-- Create master_reviews table
CREATE TABLE IF NOT EXISTS master_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.master_sessions(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(session_id) -- One review per session
);

-- Enable RLS
ALTER TABLE master_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for master_reviews
CREATE POLICY "Anyone can read reviews" ON master_reviews FOR SELECT USING (true);
CREATE POLICY "Clients can create reviews" ON master_reviews FOR INSERT WITH CHECK (true); -- We will validate in backend
CREATE POLICY "Masters can update their reviews" ON master_reviews FOR UPDATE USING (auth.uid() = master_id);
CREATE POLICY "Masters can delete their reviews" ON master_reviews FOR DELETE USING (auth.uid() = master_id);
