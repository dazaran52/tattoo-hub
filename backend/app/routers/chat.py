from fastapi import APIRouter, Depends, HTTPException, Header, BackgroundTasks
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

    msgs_res = supabase.table("chat_messages").select("*").eq("chat_id", chat_id).order("created_at", desc=False).execute()
    return msgs_res.data or []

@router.get("/my")
async def get_my_chats(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get all chats for the current master with lead details and last message.
    """
    chats_res = supabase.table("lead_chats").select(
        "id, lead_id, created_at, leads(title, description, image_urls, contacts, client_id, users(display_name, email, avatar_url))"
    ).eq("master_id", current_user.user_id).execute()

    chats = chats_res.data or []
    
    # Enrich with last message
    for chat in chats:
        msgs_res = supabase.table("chat_messages").select("content, created_at, sender_type").eq("chat_id", chat["id"]).order("created_at", desc=True).execute()
        messages = msgs_res.data or []
        
        chat["last_message"] = messages[0] if messages else None
            
        # Enrich with proposal status
        prop_res = supabase.table("lead_proposals").select("status").eq("lead_id", chat["lead_id"]).eq("user_id", current_user.user_id).execute()
        chat["proposal_status"] = prop_res.data[0]["status"] if prop_res.data else None
            
        # Build client_info
        leads_data = chat.get("leads") or {}
        users_data = leads_data.get("users") or {}
        
        c_name = users_data.get("display_name")
        c_email = users_data.get("email")
        c_avatar = users_data.get("avatar_url")
        
        if not c_name or not c_email:
            # Parse from contacts if client is not registered or info missing
            contacts = leads_data.get("contacts") or ""
            if "Email:" in contacts:
                try:
                    c_email = contacts.split("Email:")[1].split(",")[0].strip()
                except:
                    pass
            if "Имя:" in contacts:
                try:
                    c_name = contacts.split("Имя:")[1].split(",")[0].strip()
                except:
                    pass
        
        # If still no avatar, find last image sent by client
        if not c_avatar:
            for msg in messages:
                if msg["sender_type"] == "client" and msg["content"].startswith("http") and ("supabase.co" in msg["content"]):
                    c_avatar = msg["content"]
                    break
                    
        chat["client_info"] = {
            "name": c_name or c_email or leads_data.get("title") or "Клиент",
            "email": c_email or "",
            "avatar_url": c_avatar or ""
        }

    # Sort by created_at of last message or chat created_at
    chats.sort(key=lambda x: x["last_message"]["created_at"] if x["last_message"] else x["created_at"], reverse=True)

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
