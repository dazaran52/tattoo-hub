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
            "id, lead_id, master_id, created_at, leads!inner(title, description, image_urls, contacts, client_id, users!leads_client_id_fkey(display_name, email, avatar_url)), chat_messages(content, created_at, sender_type)"
        )
        query = query.eq("master_id", master_id)
        chats_res = await query.order("created_at", desc=True, foreign_table="chat_messages").limit(1, foreign_table="chat_messages").order("created_at", desc=True).limit(50).offset(0).execute()
        
        chats = chats_res.data or []
        if not chats:
            print("No chats returned.")
            return
            
        lead_ids = list(set([c["lead_id"] for c in chats]))
        
        prop_res = await supabase.table("lead_proposals").select("lead_id, user_id, status").in_("lead_id", lead_ids).execute()
        prop_map = {(p["lead_id"], p["user_id"]): p["status"] for p in (prop_res.data or [])}

        client_res = await supabase.table("master_clients").select("lead_id, master_id, kanban_status").in_("lead_id", lead_ids).execute()
        kanban_map = {(k["lead_id"], k["master_id"]): k["kanban_status"] for k in (client_res.data or [])}

        master_ids = list(set([c["master_id"] for c in chats]))
        master_users_res = await supabase.table("users").select("id, display_name, username, avatar_url").in_("id", master_ids).execute()
        master_map = {u["id"]: u for u in (master_users_res.data or [])}
        
        print("Success! Processed chats.")
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
