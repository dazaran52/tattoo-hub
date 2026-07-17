import asyncio
from supabase import create_client
import os

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])

# query the information_schema for users
res = supabase.table('users').select('*').limit(1).execute()
print(res)
