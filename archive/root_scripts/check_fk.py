import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
try:
    res = client.table("lead_chats").select("*, leads(title), client:users!lead_chats_client_id_fkey(display_name, email, avatar_url), master:users!lead_chats_master_id_fkey(display_name, email, avatar_url)").limit(1).execute()
    print("SUCCESS", res)
except Exception as e:
    print("ERROR", str(e))
