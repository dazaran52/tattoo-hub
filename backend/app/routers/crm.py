from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import date, time, datetime
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_async_supabase_client
from supabase._async.client import AsyncClient
from app.services.mail import send_transactional_email
import asyncio

router = APIRouter()


async def ensure_crm_lead_access(
    supabase: AsyncClient,
    master_id: str,
    lead_id: str | None,
) -> None:
    if not lead_id:
        return
    lead_res = await supabase.table("leads").select(
        "is_personal, assigned_master_id"
    ).eq("id", lead_id).execute()
    if not lead_res.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead = lead_res.data[0]
    if lead.get("assigned_master_id") != master_id:
        raise HTTPException(status_code=403, detail="CRM_LEAD_NOT_ASSIGNED")
    if lead.get("is_personal"):
        return
    proposal_res = await supabase.table("lead_proposals").select("id").eq(
        "lead_id", lead_id
    ).eq("user_id", master_id).in_(
        "status", ["accepted", "booked", "completed"]
    ).execute()
    if not proposal_res.data:
        raise HTTPException(status_code=403, detail="CRM_LEAD_NOT_SELECTED")


async def ensure_crm_client_access(
    supabase: AsyncClient,
    master_id: str,
    client_id: str,
) -> dict:
    client_res = await supabase.table("master_clients").select("id, lead_id").eq(
        "id", client_id
    ).eq("master_id", master_id).execute()
    if not client_res.data:
        raise HTTPException(status_code=404, detail="Client not found")
    client = client_res.data[0]
    await ensure_crm_lead_access(supabase, master_id, client.get("lead_id"))
    return client


async def ensure_crm_session_access(
    supabase: AsyncClient,
    master_id: str,
    session_id: str,
) -> dict:
    session_res = await supabase.table("master_sessions").select(
        "id, master_clients(lead_id)"
    ).eq("id", session_id).eq("master_id", master_id).execute()
    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found")
    session = session_res.data[0]
    client = session.get("master_clients") or {}
    await ensure_crm_lead_access(supabase, master_id, client.get("lead_id"))
    return session


class SessionStatusUpdate(BaseModel):
    status: str

class DayOffUpdate(BaseModel):
    date: str
    is_full_day: bool = True
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class ManualClientCreate(BaseModel):
    name: str
    contact_info: Optional[str] = None
    phone: Optional[str] = None
    telegram: Optional[str] = None
    instagram: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    session_date: Optional[str] = None

class SessionCreate(BaseModel):
    client_id: str
    session_date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    price: Optional[float] = None
    style: Optional[str] = None
    body_place: Optional[str] = None
    size: Optional[str] = None
    reference_images: Optional[List[str]] = []

class SessionUpdate(BaseModel):
    session_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    price: Optional[float] = None
    style: Optional[str] = None
    body_place: Optional[str] = None
    size: Optional[str] = None
    status: Optional[str] = None
    reference_images: Optional[List[str]] = None
    reject_reason: Optional[str] = None

class CompleteSessionData(BaseModel):
    result_image_urls: Optional[List[str]] = []
    portfolio_media: Optional[List[dict]] = []
    description: Optional[str] = ""
    publish_to_portfolio: bool = False
    send_review_request: bool = False
    end_time: Optional[str] = None

class SendAcceptEmailData(BaseModel):
    price: Optional[float] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    date: Optional[str] = None

@router.get("/clients")
async def get_clients(
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        # Fetch non-deleted clients linked to this master
        res = await supabase.table("master_clients") \
            .select("*, leads(title, description, image_urls, client_priority, is_personal, client_budget, client_currency, is_negotiable_budget, session_date, session_time, body_place, size, contacts, client_id, client_session_id), master_sessions(*)") \
            .eq("master_id", current_user.user_id) \
            .eq("is_deleted", False) \
            .order("created_at", desc=True) \
            .execute()
        
        clients = res.data or []
        
        # Fetch chats for these clients
        chat_dict = {}
        # Fetch all chats for this master
        chats_res = await supabase.table("lead_chats") \
            .select("id, lead_id, client_id, client_session_id") \
            .eq("master_id", current_user.user_id) \
            .execute()
        
        # We map chat_id by lead_id (legacy) and by client's actual id or session_id
        for c in (chats_res.data or []):
            if c.get("lead_id"):
                chat_dict[f"lead_{c['lead_id']}"] = c["id"]
        
        # we will fetch the leads to get their client_id / client_token
        lead_ids = [c["lead_id"] for c in clients if c.get("lead_id")]
        lead_map = {}
        selected_lead_ids = set()
        
        if lead_ids:
            l_res = await supabase.table("leads").select(
                "id, client_id, client_session_id, assigned_master_id"
            ).in_("id", lead_ids).execute()
            lead_map = {l["id"]: l for l in (l_res.data or [])}
            
            proposal_res = await supabase.table("lead_proposals").select("lead_id").eq(
                "user_id", current_user.user_id
            ).in_("lead_id", lead_ids).in_(
                "status", ["accepted", "booked", "completed"]
            ).execute()
            selected_lead_ids = {
                proposal["lead_id"] for proposal in (proposal_res.data or [])
                if lead_map.get(proposal["lead_id"], {}).get("assigned_master_id")
                == current_user.user_id
            }
            
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
            if client.get("leads"):
                if client["leads"].get("is_personal"):
                    client["source"] = "direct"
                else:
                    # It's a marketplace lead assigned to this master
                    if client["lead_id"] not in selected_lead_ids:
                        client["is_unlocked"] = False
                        client["chat_id"] = None
                        client["phone"] = "Скрыто"
                        client["email"] = "Скрыто"
                        client["instagram"] = "Скрыто"
                        client["contact_info"] = "Скрыто"
                        client["leads"]["contacts"] = "Скрыто до выбора мастера"
        
        return clients
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clients/{client_id}")
async def delete_client(
    client_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        await ensure_crm_client_access(supabase, current_user.user_id, client_id)
        print(f"Deleting client {client_id} for master {current_user.user_id}")
        # Soft delete client
        await supabase.table("master_clients") \
            .update({"is_deleted": True}) \
            .eq("id", client_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
        
        # Also soft delete their future sessions
        now_date = datetime.utcnow().date().isoformat()
        try:
            await supabase.table("master_sessions") \
                .update({"is_deleted": True}) \
                .eq("client_id", client_id) \
                .eq("master_id", current_user.user_id) \
                .gte("session_date", now_date) \
                .execute()
        except Exception as session_err:
            print(f"Warning: Failed to delete sessions for client {client_id}: {session_err}")
            
        return {"status": "success"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

@router.post("/clients")
async def create_manual_client(
    data: ManualClientCreate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        # Check for existing using separate queries to avoid .or_ syntax issues
        existing_client = None
        if data.phone and data.phone.strip():
            res = await supabase.table("master_clients").select("id, name").eq("master_id", current_user.user_id).eq("is_deleted", False).eq("phone", data.phone.strip()).execute()
            if res.data: existing_client = res.data[0]
            
        if not existing_client and data.telegram and data.telegram.strip():
            res = await supabase.table("master_clients").select("id, name").eq("master_id", current_user.user_id).eq("is_deleted", False).eq("telegram", data.telegram.strip()).execute()
            if res.data: existing_client = res.data[0]
            
        if not existing_client and data.instagram and data.instagram.strip():
            res = await supabase.table("master_clients").select("id, name").eq("master_id", current_user.user_id).eq("is_deleted", False).eq("instagram", data.instagram.strip()).execute()
            if res.data: existing_client = res.data[0]
            
        if not existing_client and data.email and data.email.strip():
            res = await supabase.table("master_clients").select("id, name").eq("master_id", current_user.user_id).eq("is_deleted", False).eq("email", data.email.strip()).execute()
            if res.data: existing_client = res.data[0]

        if existing_client:
            raise HTTPException(status_code=409, detail={"error": "client_exists", "client": existing_client})

        # 1. Create client
        client_data = {
            "master_id": current_user.user_id,
            "name": data.name,
            "contact_info": data.contact_info,
            "phone": data.phone,
            "telegram": data.telegram,
            "instagram": data.instagram,
            "email": data.email,
            "notes": data.notes,
            "source": "manual",
            "kanban_status": "new"
        }
        res = await supabase.table("master_clients").insert(client_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create client")
            
        client = res.data[0]
        # 2. Return client
        return client
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/clients/{client_id}")
async def update_client(
    client_id: str,
    update_data: dict,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        await ensure_crm_client_access(supabase, current_user.user_id, client_id)
        # Validate that we only update allowed fields
        allowed_fields = {"name", "contact_info", "phone", "telegram", "instagram", "email", "notes", "kanban_status"}
        filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        if not filtered_data:
            return {"status": "success"}

        res = await supabase.table("master_clients") \
            .update(filtered_data) \
            .eq("id", client_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Client not found")
            
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions")
async def get_sessions(
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Get all non-deleted sessions for the master's kanban board."""
    try:
        res = await supabase.table("master_sessions") \
            .select("*, master_clients(*, leads(title, description, image_urls, client_priority, is_personal, assigned_master_id, client_budget, client_currency, is_negotiable_budget, session_date, session_time, body_place, size, contacts, client_id, client_session_id))") \
            .eq("master_id", current_user.user_id) \
            .eq("is_deleted", False) \
            .order("created_at", desc=True) \
            .execute()
        
        # Filter out sessions where the linked client was soft deleted
        sessions = [s for s in (res.data or []) if s.get("master_clients") and not s["master_clients"].get("is_deleted")]
        marketplace_lead_ids = {
            session["master_clients"].get("lead_id")
            for session in sessions
            if session["master_clients"].get("lead_id")
            and not (session["master_clients"].get("leads") or {}).get("is_personal")
        }
        selected_lead_ids = set()
        if marketplace_lead_ids:
            proposal_res = await supabase.table("lead_proposals").select("lead_id").eq(
                "user_id", current_user.user_id
            ).in_("lead_id", list(marketplace_lead_ids)).in_(
                "status", ["accepted", "booked", "completed"]
            ).execute()
            assigned_lead_ids = {
                session["master_clients"].get("lead_id")
                for session in sessions
                if (session["master_clients"].get("leads") or {}).get(
                    "assigned_master_id"
                ) == current_user.user_id
            }
            selected_lead_ids = {
                proposal["lead_id"] for proposal in (proposal_res.data or [])
                if proposal["lead_id"] in assigned_lead_ids
            }
        for session in sessions:
            client = session["master_clients"]
            lead = client.get("leads") or {}
            lead_id = client.get("lead_id")
            if lead_id and not lead.get("is_personal") and lead_id not in selected_lead_ids:
                lead["contacts"] = "Скрыто до выбора мастера"
                for field in ("phone", "email", "instagram", "telegram", "contact_info"):
                    client[field] = "Скрыто"
        return sessions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions")
async def create_session(
    data: SessionCreate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        # Verify client belongs to master
        client_res = await supabase.table("master_clients").select("id, lead_id, source").eq("id", data.client_id).eq("master_id", current_user.user_id).execute()
        if not client_res.data:
            raise HTTPException(status_code=404, detail="Client not found or not owned by master")

        lead_id = client_res.data[0].get("lead_id")
        lead = {}
        if lead_id:
            lead_q = await supabase.table("leads").select(
                "client_id, client_session_id, is_personal, assigned_master_id"
            ).eq("id", lead_id).execute()
            if not lead_q.data:
                raise HTTPException(status_code=404, detail="Lead not found")
            lead = lead_q.data[0]
            if not lead.get("is_personal"):
                proposal_res = await supabase.table("lead_proposals").select("status").eq(
                    "lead_id", lead_id
                ).eq("user_id", current_user.user_id).in_(
                    "status", ["accepted", "booked", "completed"]
                ).execute()
                if (
                    lead.get("assigned_master_id") != current_user.user_id
                    or not proposal_res.data
                ):
                    raise HTTPException(
                        status_code=403,
                        detail="MARKETPLACE_SESSION_REQUIRES_ACCEPTED_PROPOSAL",
                    )

        session_data = {
            "master_id": current_user.user_id,
            "client_id": data.client_id,
            "lead_id": lead_id,
            "source": client_res.data[0].get("source") or "direct",
            "session_date": data.session_date,
            "start_time": data.start_time,
            "end_time": data.end_time,
            "price": data.price,
            "style": data.style,
            "body_place": data.body_place,
            "size": data.size,
            "reference_images": data.reference_images,
            "status": "booked"
        }
        res = await supabase.table("master_sessions").insert(session_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create session")
            
        # Inject system message into chat if it exists
        if lead_id:
            chat_res = await supabase.table("lead_chats").select("id").eq(
                "lead_id", lead_id
            ).eq("master_id", current_user.user_id).execute()
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
                }).execute()
        
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sessions/{session_id}")
async def update_session(
    session_id: str,
    data: SessionUpdate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        await ensure_crm_session_access(supabase, current_user.user_id, session_id)
        dump = data.model_dump()
        reason = dump.pop("reject_reason", None)
        update_data = {k: v for k, v in dump.items() if v is not None}
        
        # If rejecting/cancelling, we might need to send to marketplace
        is_rejecting = update_data.get("status") in ["rejected", "cancelled"]
        
        if is_rejecting:
            # We must get the session details first to check if it's a marketplace lead
            s_res = await supabase.table("master_sessions") \
                .select("*, master_clients(lead_id, name, leads(is_personal, assigned_master_id))") \
                .eq("id", session_id) \
                .eq("master_id", current_user.user_id) \
                .execute()
            if s_res.data:
                session_data = s_res.data[0]
                client = session_data.get("master_clients") or {}
                lead_info = client.get("leads") or {}
                lead_id = client.get("lead_id")
                
                if lead_id and not lead_info.get("is_personal"):
                    if lead_info.get("assigned_master_id") != current_user.user_id:
                        raise HTTPException(
                            status_code=403,
                            detail="MARKETPLACE_SESSION_REQUIRES_ACCEPTED_PROPOSAL",
                        )
                    proposal_res = await supabase.table("lead_proposals").select("status").eq(
                        "lead_id", lead_id
                    ).eq("user_id", current_user.user_id).in_(
                        "status", ["accepted", "booked", "completed"]
                    ).execute()
                    if not proposal_res.data:
                        raise HTTPException(
                            status_code=403,
                            detail="MARKETPLACE_SESSION_REQUIRES_ACCEPTED_PROPOSAL",
                        )
                
                # Send a system message or notification with the reason
                if lead_id:
                    # find chat_id
                    chat_res = await supabase.table("lead_chats").select("id").eq(
                        "lead_id", lead_id
                    ).eq("master_id", current_user.user_id).execute()
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
                        msg = f'[SYSTEM_CARD]: {{"type": "master_rejected", "reason": "{safe_reason}"}}'
                        await supabase.table("chat_messages").insert({
                            "chat_id": chat_id,
                            "sender_type": "system",
                            "content": msg
                        }).execute()
        
        # If moving to in_progress or discussing, notify client that the session was accepted
        if update_data.get("status") in ["in_progress", "discussing"]:
            s_res = await supabase.table("master_sessions") \
                .select("*, master_clients(lead_id, leads(client_id, client_session_id, is_personal, assigned_master_id))") \
                .eq("id", session_id) \
                .eq("master_id", current_user.user_id) \
                .execute()
            if s_res.data:
                session_data = s_res.data[0]
                client = session_data.get("master_clients") or {}
                lead_info = client.get("leads") or {}
                lead_id = client.get("lead_id")
                
                if lead_id:
                    if not lead_info.get("is_personal"):
                        if lead_info.get("assigned_master_id") != current_user.user_id:
                            raise HTTPException(
                                status_code=403,
                                detail="MARKETPLACE_SESSION_REQUIRES_ACCEPTED_PROPOSAL",
                            )
                        proposal_res = await supabase.table("lead_proposals").select("status").eq(
                            "lead_id", lead_id
                        ).eq("user_id", current_user.user_id).in_(
                            "status", ["accepted", "booked", "completed"]
                        ).execute()
                        if not proposal_res.data:
                            raise HTTPException(
                                status_code=403,
                                detail="MARKETPLACE_SESSION_REQUIRES_ACCEPTED_PROPOSAL",
                            )
                    # check if chat exists
                    chat_res = await supabase.table("lead_chats").select("id").eq(
                        "lead_id", lead_id
                    ).eq("master_id", current_user.user_id).execute()
                    chat_id = chat_res.data[0]["id"] if chat_res.data else None
                    if not chat_id:
                        # create chat
                        new_chat = await supabase.table("lead_chats").insert({
                            "lead_id": lead_id,
                            "master_id": current_user.user_id,
                            "client_session_id": lead_info.get("client_session_id"),
                            "client_id": lead_info.get("client_id")
                        }).execute()
                        if new_chat.data:
                            chat_id = new_chat.data[0]["id"]
                    
                    if chat_id:
                        msg = f'[SYSTEM_CARD]: {{"type": "master_accepted"}}'
                        await supabase.table("chat_messages").insert({
                            "chat_id": chat_id,
                            "sender_type": "system",
                            "content": msg
                        }).execute()
        
        if not update_data:
            return {"status": "no changes"}
            
        res = await supabase.table("master_sessions") \
            .update(update_data) \
            .eq("id", session_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found")
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        await ensure_crm_session_access(supabase, current_user.user_id, session_id)
        print(f"Deleting session {session_id} for master {current_user.user_id}")
        await supabase.table("master_sessions") \
            .update({"is_deleted": True}) \
            .eq("id", session_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
        return {"status": "success"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Delete session failed: {str(e)}")

@router.post("/sessions/{session_id}/waiver")
async def sign_waiver(
    session_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        await ensure_crm_session_access(supabase, current_user.user_id, session_id)
        res = await supabase.table("master_sessions") \
            .update({
                "waiver_signed": True,
                "waiver_signed_at": datetime.utcnow().isoformat(),
                "status": "in_progress"
            }) \
            .eq("id", session_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/complete")
async def complete_session(
    session_id: str,
    data: CompleteSessionData,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        await ensure_crm_session_access(supabase, current_user.user_id, session_id)
        now_time = data.end_time if data.end_time else datetime.now().strftime("%H:%M")
        res = await supabase.table("master_sessions") \
            .update({
                "status": "completed",
                "result_image_urls": data.result_image_urls,
                "end_time": now_time
            }) \
            .eq("id", session_id) \
            .eq("master_id", current_user.user_id) \
            .select("*, master_clients(email, name)") \
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        session_data = res.data[0]
            
        # Add to portfolio if requested
        if data.publish_to_portfolio and (data.portfolio_media or data.result_image_urls):
            media = data.portfolio_media
            if not media and data.result_image_urls:
                media = [{"url": url, "type": "image"} for url in data.result_image_urls]
            
            await supabase.table("portfolio_posts").insert({
                "master_id": current_user.user_id,
                "media": media,
                "description": data.description or ""
            }).execute()
            
        # Send review request
        if data.send_review_request:
            client_info = session_data.get("master_clients", {})
            client_email = client_info.get("email")
            client_name = client_info.get("name") or "клиент"
            
            if client_email:
                master_res = await supabase.table("users").select("display_name, username").eq("id", current_user.user_id).single().execute()
                master_name = master_res.data.get("display_name") or master_res.data.get("username") or "вашего мастера"
                
                review_url = f"https://tattoo-hub.xyz/review/{session_id}"
                subject = f"Оставьте отзыв о сеансе у {master_name}"
                html = f'''
                <div style="font-family: sans-serif; max-w-[600px]; margin: 0 auto; color: #171717;">
                    <h2>Здравствуйте, {client_name}!</h2>
                    <p>Спасибо, что выбрали мастера <strong>{master_name}</strong> для вашей новой татуировки.</p>
                    <p>Будем очень благодарны, если вы найдете пару минут и оставите отзыв о сеансе. Ваш фидбек помогает мастерам становиться лучше, а другим клиентам — делать правильный выбор.</p>
                    <div style="margin: 30px 0;">
                        <a href="{review_url}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Оценить сеанс</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">Если вы не посещали сеанс, просто проигнорируйте это письмо.</p>
                </div>
                '''
                # Run in background
                asyncio.create_task(asyncio.to_thread(send_transactional_email, client_email, subject, html))
                
        return session_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/send-accept-email")
async def send_accept_email(
    session_id: str,
    data: SendAcceptEmailData,
    background_tasks: BackgroundTasks,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        await ensure_crm_session_access(supabase, current_user.user_id, session_id)
        # Fetch session and client to get email
        res = await supabase.table("master_sessions") \
            .select("*, master_clients(email, lead_id)") \
            .eq("id", session_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        session_data = res.data[0]
        client_email = session_data.get("master_clients", {}).get("email")
        
        if not client_email:
            # Client has no email, return special status
            return {"status": "no_email"}
            
        master_res = await supabase.table("users").select("display_name, username").eq("id", current_user.user_id).single().execute()
        master_name = master_res.data.get("display_name") or master_res.data.get("username") or "Мастер"
        
        price_text = f"{data.price} Kč" if data.price else "Стоимость обсудим индивидуально"
        time_text = f"{data.start_time or '...'} - {data.end_time or '...'}"
        date_text = data.date or session_data.get("session_date") or ""
        
        login_link = "https://tattoo-hub.xyz/login"
        try:
            res = await supabase.auth.admin.generate_link({
                "type": "magiclink", 
                "email": client_email.strip(),
                "options": {
                    "redirect_to": "https://tattoo-hub.xyz/dashboard"
                }
            })
            if hasattr(res, 'properties') and res.properties.action_link:
                login_link = res.properties.action_link
        except Exception as e:
            print(f"Warning: Failed to generate magiclink for {client_email}: {e}")

        subject = f"Ваша заявка принята мастером {master_name}!"
        
        html = f'''
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #171717; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Ваша заявка принята! 🎉</h1>
            </div>
            
            <div style="padding: 30px;">
                <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Привет!</p>
                <p style="font-size: 16px; line-height: 1.6;">Отличные новости: мастер <strong>{master_name}</strong> рассмотрел вашу идею и готов взять её в работу!</p>
                
                <div style="background-color: #f3f4f6; border-left: 4px solid #10b981; padding: 20px; border-radius: 0 12px 12px 0; margin: 25px 0;">
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">Предварительные детали:</p>
                    <ul style="list-style: none; padding: 0; margin: 0; line-height: 1.8; color: #4b5563;">
                        <li>📅 <strong>Дата:</strong> {date_text}</li>
                        <li>⏰ <strong>Время:</strong> {time_text}</li>
                        <li>💰 <strong>Стоимость:</strong> {price_text}</li>
                    </ul>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; font-weight: bold; text-align: center; margin-bottom: 25px;">У мастера могут быть уточняющие вопросы.</p>
                
                <div style="text-align: center; margin: 35px 0;">
                    <a href="{login_link}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block;">Открыть чат с мастером</a>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    Если у вас не получается войти, просто ответьте на это письмо.
                </p>
            </div>
        </div>
        '''
        
        from app.services.mail import send_transactional_email
        import asyncio
        # Run send_transactional_email in background thread
        def send_email_sync():
            try:
                success = send_transactional_email(client_email, subject, html, from_name=f"Tattoo HUB - {master_name}")
                return success
            except Exception as e:
                print(f"Error sending email: {e}")
                return False
                
        # Send email in background so the UI doesn't hang
        background_tasks.add_task(send_email_sync)
        
        # Create chat auto-message if lead_id exists
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
            except Exception as e:
                print(f"Error creating chat auto-message: {e}")
        
        return {"status": "success", "email": client_email}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/days-off")
async def get_days_off(
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        res = await supabase.table("master_days_off") \
            .select("*") \
            .eq("master_id", current_user.user_id) \
            .execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/days-off")
async def toggle_day_off(
    data: DayOffUpdate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        # Check if exists
        check = await supabase.table("master_days_off") \
            .select("*") \
            .eq("master_id", current_user.user_id) \
            .eq("date", data.date) \
            .execute()
            
        if check.data:
            if data.is_full_day and check.data[0].get("is_full_day", True):
                await supabase.table("master_days_off") \
                    .delete() \
                    .eq("id", check.data[0]["id"]) \
                    .execute()
                return {"status": "deleted"}
            else:
                upd = {
                    "is_full_day": data.is_full_day,
                    "start_time": data.start_time,
                    "end_time": data.end_time
                }
                res = await supabase.table("master_days_off") \
                    .update(upd) \
                    .eq("id", check.data[0]["id"]) \
                    .execute()
                return {"status": "updated", "data": res.data[0]}
        else:
            ins = {
                "master_id": current_user.user_id,
                "date": data.date,
                "is_full_day": data.is_full_day,
                "start_time": data.start_time,
                "end_time": data.end_time
            }
            res = await supabase.table("master_days_off").insert(ins).execute()
            return {"status": "created", "data": res.data[0]}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
