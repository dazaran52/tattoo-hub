import re

path = "backend/app/routers/leads.py"
with open(path, "r") as f:
    content = f.read()

old_code = '''                        # Create the chat
                        await supabase.table("lead_chats").insert({
                            "lead_id": new_lead["id"],
                            "master_id": lead_data.assigned_master_id,
                            "client_session_id": client_token
                        }).execute()'''

new_code = '''                        # Create or get the chat
                        chat_id = None
                        if client_id:
                            chats_res = await supabase.table("lead_chats").select("id").eq("client_id", client_id).eq("master_id", lead_data.assigned_master_id).execute()
                        else:
                            chats_res = await supabase.table("lead_chats").select("id").eq("client_session_id", client_token).eq("master_id", lead_data.assigned_master_id).execute()
                            
                        if not chats_res.data:
                            new_chat = await supabase.table("lead_chats").insert({
                                "lead_id": new_lead["id"],
                                "master_id": lead_data.assigned_master_id,
                                "client_session_id": client_token,
                                "client_id": client_id
                            }).execute()
                            if new_chat.data:
                                chat_id = new_chat.data[0]["id"]
                        else:
                            chat_id = chats_res.data[0]["id"]
                            
                        if chat_id:
                            import json
                            system_msg = {
                                "type": "new_lead",
                                "lead_id": new_lead["id"],
                                "title": new_lead["title"]
                            }
                            await supabase.table("chat_messages").insert({
                                "chat_id": chat_id,
                                "sender_type": "system",
                                "content": f"[SYSTEM_CARD]: {json.dumps(system_msg)}"
                            }).execute()'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(path, "w") as f:
        f.write(content)
    print("Updated leads.py")
else:
    print("Could not find old_code in leads.py")
