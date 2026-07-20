import asyncio
from supabase import create_client
import os
from dotenv import load_dotenv
load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# 1. Fetch chats
res = supabase.table("lead_chats").select(
    "id, client_id, client_session_id, master_id, created_at, users!lead_chats_client_id_fkey(display_name, email, avatar_url)"
).execute()
print(res.data)
