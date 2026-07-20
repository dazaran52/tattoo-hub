import asyncio
from supabase import create_client
import os
from dotenv import load_dotenv
load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# test fetching chats without leads join
query = supabase.table("lead_chats").select(
    "id, lead_id, client_id, client_session_id, master_id, created_at, chat_messages(content, created_at, sender_type)"
)
res = query.execute()
print(res.data)
