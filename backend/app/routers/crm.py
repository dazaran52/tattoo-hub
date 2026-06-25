from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import date, time, datetime
from app.core.security import get_current_user, AuthUser
from app.core.supabase import get_async_supabase_client
from supabase._async.client import AsyncClient

router = APIRouter()

class ClientStatusUpdate(BaseModel):
    status: str

class DayOffUpdate(BaseModel):
    date: str
    is_full_day: bool = True
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class ManualClientCreate(BaseModel):
    name: str
    contact_info: Optional[str] = None
    notes: Optional[str] = None
    session_date: Optional[str] = None

@router.get("/clients")
async def get_clients(
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        # Fetch clients linked to this master, including lead info if available
        res = await supabase.table("master_clients") \
            .select("*, leads(title, description, image_urls, client_priority), master_sessions(*)") \
            .eq("master_id", current_user.user_id) \
            .order("created_at", desc=True) \
            .execute()
        
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/clients/{client_id}/status")
async def update_client_status(
    client_id: str,
    data: ClientStatusUpdate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        res = await supabase.table("master_clients") \
            .update({"kanban_status": data.status}) \
            .eq("id", client_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Client not found")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clients")
async def create_manual_client(
    data: ManualClientCreate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        # 1. Create client
        client_data = {
            "master_id": current_user.user_id,
            "name": data.name,
            "contact_info": data.contact_info,
            "notes": data.notes,
            "source": "manual",
            "kanban_status": "new"
        }
        res = await supabase.table("master_clients").insert(client_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create client")
            
        client = res.data[0]
        
        # 2. Add session if date provided
        if data.session_date:
            await supabase.table("master_sessions").insert({
                "master_id": current_user.user_id,
                "client_id": client["id"],
                "session_date": data.session_date
            }).execute()
            
        return client
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
            # If exists and full_day payload, we delete it (toggle off)
            # UNLESS they are updating specific hours (is_full_day = false)
            if data.is_full_day and check.data[0].get("is_full_day", True):
                await supabase.table("master_days_off") \
                    .delete() \
                    .eq("id", check.data[0]["id"]) \
                    .execute()
                return {"status": "deleted"}
            else:
                # Update specific hours
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
            # Insert new
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

