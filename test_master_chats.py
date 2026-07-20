import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv("backend/.env")

async def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase = await create_async_client(url, key)
    
    # Master ID for dazaran
    master_id = "26871c06-2686-406b-be67-86ad63f9505c"
    try:
        query = supabase.table("lead_chats").select(
            "id, lead_id, created_at, leads!inner(title, description, image_urls, contacts, client_id, users!leads_client_id_fkey(display_name, email, avatar_url)), chat_messages(content, created_at, sender_type)"
        )
        query = query.eq("master_id", master_id)
        chats_res = await query.order("created_at", desc=True, foreign_table="chat_messages").limit(1, foreign_table="chat_messages").order("created_at", desc=True).limit(50).offset(0).execute()
        print("Success for master:", len(chats_res.data))
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
