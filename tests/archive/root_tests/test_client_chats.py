import asyncio
import os
import traceback
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv("backend/.env")

async def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase = await create_async_client(url, key)
    
    # Client ID for kuzmin.nekit2003
    client_id = "b626dfd9-6784-4c04-8883-9e96afdbb601"
    
    try:
        query = supabase.table("lead_chats").select(
            "id, lead_id, master_id, created_at, leads!inner(title, description, image_urls, contacts, client_id, users!leads_client_id_fkey(display_name, email, avatar_url)), chat_messages(content, created_at, sender_type)"
        )
        query = query.eq("leads.client_id", client_id)
        chats_res = await query.order("created_at", desc=True, foreign_table="chat_messages").limit(1, foreign_table="chat_messages").order("created_at", desc=True).limit(50).offset(0).execute()
        
        chats = chats_res.data or []
        print("Raw chats length for client:", len(chats))
        if not chats:
            print("No chats returned.")
            return
            
        print("Success! Processed chats.")
    except Exception as e:
        traceback.print_exc()

asyncio.run(main())
