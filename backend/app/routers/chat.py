from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks, Query
from pydantic import BaseModel
from app.middleware.auth import get_current_user, AuthUser, get_optional_user
from app.database import get_supabase_client
from supabase import Client, create_client
import re
from typing import List, Optional
import os

def get_service_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")  # SUPABASE_KEY is the service role key in this .env
    if not url or not key:
        return get_supabase_client()
    return create_client(url, key)

router = APIRouter(prefix="/api/chat", tags=["chat"])

class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: str
    chat_id: str
    sender_type: str
    content: str
    created_at: str
    is_read: Optional[bool] = False

# Basic Anti-spam regex
PHONE_REGEX = re.compile(r'(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}')
LINK_REGEX = re.compile(r'(http|https)://[^\s]+|www\.[^\s]+|@[A-Za-z0-9_]+')

def apply_anti_bypass_filter(content: str) -> str:
    # Basic filter to hide potential phone numbers and links/socials
    # Very rudimentary for MVP
    filtered = LINK_REGEX.sub("[СКРЫТАЯ ССЫЛКА]", content)
    # Simple digits count check, if more than 8 digits, likely a phone number
    digits = sum(c.isdigit() for c in content)
    if digits >= 8:
        filtered = "[СКРЫТЫЙ НОМЕР]"
    return filtered


def filter_accepted_chats(supabase: Client, chats: list[dict]) -> list[dict]:
    """Exclude stale chats unless their selected master has an accepted proposal."""
    lead_ids = [chat.get("lead_id") for chat in chats if chat.get("lead_id")]
    if not lead_ids:
        return []
    proposals_res = supabase.table("lead_proposals").select(
        "lead_id, user_id"
    ).in_("lead_id", lead_ids).in_(
        "status", ["accepted", "booked", "completed"]
    ).execute()
    accepted_pairs = {
        (proposal["lead_id"], proposal["user_id"])
        for proposal in (proposals_res.data or [])
    }
    leads_res = supabase.table("leads").select(
        "id, assigned_master_id"
    ).in_("id", lead_ids).execute()
    assigned_pairs = {
        (lead["id"], lead.get("assigned_master_id"))
        for lead in (leads_res.data or [])
    }
    return [
        chat for chat in chats
        if (chat.get("lead_id"), chat.get("master_id")) in accepted_pairs
        and (chat.get("lead_id"), chat.get("master_id")) in assigned_pairs
    ]

@router.get("/{chat_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    chat_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    client_token: Optional[str] = Header(None),
    current_user: Optional[AuthUser] = Depends(get_optional_user),
    supabase: Client = Depends(get_supabase_client),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Get messages for a chat. Requires either master auth OR client_token header.
    """
    # Verify access
    chat_res = supabase.table("lead_chats").select("*").eq("id", chat_id).execute()
    if not chat_res.data:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    chat = chat_res.data[0]

    if not filter_accepted_chats(supabase, [chat]):
        raise HTTPException(status_code=403, detail="CHAT_AVAILABLE_AFTER_ACCEPTANCE")
    
    # Check if client or master
    if client_token and chat["client_session_id"] == client_token:
        pass # Client authorized
    elif current_user:
        if chat["master_id"] == current_user.user_id:
            pass # Master authorized
        else:
            lead_res = supabase.table("leads").select("client_id").eq("id", chat["lead_id"]).execute()
            if lead_res.data and lead_res.data[0].get("client_id") == current_user.user_id:
                pass # Authenticated client authorized
            else:
                raise HTTPException(status_code=403, detail="Forbidden")
    else:
        raise HTTPException(status_code=403, detail="Forbidden")

    msgs_res = supabase.table("chat_messages").select("*").eq("chat_id", chat_id).order("created_at", desc=True).limit(limit).offset(offset).execute()
    data = msgs_res.data or []
    data.reverse() # Reverse to keep chronological order for UI
    
    # Mark messages as read in background
    user_role_for_read = "client"
    if current_user and chat["master_id"] == current_user.user_id:
        user_role_for_read = "master"
    
    try:
        service_client = get_service_client()
        service_client.table("chat_messages").update({"is_read": True}).eq("chat_id", chat_id).neq("sender_type", user_role_for_read).eq("is_read", False).execute()
    except Exception as e:
        print(f"Failed to mark messages as read: {e}")
    
    return data

@router.get("/unread-count")
async def get_unread_count(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        user_role = current_user.user_metadata.get("role", "client")
        
        # Get all chats for the user
        query = supabase.table("lead_chats").select("id, lead_id, master_id")
        if user_role == "client":
            query = query.eq("client_id", current_user.user_id)
        else:
            query = query.eq("master_id", current_user.user_id)
            
        chats_res = query.execute()
        accepted_chats = filter_accepted_chats(supabase, chats_res.data or [])
        chat_ids = [c["id"] for c in accepted_chats]
        
        if not chat_ids:
            return {"count": 0}
            
        # We can fetch in batches or just count. PostgREST doesn't support IN with exact count easily, 
        # but we can fetch them since the number shouldn't be massive for unread.
        unread_res = supabase.table("chat_messages")\
            .select("id")\
            .in_("chat_id", chat_ids)\
            .neq("sender_type", user_role)\
            .eq("is_read", False)\
            .execute()
            
        return {"count": len(unread_res.data or [])}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my")
async def get_my_chats(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        query = supabase.table("lead_chats").select(
            "id, lead_id, client_id, client_session_id, master_id, created_at, chat_messages(content, created_at, sender_type)"
        )

        user_role = current_user.user_metadata.get("role")
        if user_role == "client":
            query = query.eq("client_id", current_user.user_id)
        else:
            query = query.eq("master_id", current_user.user_id)
            
        chats_res = query.order("created_at", desc=True, foreign_table="chat_messages").limit(1, foreign_table="chat_messages").order("created_at", desc=True).limit(limit).offset(offset).execute()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    chats = filter_accepted_chats(supabase, chats_res.data or [])
    if not chats:
        return []
    
    # Need to fetch unread_count and master/client info
    master_ids = list(set([c["master_id"] for c in chats]))
    master_map = {}
    if master_ids:
        master_users_res = supabase.table("users").select("id, display_name, username, avatar_url").in_("id", master_ids).execute()
        master_map = {u["id"]: u for u in (master_users_res.data or [])}

    # Fetch client info manually
    client_ids = list(set([c["client_id"] for c in chats if c["client_id"]]))
    client_map = {}
    if client_ids:
        client_users_res = supabase.table("users").select("id, display_name, email, avatar_url").in_("id", client_ids).execute()
        client_map = {u["id"]: u for u in (client_users_res.data or [])}

    unread_res = supabase.table("chat_messages").select("chat_id, sender_type").in_("chat_id", [c["id"] for c in chats]).eq("is_read", False).execute()
    unread_map = {}
    for msg in (unread_res.data or []):
        if msg["sender_type"] != user_role:
            unread_map[msg["chat_id"]] = unread_map.get(msg["chat_id"], 0) + 1

    # Fetch one recent lead for each chat to populate 'leads' for UI compatibility
    # and count total leads/sessions
    client_session_ids = [c["client_session_id"] for c in chats if c["client_session_id"]]
    
    leads_map = {}
    try:
        if client_ids or client_session_ids:
            accepted_lead_ids = [chat["lead_id"] for chat in chats]
            l_query = supabase.table("leads").select("id, client_id, client_session_id, title, description, image_urls, contacts, is_personal, assigned_master_id, client_budget, client_currency, is_negotiable_budget, session_date, session_time, body_place, size, client_priority, client_name").in_("id", accepted_lead_ids).order("created_at", desc=True)
            l_res = l_query.execute()
                
            for l in (l_res.data or []):
                # group by client_id or client_session_id
                key = l["client_id"] or l["client_session_id"]
                if key not in leads_map:
                    leads_map[key] = []
                leads_map[key].append(l)
    except Exception as e:
        print(f"Error fetching leads in get_my_chats: {e}")

    # Fetch master_sessions to count properly
    sessions_map = {}
    if master_ids:
        try:
            # Get all sessions for the masters
            ms_res = supabase.table("master_sessions").select("*, master_clients!inner(leads(*))").in_("master_id", master_ids).eq("is_deleted", False).execute()
            for s in (ms_res.data or []):
                lead = s.get("master_clients", {}).get("leads", {})
                if lead:
                    c_id = lead.get("client_id")
                    cs_id = lead.get("client_session_id")
                    if c_id:
                        sessions_map[f"{s['master_id']}_{c_id}"] = sessions_map.get(f"{s['master_id']}_{c_id}", 0) + 1
                    if cs_id:
                        sessions_map[f"{s['master_id']}_{cs_id}"] = sessions_map.get(f"{s['master_id']}_{cs_id}", 0) + 1
        except Exception as e:
            print(f"Error fetching sessions count: {e}")

    master_clients_map = {}
    if user_role != "client" and current_user:
        try:
            mc_res = supabase.table("master_clients").select("id, name, email, phone, telegram, instagram, lead_id, source").eq("master_id", current_user.user_id).eq("is_deleted", False).execute()
            for mc in (mc_res.data or []):
                if mc.get("lead_id"):
                    master_clients_map[f"lead_{mc['lead_id']}"] = mc
                if mc.get("email"):
                    master_clients_map[f"email_{mc['email'].lower().strip()}"] = mc
                if mc.get("phone"):
                    master_clients_map[f"phone_{mc['phone'].strip()}"] = mc
        except Exception as e:
            print(f"Error fetching master_clients in chat: {e}")

    for chat in chats:
        messages = chat.pop("chat_messages", [])
        chat["last_message"] = messages[0] if messages else None
        chat["unread_count"] = unread_map.get(chat["id"], 0)
        
        key = chat.get("client_id") or chat.get("client_session_id")
        client_leads = leads_map.get(key, [])
        
        c_id = chat.get("client_id")
        cs_id = chat.get("client_session_id")
        m_id = chat["master_id"]
        
        s_count = 0
        if c_id and f"{m_id}_{c_id}" in sessions_map:
            s_count = max(s_count, sessions_map[f"{m_id}_{c_id}"])
        if cs_id and f"{m_id}_{cs_id}" in sessions_map:
            s_count = max(s_count, sessions_map[f"{m_id}_{cs_id}"])
            
        chat["sessions_count"] = s_count
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
            users_data = client_map.get(chat["client_id"], {})
            c_name = users_data.get("display_name")
            c_email = users_data.get("email")
            c_avatar = users_data.get("avatar_url")
            
            # Try to match with master's CRM clients
            mc_match = None
            if chat["leads"] and chat["leads"].get("id"):
                mc_match = master_clients_map.get(f"lead_{chat['leads']['id']}")
            if not mc_match and c_email:
                mc_match = master_clients_map.get(f"email_{c_email.lower().strip()}")
                
            if not c_name or c_name == "Клиент":
                if mc_match and mc_match.get("name") and mc_match.get("name") != "Клиент":
                    c_name = mc_match["name"]
                elif chat["leads"] and chat["leads"].get("client_name"):
                    c_name = chat["leads"]["client_name"]
            
            if not c_name or not c_email or c_name == "Клиент":
                if chat["leads"]:
                    contacts = chat["leads"].get("contacts") or ""
                    if "Email:" in contacts and not c_email:
                        try: c_email = contacts.split("Email:")[1].split(",")[0].strip()
                        except: pass
                    if "Имя:" in contacts and (not c_name or c_name == "Клиент"):
                        try: c_name = contacts.split("Имя:")[1].split(",")[0].strip()
                        except: pass
            
            if not c_name or c_name == "Клиент":
                if mc_match and mc_match.get("name"):
                    c_name = mc_match["name"]
            
            chat["client_info"] = {
                "name": c_name or (mc_match.get("name") if mc_match else None) or c_email or (chat["leads"]["client_name"] if chat["leads"] and chat["leads"].get("client_name") else "Клиент"),
                "email": c_email or (mc_match.get("email") if mc_match else "") or "",
                "avatar_url": c_avatar or ""
            }

    return chats

@router.post("/{chat_id}/messages")
async def send_message(
    chat_id: str,
    message: MessageCreate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    chat_res = supabase.table("lead_chats").select("*").eq("id", chat_id).execute()
    if not chat_res.data:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    chat = chat_res.data[0]
    lead_id = chat["lead_id"]
    master_id = chat["master_id"]
    
    sender_type = None

    if chat["master_id"] == current_user.user_id:
        sender_type = "master"
    else:
        lead_res = supabase.table("leads").select("client_id").eq("id", lead_id).execute()
        if lead_res.data and lead_res.data[0].get("client_id") == current_user.user_id:
            sender_type = "client"
        else:
            raise HTTPException(status_code=403, detail="Forbidden")

    # Chat is available only after the client accepts this master.
    if not filter_accepted_chats(supabase, [{
        "lead_id": lead_id,
        "master_id": master_id,
    }]):
        raise HTTPException(status_code=403, detail="CHAT_AVAILABLE_AFTER_ACCEPTANCE")

    content = message.content

    insert_res = supabase.table("chat_messages").insert({
        "chat_id": chat_id,
        "sender_type": sender_type,
        "content": content
    }).execute()

    if not insert_res.data:
        raise HTTPException(status_code=400, detail="Failed to send message")

    # If sender is master, send email to client
    if sender_type == "master":
        try:
            # get lead details to extract email
            lead_res = supabase.table("leads").select("title, contacts").eq("id", lead_id).execute()
            if lead_res.data:
                lead = lead_res.data[0]
                contacts = lead.get("contacts", "")
                
                # Extract email using simple regex
                email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', contacts)
                if email_match:
                    client_email = email_match.group(0)
                    client_session_id = chat.get("client_session_id")
                    title = lead.get("title", "Заявка на тату")
                    
                    from app.services.email_lead_agent import send_chat_notification_to_client
                    import threading
                    
                    # Fire and forget email notification
                    threading.Thread(
                        target=send_chat_notification_to_client,
                        args=(client_email, client_session_id, title, content[:150] + ("..." if len(content) > 150 else ""))
                    ).start()
        except Exception as e:
            # Don't fail the message send if email fails
            print(f"Failed to trigger chat email notification: {e}")
            
    elif sender_type == "client":
        try:
            from app.services.notifications import send_push_notification
            import threading
            
            lead_res = supabase.table("leads").select("title").eq("id", lead_id).execute()
            title = "Новое сообщение"
            if lead_res.data:
                title = lead_res.data[0].get("title", "Новое сообщение")
                
            push_text = content
            if content.startswith("http") and "supabase" in content:
                push_text = "📸 Фото"
            elif len(content) > 100:
                push_text = content[:100] + "..."
                
            threading.Thread(
                target=send_push_notification,
                args=(master_id, f"Сообщение по заявке: {title}", push_text, f"/dashboard?tab=messages")
            ).start()
        except Exception as e:
            print(f"Failed to send push notification to master: {e}")

    return insert_res.data[0]

@router.get("/{chat_id}/sessions")
async def get_chat_sessions(
    chat_id: str,
    client_token: Optional[str] = Header(None),
    current_user: Optional[AuthUser] = Depends(get_optional_user),
    supabase: Client = Depends(get_supabase_client)
):
    chat_res = supabase.table("lead_chats").select("*").eq("id", chat_id).execute()
    if not chat_res.data:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    chat = chat_res.data[0]
    
    # Verify access
    if not ((client_token and chat["client_session_id"] == client_token) or (current_user and (chat["master_id"] == current_user.user_id or chat["client_id"] == current_user.user_id))):
        raise HTTPException(status_code=403, detail="Forbidden")
    if not filter_accepted_chats(supabase, [chat]):
        raise HTTPException(status_code=403, detail="CHAT_AVAILABLE_AFTER_ACCEPTANCE")

    # Fetch sessions for this master & client
    query = supabase.table("master_sessions").select("*, master_clients!inner(id, name, lead_id, leads(*))").eq("master_id", chat["master_id"]).eq("is_deleted", False)
    
    sessions_res = query.execute()
    sessions = []
    for s in sessions_res.data or []:
        if s.get("master_clients") and s["master_clients"].get("leads"):
            lead = s["master_clients"]["leads"]
            if lead.get("client_id") == chat.get("client_id") or lead.get("client_session_id") == chat.get("client_session_id"):
                sessions.append(s)
                
    return sessions
