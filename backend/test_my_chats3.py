import asyncio
from supabase import create_client
import os
from dotenv import load_dotenv
load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

query = supabase.table("lead_chats").select(
    "id, client_id, client_session_id, master_id, created_at, users!lead_chats_client_id_fkey(display_name, email, avatar_url), chat_messages(content, created_at, sender_type)"
)

res = query.order("created_at", desc=True, foreign_table="chat_messages").limit(1, foreign_table="chat_messages").order("created_at", desc=True).limit(50).execute()
print(res.data)
