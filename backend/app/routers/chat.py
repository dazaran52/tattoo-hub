from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks, Query
from pydantic import BaseModel
from app.middleware.auth import get_current_user, AuthUser, get_optional_user
from app.database import get_supabase_client
from supabase import Client
import re
from typing import List, Optional

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
    target_sender = "client" if user_role_for_read == "master" else "master"
    
    try:
        supabase.table("chat_messages").update({"is_read": True}).eq("chat_id", chat_id).eq("sender_type", target_sender).eq("is_read", False).execute()
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
        query = supabase.table("lead_chats").select("id")
        if user_role == "client":
            query = query.eq("client_id", current_user.user_id)
        else:
            query = query.eq("master_id", current_user.user_id)
            
        chats_res = query.execute()
        chat_ids = [c["id"] for c in (chats_res.data or [])]
        
        if not chat_ids:
            return {"count": 0}
            
        target_sender = "master" if user_role == "client" else "client"
        
        # We can fetch in batches or just count. PostgREST doesn't support IN with exact count easily, 
        # but we can fetch them since the number shouldn't be massive for unread.
        unread_res = supabase.table("chat_messages")\
            .select("id")\
            .in_("chat_id", chat_ids)\
            .eq("sender_type", target_sender)\
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
            "id, client_id, client_session_id, master_id, created_at, chat_messages(content, created_at, sender_type)"
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
    chats = chats_res.data or []
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
    except Exception as e:
        print(f"Error fetching leads in get_my_chats: {e}")

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
            users_data = client_map.get(chat["client_id"], {})
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

    return chats

@router.post("/{chat_id}/messages")
async def send_message(
    chat_id: str,
    message: MessageCreate,
    client_token: Optional[str] = Header(None),
    current_user: Optional[AuthUser] = Depends(get_optional_user),
    supabase: Client = Depends(get_supabase_client)
):
    chat_res = supabase.table("lead_chats").select("*").eq("id", chat_id).execute()
    if not chat_res.data:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    chat = chat_res.data[0]
    lead_id = chat["lead_id"]
    master_id = chat["master_id"]
    
    sender_type = None

    if client_token and chat["client_session_id"] == client_token:
        sender_type = "client"
    elif current_user:
        if chat["master_id"] == current_user.user_id:
            sender_type = "master"
        else:
            lead_res = supabase.table("leads").select("client_id").eq("id", lead_id).execute()
            if lead_res.data and lead_res.data[0].get("client_id") == current_user.user_id:
                sender_type = "client"
            else:
                raise HTTPException(status_code=403, detail="Forbidden")
    else:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Check if proposal is accepted
    prop_res = supabase.table("lead_proposals").select("status").eq("lead_id", lead_id).eq("user_id", master_id).execute()
    is_accepted = prop_res.data and prop_res.data[0]["status"] == "accepted"

    content = message.content
    if not is_accepted:
        content = apply_anti_bypass_filter(content)

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
