import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")  # Service role key

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing SUPABASE_URL or SUPABASE_KEY")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def create_table():
    query = """
    CREATE TABLE IF NOT EXISTS master_days_off (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        master_id UUID REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(master_id, date)
    );
    
    -- Enable RLS
    ALTER TABLE master_days_off ENABLE ROW LEVEL SECURITY;
    
    -- Policies
    CREATE POLICY "Masters can view their own days off" 
    ON master_days_off FOR SELECT USING (auth.uid() = master_id);
    
    CREATE POLICY "Masters can insert their own days off" 
    ON master_days_off FOR INSERT WITH CHECK (auth.uid() = master_id);
    
    CREATE POLICY "Masters can delete their own days off" 
    ON master_days_off FOR DELETE USING (auth.uid() = master_id);
    
    -- Allow public read so the widget can check days off?
    -- Actually, we'll fetch via service key in the backend or public can read. Let's add a public read policy
    CREATE POLICY "Public can view master days off" 
    ON master_days_off FOR SELECT USING (true);
    """
    
    try:
        # We can't execute raw SQL easily with supabase-py, but we can try calling a generic RPC or we can use curl if RPC doesn't exist
        # Wait, tattoo-mcp has db_execute_sql but it wasn't working.
        pass
    except Exception as e:
        print(e)

if __name__ == "__main__":
    print("Use PSQL or Supabase dashboard for raw SQL. Generating SQL file...")
