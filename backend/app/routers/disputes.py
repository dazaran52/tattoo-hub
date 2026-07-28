from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from supabase.client import Client
from app.dependencies import get_current_user, get_supabase_client, AuthUser

router = APIRouter(prefix="/disputes", tags=["Disputes"])

class DisputeCreate(BaseModel):
    lead_id: str
    reason: str
    screenshots: List[str] = []

@router.post("", status_code=status.HTTP_201_CREATED)
def create_dispute(
    payload: DisputeCreate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Create a new dispute for a lead (e.g. asking for refund).
    Must be the assigned master of the lead.
    """
    try:
        # Verify ownership
        lead_res = supabase.table("leads").select("assigned_master_id").eq("id", payload.lead_id).execute()
        if not lead_res.data:
            raise HTTPException(status_code=404, detail="Lead not found")
            
        lead = lead_res.data[0]
        if lead.get("assigned_master_id") != current_user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized. Only the assigned master can open a dispute.")

        # Verify no pending dispute exists
        existing_dispute_res = supabase.table("disputes").select("id").eq("lead_id", payload.lead_id).eq("user_id", current_user.user_id).eq("status", "pending").execute()
        if existing_dispute_res.data:
            raise HTTPException(status_code=409, detail="A pending dispute already exists for this lead.")

        # Insert dispute
        insert_res = supabase.table("disputes").insert({
            "lead_id": payload.lead_id,
            "user_id": current_user.user_id,
            "reason": payload.reason,
            "screenshots": payload.screenshots,
            "status": "pending"
        }).execute()
        
        if not insert_res.data:
            raise HTTPException(status_code=400, detail="Failed to create dispute")
            
        return {"success": True, "dispute": insert_res.data[0]}

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
