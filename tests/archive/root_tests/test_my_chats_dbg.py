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
    
    # Master ID for dazaran
    master_id = "26871c06-2686-406b-be67-86ad63f9505c"
    try:
        query = supabase.table("lead_chats").select(
            "id, lead_id, master_id, created_at, leads!inner(title, description, image_urls, contacts, client_id, users!leads_client_id_fkey(display_name, email, avatar_url)), chat_messages(content, created_at, sender_type)"
        )
        query = query.eq("master_id", master_id)
        chats_res = await query.order("created_at", desc=True, foreign_table="chat_messages").limit(1, foreign_table="chat_messages").order("created_at", desc=True).limit(50).offset(0).execute()
        
        chats = chats_res.data or []
        print("Raw chats length:", len(chats))
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
        
        for chat in chats:
            messages = chat.pop("chat_messages", [])
            chat["last_message"] = messages[0] if messages else None
                
            chat["proposal_status"] = prop_map.get((chat["lead_id"], chat["master_id"]))
            chat["kanban_status"] = kanban_map.get((chat["lead_id"], chat["master_id"]))
                
            # Build interlocutor info (as master)
            leads_data = chat.get("leads") or {}
            users_data = leads_data.get("users") or {}
            
            c_name = users_data.get("display_name") if users_data else None
            c_email = users_data.get("email") if users_data else None
            c_avatar = users_data.get("avatar_url") if users_data else None
            
            if not c_name or not c_email:
                contacts = leads_data.get("contacts") or ""
                if "Email:" in contacts:
                    try: c_email = contacts.split("Email:")[1].split(",")[0].strip()
                    except: pass
                if "Имя:" in contacts:
                    try: c_name = contacts.split("Имя:")[1].split(",")[0].strip()
                    except: pass
            
            if not c_avatar and messages:
                for msg in messages:
                    if msg["sender_type"] == "client" and msg["content"].startswith("http") and ("supabase.co" in msg["content"]):
                        c_avatar = msg["content"]
                        break
                        
            chat["client_info"] = {
                "name": c_name or c_email or leads_data.get("title") or "Клиент",
                "email": c_email or "",
                "avatar_url": c_avatar or ""
            }

        print("Processed chats:", chats[0] if chats else "None")
    except Exception as e:
        traceback.print_exc()

asyncio.run(main())
