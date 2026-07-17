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
    supabase: Client = Depends(get_supabase_client)
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
    return data

@router.get("/my")
async def get_my_chats(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get all chats for the current master with lead details and last message, optimized via nested joins.
    """
    query = supabase.table("lead_chats").select(
        "id, lead_id, master_id, created_at, leads!inner(title, description, image_urls, contacts, client_id, users!leads_client_id_fkey(display_name, email, avatar_url)), chat_messages(content, created_at, sender_type)"
    )

    if current_user.role == "client":
        query = query.eq("leads.client_id", current_user.user_id)
    else:
        query = query.eq("master_id", current_user.user_id)
        
    chats_res = query.order("created_at", desc=True, foreign_table="chat_messages").limit(1, foreign_table="chat_messages").order("created_at", desc=True).limit(limit).offset(offset).execute()

    chats = chats_res.data or []
    if not chats:
        return []
    
    lead_ids = list(set([c["lead_id"] for c in chats]))
    
    # Batch fetch proposal and kanban statuses
    prop_res = supabase.table("lead_proposals").select("lead_id, user_id, status").in_("lead_id", lead_ids).execute()
    prop_map = {(p["lead_id"], p["user_id"]): p["status"] for p in (prop_res.data or [])}

    client_res = supabase.table("master_clients").select("lead_id, master_id, kanban_status").in_("lead_id", lead_ids).execute()
    kanban_map = {(k["lead_id"], k["master_id"]): k["kanban_status"] for k in (client_res.data or [])}

    master_ids = list(set([c["master_id"] for c in chats]))
    master_users_res = supabase.table("users").select("id, display_name, username, avatar_url").in_("id", master_ids).execute()
    master_map = {u["id"]: u for u in (master_users_res.data or [])}

    for chat in chats:
        messages = chat.pop("chat_messages", [])
        chat["last_message"] = messages[0] if messages else None
            
        chat["proposal_status"] = prop_map.get((chat["lead_id"], chat["master_id"]))
        chat["kanban_status"] = kanban_map.get((chat["lead_id"], chat["master_id"]))
            
        # Build interlocutor info
        if current_user.role == "client":
            m_info = master_map.get(chat["master_id"], {})
            chat["client_info"] = {
                "name": m_info.get("display_name") or m_info.get("username") or "Мастер",
                "email": "",
                "avatar_url": m_info.get("avatar_url") or ""
            }
        else:
            leads_data = chat.get("leads") or {}
            users_data = leads_data.get("users") or {}
            
            c_name = users_data.get("display_name")
            c_email = users_data.get("email")
            c_avatar = users_data.get("avatar_url")
            
            if not c_name or not c_email:
                # Parse from contacts if client is not registered or info missing
                contacts = leads_data.get("contacts") or ""
                if "Email:" in contacts:
                    try: c_email = contacts.split("Email:")[1].split(",")[0].strip()
                    except: pass
                if "Имя:" in contacts:
                    try: c_name = contacts.split("Имя:")[1].split(",")[0].strip()
                    except: pass
            
            # If still no avatar, find last image sent by client
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

    return insert_res.data[0]
