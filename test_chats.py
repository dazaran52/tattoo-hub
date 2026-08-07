import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
client = create_client(SUPABASE_URL, SUPABASE_KEY)
# We test with the service_role key first just to see if the query itself is valid.
res = client.table("lead_chats").select("*, leads(title), client:users!lead_chats_client_id_fkey(display_name, email, avatar_url), master:users!lead_chats_master_id_fkey(display_name, email, avatar_url)").or_("client_id.eq.26871c06-2686-406b-be67-86ad63f9505c,master_id.eq.26871c06-2686-406b-be67-86ad63f9505c").order("created_at", desc=True).execute()
print(res)
