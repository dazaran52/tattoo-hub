import re

path = "backend/app/routers/client_portal.py"
with open(path, "r") as f:
    content = f.read()

old_code = '''    # 4. Accept proposal
    supabase.table("lead_proposals").update({"status": "accepted"}).eq("lead_id", lead_id).eq("user_id", master_id).execute()'''

new_code = '''    # 4. Accept proposal
    supabase.table("lead_proposals").update({"status": "accepted"}).eq("lead_id", lead_id).eq("user_id", master_id).execute()
    
    # Send system message to chat
    client_id = lead.get("client_id")
    client_token = lead.get("client_session_id") or lead.get("client_token")
    if client_id:
        chats_res = supabase.table("lead_chats").select("id").eq("client_id", client_id).eq("master_id", master_id).execute()
    else:
        chats_res = supabase.table("lead_chats").select("id").eq("client_session_id", client_token).eq("master_id", master_id).execute()
        
    chat_id = None
    if chats_res.data:
        chat_id = chats_res.data[0]["id"]
    else:
        new_chat = supabase.table("lead_chats").insert({
            "lead_id": lead_id,
            "master_id": master_id,
            "client_session_id": client_token,
            "client_id": client_id
        }).execute()
        if new_chat.data:
            chat_id = new_chat.data[0]["id"]
            
    if chat_id:
        import json
        system_msg = {
            "type": "session_created",
            "date": lead.get("session_date"),
            "price": prop_res.data[0].get("price_offer")
        }
        supabase.table("chat_messages").insert({
            "chat_id": chat_id,
            "sender_type": "system",
            "content": f"[SYSTEM_CARD]: {json.dumps(system_msg)}"
        }).execute()
        
        # Notify master
        from app.services.notifications import send_push_notification
        import asyncio
        asyncio.create_task(asyncio.to_thread(
            send_push_notification,
            master_id,
            "Сеанс подтвержден!",
            f"Клиент выбрал вас для заявки '{lead.get('title')}'.",
            f"/dashboard?tab=messages"
        ))'''

content = content.replace(old_code, new_code)

with open(path, "w") as f:
    f.write(content)
print("Updated client_portal.py")
