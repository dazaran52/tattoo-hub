import re

path = "backend/app/routers/crm.py"
with open(path, "r") as f:
    content = f.read()

old_code = '''        # we will fetch the leads to get their client_id / client_token
        lead_ids = [c["lead_id"] for c in clients if c.get("lead_id")]
        lead_map = {}
        if lead_ids:
            l_res = await supabase.table("leads").select("id, client_id, client_session_id").in_("id", lead_ids).execute()
            lead_map = {l["id"]: l for l in (l_res.data or [])}
            
        for c in (chats_res.data or []):
            if c.get("client_id"):
                chat_dict[f"client_{c['client_id']}"] = c["id"]
            if c.get("client_session_id"):
                chat_dict[f"session_{c['client_session_id']}"] = c["id"]

        # Filter out deleted sessions in the client's nested array just in case
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
            client["chat_id"] = chat_id
        
        return clients'''

new_code = '''        # we will fetch the leads to get their client_id / client_token
        lead_ids = [c["lead_id"] for c in clients if c.get("lead_id")]
        lead_map = {}
        unlocked_lead_ids = set()
        
        if lead_ids:
            l_res = await supabase.table("leads").select("id, client_id, client_session_id").in_("id", lead_ids).execute()
            lead_map = {l["id"]: l for l in (l_res.data or [])}
            
            u_res = await supabase.table("lead_unlocks").select("lead_id").eq("user_id", current_user.user_id).in_("lead_id", lead_ids).execute()
            unlocked_lead_ids = {u["lead_id"] for u in (u_res.data or [])}
            
        for c in (chats_res.data or []):
            if c.get("client_id"):
                chat_dict[f"client_{c['client_id']}"] = c["id"]
            if c.get("client_session_id"):
                chat_dict[f"session_{c['client_session_id']}"] = c["id"]

        # Filter out deleted sessions in the client's nested array just in case
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
            client["chat_id"] = chat_id
            
            # Check unlocks and mask data
            client["is_unlocked"] = True
            if client.get("leads") and not client["leads"].get("is_personal"):
                # It's a marketplace lead assigned to this master
                if client["lead_id"] not in unlocked_lead_ids:
                    client["is_unlocked"] = False
                    client["phone"] = "Скрыто"
                    client["email"] = "Скрыто"
                    client["instagram"] = "Скрыто"
                    client["contact_info"] = "Скрыто"
        
        return clients'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(path, "w") as f:
        f.write(content)
    print("Updated crm.py successfully")
else:
    print("Could not find old_code in crm.py")
