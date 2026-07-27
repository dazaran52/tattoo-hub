import re

path = "backend/app/routers/crm.py"
with open(path, "r") as f:
    content = f.read()

old_code = '''                if lead_id:
                    # find chat_id
                    chat_res = await supabase.table("lead_chats").select("id").eq("lead_id", lead_id).execute()
                    # if no chat exists, we can still create a system message if a chat gets created, 
                    # but actually let's just insert a system message for the client
                    if not chat_res.data:
                        # create chat just for system messages if needed? Or better yet, just let the client see it via a notification in future.
                        pass
                    else:
                        chat_id = chat_res.data[0]["id"]
                        msg = f"[SYSTEM_CARD]: {{\"type\": \"master_rejected\", \"reason\": \"{reason or 'Без причины'}\"}}"
                        await supabase.table("chat_messages").insert({
                            "chat_id": chat_id,
                            "sender_type": "system",
                            "content": msg
                        }).execute()'''

new_code = '''                if lead_id:
                    # find chat_id
                    chat_res = await supabase.table("lead_chats").select("id").eq("lead_id", lead_id).execute()
                    chat_id = chat_res.data[0]["id"] if chat_res.data else None
                    
                    if not chat_id:
                        # Create chat just to send the rejection message
                        # We need client_id or client_session_id
                        lead_res = await supabase.table("leads").select("client_id, client_session_id").eq("id", lead_id).execute()
                        if lead_res.data:
                            new_chat = await supabase.table("lead_chats").insert({
                                "lead_id": lead_id,
                                "master_id": current_user.user_id,
                                "client_session_id": lead_res.data[0].get("client_session_id"),
                                "client_id": lead_res.data[0].get("client_id")
                            }).execute()
                            if new_chat.data:
                                chat_id = new_chat.data[0]["id"]
                                
                    if chat_id:
                        import json
                        # Escape reason
                        safe_reason = json.dumps(reason or "Без причины")[1:-1]
                        msg = f"[SYSTEM_CARD]: {{\"type\": \"master_rejected\", \"reason\": \"{safe_reason}\"}}"
                        await supabase.table("chat_messages").insert({
                            "chat_id": chat_id,
                            "sender_type": "system",
                            "content": msg
                        }).execute()'''

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Updated crm.py chat creation for rejection")
else:
    print("Could not find old_code in crm.py")

with open(path, "w") as f:
    f.write(content)
