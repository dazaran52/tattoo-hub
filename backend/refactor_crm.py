import re

path = "backend/app/routers/crm.py"
with open(path, "r") as f:
    content = f.read()

# Fix 1: In get_clients
old_get_clients = '''        # Fetch chats for these clients
        lead_ids = [c["lead_id"] for c in clients if c.get("lead_id")]
        chat_dict = {}
        if lead_ids:
            chats_res = await supabase.table("lead_chats") \\
                .select("id, lead_id") \\
                .eq("master_id", current_user.user_id) \\
                .in_("lead_id", lead_ids) \\
                .execute()
            chat_dict = {c["lead_id"]: c["id"] for c in (chats_res.data or [])}'''

new_get_clients = '''        # Fetch chats for these clients
        chat_dict = {}
        # Fetch all chats for this master
        chats_res = await supabase.table("lead_chats") \\
            .select("id, lead_id, client_id, client_session_id") \\
            .eq("master_id", current_user.user_id) \\
            .execute()
        
        # We map chat_id by lead_id (legacy) and by client's actual id or session_id
        for c in (chats_res.data or []):
            if c.get("lead_id"):
                chat_dict[f"lead_{c['lead_id']}"] = c["id"]
        
        # we will fetch the leads to get their client_id / client_token
        lead_ids = [c["lead_id"] for c in clients if c.get("lead_id")]
        lead_map = {}
        if lead_ids:
            l_res = await supabase.table("leads").select("id, client_id, client_session_id").in_("id", lead_ids).execute()
            lead_map = {l["id"]: l for l in (l_res.data or [])}
            
        for c in (chats_res.data or []):
            if c.get("client_id"):
                chat_dict[f"client_{c['client_id']}"] = c["id"]
            if c.get("client_session_id"):
                chat_dict[f"session_{c['client_session_id']}"] = c["id"]'''
                
content = content.replace(old_get_clients, new_get_clients)

old_client_loop = '''        # Filter out deleted sessions in the client's nested array just in case
        for client in clients:
            if client.get("master_sessions"):
                client["master_sessions"] = [s for s in client["master_sessions"] if not s.get("is_deleted")]
            client["chat_id"] = chat_dict.get(client.get("lead_id"))'''

new_client_loop = '''        # Filter out deleted sessions in the client's nested array just in case
        for client in clients:
            if client.get("master_sessions"):
                client["master_sessions"] = [s for s in client["master_sessions"] if not s.get("is_deleted")]
            
            chat_id = None
            if client.get("lead_id"):
                lead = lead_map.get(client["lead_id"], {})
                if lead.get("client_id"):
                    chat_id = chat_dict.get(f"client_{lead['client_id']}")
                if not chat_id and lead.get("client_session_id"):
                    chat_id = chat_dict.get(f"session_{lead['client_session_id']}")
                if not chat_id:
                    chat_id = chat_dict.get(f"lead_{client['lead_id']}")
            client["chat_id"] = chat_id'''

content = content.replace(old_client_loop, new_client_loop)

# Fix 2: In create_session
old_create_session = '''        # Inject system message into chat if it exists
        lead_id = client_res.data[0].get("lead_id")
        if lead_id:
            chat_res = await supabase.table("lead_chats").select("id").eq("lead_id", lead_id).eq("master_id", current_user.user_id).execute()
            if chat_res.data:
                import json
                system_msg = {
                    "type": "session_created",
                    "price": data.price,
                    "date": data.session_date,
                    "time": data.start_time
                }
                await supabase.table("chat_messages").insert({
                    "chat_id": chat_res.data[0]["id"],
                    "sender_type": "master", 
                    "content": f"[SYSTEM_CARD]: {json.dumps(system_msg)}"
                }).execute()'''

new_create_session = '''        # Inject system message into chat if it exists
        lead_id = client_res.data[0].get("lead_id")
        if lead_id:
            lead_q = await supabase.table("leads").select("client_id, client_session_id").eq("id", lead_id).execute()
            if lead_q.data:
                lead = lead_q.data[0]
                if lead.get("client_id"):
                    chat_res = await supabase.table("lead_chats").select("id").eq("client_id", lead.get("client_id")).eq("master_id", current_user.user_id).execute()
                else:
                    chat_res = await supabase.table("lead_chats").select("id").eq("client_session_id", lead.get("client_session_id")).eq("master_id", current_user.user_id).execute()
                    
                if chat_res.data:
                    import json
                    system_msg = {
                        "type": "session_created",
                        "price": data.price,
                        "date": data.session_date,
                        "time": data.start_time
                    }
                    await supabase.table("chat_messages").insert({
                        "chat_id": chat_res.data[0]["id"],
                        "sender_type": "system", 
                        "content": f"[SYSTEM_CARD]: {json.dumps(system_msg)}"
                    }).execute()'''

content = content.replace(old_create_session, new_create_session)

# Fix 3: In send_accept_email
old_send_accept = '''        # Create chat auto-message if lead_id exists
        lead_id = session_data.get("master_clients", {}).get("lead_id")
        if lead_id:
            try:
                lead_res = await supabase.table("leads").select("client_token").eq("id", lead_id).execute()
                if lead_res.data:
                    client_token = lead_res.data[0].get("client_token")
                    chats_res = await supabase.table("lead_chats").select("id").eq("lead_id", lead_id).eq("master_id", current_user.user_id).execute()
                    
                    chat_id = None
                    if not chats_res.data:
                        new_chat = await supabase.table("lead_chats").insert({
                            "lead_id": lead_id,
                            "master_id": current_user.user_id,
                            "client_session_id": client_token
                        }).execute()
                        if new_chat.data:
                            chat_id = new_chat.data[0]["id"]
                    else:
                        chat_id = chats_res.data[0]["id"]
                        
                    if chat_id:
                        msg_text = f"Здравствуйте! Ваша заявка принята. Дата: {date_text}, время: {time_text}."
                        await supabase.table("chat_messages").insert({
                            "chat_id": chat_id,
                            "sender_type": "master",
                            "content": msg_text
                        }).execute()
            except Exception as e:'''

new_send_accept = '''        # Create chat auto-message if lead_id exists
        lead_id = session_data.get("master_clients", {}).get("lead_id")
        if lead_id:
            try:
                lead_res = await supabase.table("leads").select("client_token, client_id").eq("id", lead_id).execute()
                if lead_res.data:
                    client_token = lead_res.data[0].get("client_token")
                    client_id = lead_res.data[0].get("client_id")
                    
                    if client_id:
                        chats_res = await supabase.table("lead_chats").select("id").eq("client_id", client_id).eq("master_id", current_user.user_id).execute()
                    else:
                        chats_res = await supabase.table("lead_chats").select("id").eq("client_session_id", client_token).eq("master_id", current_user.user_id).execute()
                    
                    chat_id = None
                    if not chats_res.data:
                        new_chat = await supabase.table("lead_chats").insert({
                            "lead_id": lead_id,
                            "master_id": current_user.user_id,
                            "client_session_id": client_token,
                            "client_id": client_id
                        }).execute()
                        if new_chat.data:
                            chat_id = new_chat.data[0]["id"]
                    else:
                        chat_id = chats_res.data[0]["id"]
                        
                    if chat_id:
                        import json
                        msg_text = f"Здравствуйте! Ваша заявка принята. Дата: {date_text}, время: {time_text}."
                        await supabase.table("chat_messages").insert({
                            "chat_id": chat_id,
                            "sender_type": "master",
                            "content": msg_text
                        }).execute()
                        
                        system_msg = {
                            "type": "session_created",
                            "price": data.price,
                            "date": date_text,
                            "time": time_text
                        }
                        await supabase.table("chat_messages").insert({
                            "chat_id": chat_id,
                            "sender_type": "system",
                            "content": f"[SYSTEM_CARD]: {json.dumps(system_msg)}"
                        }).execute()
                        
                        # Also send push notification
                        from app.services.notifications import send_push_notification
                        if client_id:
                            master_name = master_res.data.get("display_name") or master_res.data.get("username") or "Мастер"
                            asyncio.create_task(asyncio.to_thread(
                                send_push_notification,
                                client_id,
                                f"Сеанс принят!",
                                f"Мастер {master_name} подтвердил заявку.",
                                f"/dashboard?tab=messages"
                            ))
            except Exception as e:'''

content = content.replace(old_send_accept, new_send_accept)

with open(path, "w") as f:
    f.write(content)
print("Updated crm.py")
