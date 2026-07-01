from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import date, time, datetime
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_async_supabase_client
from supabase._async.client import AsyncClient

router = APIRouter()

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
    reference_images: Optional[List[str]] = []

class SessionUpdate(BaseModel):
    session_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    price: Optional[float] = None
    style: Optional[str] = None
    status: Optional[str] = None
    reference_images: Optional[List[str]] = None

class CompleteSessionData(BaseModel):
    result_image_urls: List[str]
    publish_to_portfolio: bool = False

@router.get("/clients")
async def get_clients(
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        # Fetch non-deleted clients linked to this master
        res = await supabase.table("master_clients") \
            .select("*, leads(title, description, image_urls, client_priority), master_sessions(*)") \
            .eq("master_id", current_user.user_id) \
            .eq("is_deleted", False) \
            .order("created_at", desc=True) \
            .execute()
        
        # Filter out deleted sessions in the client's nested array just in case
        clients = res.data or []
        for client in clients:
            if client.get("master_sessions"):
                client["master_sessions"] = [s for s in client["master_sessions"] if not s.get("is_deleted")]
        
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
            .select("*, master_clients(*, leads(title, description, image_urls, client_priority))") \
            .eq("master_id", current_user.user_id) \
            .eq("is_deleted", False) \
            .order("created_at", desc=True) \
            .execute()
        
        # Filter out sessions where the linked client was soft deleted
        sessions = [s for s in (res.data or []) if s.get("master_clients") and not s["master_clients"].get("is_deleted")]
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
        client_res = await supabase.table("master_clients").select("id").eq("id", data.client_id).eq("master_id", current_user.user_id).execute()
        if not client_res.data:
            raise HTTPException(status_code=404, detail="Client not found or not owned by master")

        session_data = {
            "master_id": current_user.user_id,
            "client_id": data.client_id,
            "session_date": data.session_date,
            "start_time": data.start_time,
            "end_time": data.end_time,
            "price": data.price,
            "style": data.style,
            "reference_images": data.reference_images,
            "status": "booked"
        }
        res = await supabase.table("master_sessions").insert(session_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create session")
        
        return res.data[0]
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
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
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
        res = await supabase.table("master_sessions") \
            .update({
                "status": "completed",
                "result_image_urls": data.result_image_urls
            }) \
            .eq("id", session_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        # Add to portfolio if requested
        if data.publish_to_portfolio and data.result_image_urls:
            user_res = await supabase.table("users").select("portfolio_image_urls").eq("id", current_user.user_id).execute()
            if user_res.data:
                existing = user_res.data[0].get("portfolio_image_urls") or []
                # append new urls
                existing.extend(data.result_image_urls)
                await supabase.table("users").update({"portfolio_image_urls": existing}).eq("id", current_user.user_id).execute()
                
        return res.data[0]
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
