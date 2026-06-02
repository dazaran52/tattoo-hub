from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_supabase_client
from supabase import Client

router = APIRouter(prefix="/api/disputes", tags=["disputes"])

class DisputeCreate(BaseModel):
    lead_id: str
    reason: str
    screenshots: List[str] = []

class DisputeResponse(BaseModel):
    id: str
    lead_id: str
    user_id: str
    reason: str
    screenshots: List[str]
    status: str
    created_at: str

@router.post("", response_model=DisputeResponse)
async def create_dispute(
    dispute: DisputeCreate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Create a new dispute for a lead to request a refund.
    """
    try:
        # Verify the user actually unlocked the lead
        unlock_res = supabase.table("lead_unlocks") \
            .select("id") \
            .eq("user_id", current_user.user_id) \
            .eq("lead_id", dispute.lead_id) \
            .execute()
            
        if not unlock_res.data:
            raise HTTPException(status_code=400, detail="You have not unlocked this lead.")
            
        # Create dispute
        res = supabase.table("disputes").insert({
            "lead_id": dispute.lead_id,
            "user_id": current_user.user_id,
            "reason": dispute.reason,
            "screenshots": dispute.screenshots
        }).execute()
        
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create dispute.")
            
        # Admin notification
        try:
            admin_res = supabase.table("users").select("id").eq("is_admin", True).execute()
            for admin in (admin_res.data or []):
                supabase.table("notifications").insert({
                    "user_id": admin["id"],
                    "title": "Новый спор (Dispute)",
                    "message": f"Мастер подал жалобу на лид {dispute.lead_id}.",
                    "type": "system"
                }).execute()
        except Exception as e:
            print(f"Warning: Failed to create admin notification for dispute {res.data[0]['id']}: {e}")

        return res.data[0]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating dispute: {str(e)}"
        )

@router.get("", response_model=List[DisputeResponse])
async def get_my_disputes(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        res = supabase.table("disputes").select("*").eq("user_id", current_user.user_id).order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
