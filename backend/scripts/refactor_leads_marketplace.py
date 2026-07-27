import re

path = "backend/app/routers/leads.py"
with open(path, "r") as f:
    content = f.read()

old_code = '''                    if lead_data.is_personal and lead_data.assigned_master_id:
                        # Create an accepted proposal to bypass chat filters
                        await supabase.table("lead_proposals").insert({
                            "lead_id": new_lead["id"],
                            "user_id": lead_data.assigned_master_id,
                            "status": "accepted",
                            "price_offer": 0,
                            "proposed_dates": "Сразу в работу"
                        }).execute()
                        
                        # Create or get the chat
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
                            }).execute()
                        
                        # Also automatically add to CRM (master_clients & master_sessions)
                        # Try to find an existing client first
                        existing_client = None
                        if lead_data.instagram:
                            res_client = await supabase.table("master_clients").select("id").eq("master_id", lead_data.assigned_master_id).eq("instagram", lead_data.instagram.strip()).eq("is_deleted", False).execute()
                            if res_client.data: existing_client = res_client.data[0]
                        if not existing_client and lead_data.email:
                            res_client = await supabase.table("master_clients").select("id").eq("master_id", lead_data.assigned_master_id).eq("email", lead_data.email.strip()).eq("is_deleted", False).execute()
                            if res_client.data: existing_client = res_client.data[0]
                        
                        if not existing_client:
                            # Create new master_client
                            client_data = {
                                "master_id": lead_data.assigned_master_id,
                                "lead_id": new_lead["id"],
                                "name": lead_data.name or "Новый клиент",
                                "contact_info": lead_data.contact,
                                "phone": lead_data.contact if not lead_data.email and not lead_data.instagram else None,
                                "instagram": lead_data.instagram,
                                "email": lead_data.email,
                                "notes": "",
                                "source": "lead",
                                "kanban_status": "new"
                            }
                            new_c_res = await supabase.table("master_clients").insert(client_data).execute()
                            if new_c_res.data:
                                existing_client = new_c_res.data[0]
                                
                        if existing_client:
                            # Create a master_sessions for this new request
                            session_date = lead_data.session_date.isoformat()[:10] if lead_data.session_date else datetime.datetime.utcnow().date().isoformat()
                            res = await supabase.table("master_sessions").insert({
                                "master_id": lead_data.assigned_master_id,
                                "client_id": existing_client["id"],
                                "session_date": session_date,
                                "start_time": lead_data.session_time,
                                "status": "new",
                                "style": lead_data.style,
                                "body_place": lead_data.body_place,
                                "size": lead_data.size,
                                "reference_images": lead_data.image_urls or [],
                                "price": lead_data.budget_val
                            }).execute()'''

new_code = '''                    if lead_data.assigned_master_id:
                        if lead_data.is_personal:
                            # Create an accepted proposal to bypass chat filters
                            await supabase.table("lead_proposals").insert({
                                "lead_id": new_lead["id"],
                                "user_id": lead_data.assigned_master_id,
                                "status": "accepted",
                                "price_offer": 0,
                                "proposed_dates": "Сразу в работу"
                            }).execute()
                            
                            # Create or get the chat
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
                                }).execute()
                        
                        # Also automatically add to CRM (master_clients & master_sessions) for ANY directly assigned lead
                        # Try to find an existing client first
                        existing_client = None
                        if lead_data.instagram:
                            res_client = await supabase.table("master_clients").select("id").eq("master_id", lead_data.assigned_master_id).eq("instagram", lead_data.instagram.strip()).eq("is_deleted", False).execute()
                            if res_client.data: existing_client = res_client.data[0]
                        if not existing_client and lead_data.email:
                            res_client = await supabase.table("master_clients").select("id").eq("master_id", lead_data.assigned_master_id).eq("email", lead_data.email.strip()).eq("is_deleted", False).execute()
                            if res_client.data: existing_client = res_client.data[0]
                        
                        if not existing_client:
                            # Create new master_client
                            client_data = {
                                "master_id": lead_data.assigned_master_id,
                                "lead_id": new_lead["id"],
                                "name": lead_data.name or "Новый клиент",
                                "contact_info": lead_data.contact,
                                "phone": lead_data.contact if not lead_data.email and not lead_data.instagram else None,
                                "instagram": lead_data.instagram,
                                "email": lead_data.email,
                                "notes": "",
                                "source": "lead",
                                "kanban_status": "new"
                            }
                            new_c_res = await supabase.table("master_clients").insert(client_data).execute()
                            if new_c_res.data:
                                existing_client = new_c_res.data[0]
                                
                        if existing_client:
                            # Create a master_sessions for this new request
                            session_date = lead_data.session_date.isoformat()[:10] if lead_data.session_date else datetime.datetime.utcnow().date().isoformat()
                            res = await supabase.table("master_sessions").insert({
                                "master_id": lead_data.assigned_master_id,
                                "client_id": existing_client["id"],
                                "session_date": session_date,
                                "start_time": lead_data.session_time,
                                "status": "new",
                                "style": lead_data.style,
                                "body_place": lead_data.body_place,
                                "size": lead_data.size,
                                "reference_images": lead_data.image_urls or [],
                                "price": lead_data.budget_val
                            }).execute()'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(path, "w") as f:
        f.write(content)
    print("Updated leads.py successfully")
else:
    print("Could not find old_code in leads.py")
