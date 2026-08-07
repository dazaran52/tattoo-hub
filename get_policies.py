import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Fetch policies for users table via SQL query
res = client.rpc('run_sql', {'query': "SELECT * FROM pg_policies WHERE tablename = 'users';"}).execute()
# Wait, we probably don't have run_sql RPC. We can just use the postgrest API or psql if we have connection string.
