import re

path = "backend/app/routers/chat.py"
with open(path, "r") as f:
    content = f.read()

old_get_my = re.search(r'@router\.get\("/my"\).*?return chats', content, re.DOTALL)
if not old_get_my:
    print("Could not find get_my_chats")
    exit(1)

new_get_my = '''@router.get("/my")
async def get_my_chats(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    query = supabase.table("lead_chats").select(
        "id, client_id, client_session_id, master_id, created_at, users!lead_chats_client_id_fkey(display_name, email, avatar_url), chat_messages(content, created_at, sender_type)"
    )

    user_role = current_user.user_metadata.get("role")
    if user_role == "client":
        query = query.eq("client_id", current_user.user_id)
    else:
        query = query.eq("master_id", current_user.user_id)
        
    chats_res = query.order("created_at", desc=True, foreign_table="chat_messages").limit(1, foreign_table="chat_messages").order("created_at", desc=True).limit(limit).offset(offset).execute()
    chats = chats_res.data or []
    if not chats:
        return []
    
    # Need to fetch unread_count and master/client info
    master_ids = list(set([c["master_id"] for c in chats]))
    master_map = {}
    if master_ids:
        master_users_res = supabase.table("users").select("id, display_name, username, avatar_url").in_("id", master_ids).execute()
        master_map = {u["id"]: u for u in (master_users_res.data or [])}

    unread_res = supabase.table("chat_messages").select("chat_id, sender_type").in_("chat_id", [c["id"] for c in chats]).eq("is_read", False).execute()
    unread_map = {}
    for msg in (unread_res.data or []):
        if msg["sender_type"] != user_role:
            unread_map[msg["chat_id"]] = unread_map.get(msg["chat_id"], 0) + 1

    # Fetch one recent lead for each chat to populate 'leads' for UI compatibility
    # and count total leads/sessions
    client_ids = [c["client_id"] for c in chats if c["client_id"]]
    client_session_ids = [c["client_session_id"] for c in chats if c["client_session_id"]]
    
    leads_map = {}
    if client_ids or client_session_ids:
        l_query = supabase.table("leads").select("id, client_id, client_session_id, title, description, image_urls, contacts").order("created_at", desc=True)
        if client_ids and client_session_ids:
            l_res = l_query.or_(f"client_id.in.({','.join(client_ids)}),client_session_id.in.({','.join(client_session_ids)})").execute()
        elif client_ids:
            l_res = l_query.in_("client_id", client_ids).execute()
        else:
            l_res = l_query.in_("client_session_id", client_session_ids).execute()
            
        for l in (l_res.data or []):
            # group by client_id or client_session_id
            key = l["client_id"] or l["client_session_id"]
            if key not in leads_map:
                leads_map[key] = []
            leads_map[key].append(l)

    for chat in chats:
        messages = chat.pop("chat_messages", [])
        chat["last_message"] = messages[0] if messages else None
        chat["unread_count"] = unread_map.get(chat["id"], 0)
        
        key = chat.get("client_id") or chat.get("client_session_id")
        client_leads = leads_map.get(key, [])
        chat["sessions_count"] = len(client_leads)
        chat["leads"] = client_leads[0] if client_leads else None
        # fallback lead_id for UI
        chat["lead_id"] = chat["leads"]["id"] if chat["leads"] else None

        if user_role == "client":
            m_info = master_map.get(chat["master_id"], {})
            chat["client_info"] = {
                "name": m_info.get("display_name") or m_info.get("username") or "Мастер",
                "email": "",
                "avatar_url": m_info.get("avatar_url") or ""
            }
        else:
            users_data = chat.get("users") or {}
            c_name = users_data.get("display_name")
            c_email = users_data.get("email")
            c_avatar = users_data.get("avatar_url")
            
            if not c_name or not c_email:
                if chat["leads"]:
                    contacts = chat["leads"].get("contacts") or ""
                    if "Email:" in contacts:
                        try: c_email = contacts.split("Email:")[1].split(",")[0].strip()
                        except: pass
                    if "Имя:" in contacts:
                        try: c_name = contacts.split("Имя:")[1].split(",")[0].strip()
                        except: pass
            
            chat["client_info"] = {
                "name": c_name or c_email or (chat["leads"]["title"] if chat["leads"] else "Клиент"),
                "email": c_email or "",
                "avatar_url": c_avatar or ""
            }

    return chats'''

content = content.replace(old_get_my.group(0), new_get_my)
with open(path, "w") as f:
    f.write(content)
print("Updated get_my_chats")
