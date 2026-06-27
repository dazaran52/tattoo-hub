import json
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict
from app.database import get_supabase_client
from app.middleware.auth import get_current_user, AuthUser
from supabase import Client

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]

@router.post("/subscribe")
async def subscribe_to_push(subscription: PushSubscription, authorization: str = Header(None)):
    """Save user's push subscription."""
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    supabase = get_supabase_client()
    
    # Check if subscription already exists for this endpoint
    res = supabase.table("push_subscriptions").select("id").eq("endpoint", subscription.endpoint).execute()
    
    if len(res.data) > 0:
        return {"status": "already_subscribed"}
        
    # Insert new subscription
    data = {
        "user_id": user.user_id,
        "endpoint": subscription.endpoint,
        "p256dh": subscription.keys.get("p256dh", ""),
        "auth": subscription.keys.get("auth", "")
    }
    
    supabase.table("push_subscriptions").insert(data).execute()
    return {"status": "success"}

@router.delete("/unsubscribe")
async def unsubscribe_from_push(endpoint: str, authorization: str = Header(None)):
    """Remove user's push subscription."""
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    supabase = get_supabase_client()
    
    supabase.table("push_subscriptions").delete().eq("user_id", user.user_id).eq("endpoint", endpoint).execute()
    return {"status": "success"}

@router.get("")
async def get_notifications(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        res = supabase.table("notifications") \
            .select("*") \
            .eq("user_id", current_user.user_id) \
            .order("created_at", desc=True) \
            .execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        supabase.table("notifications") \
            .update({"is_read": True}) \
            .eq("id", notification_id) \
            .eq("user_id", current_user.user_id) \
            .execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/read-all")
async def mark_all_read(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        supabase.table("notifications") \
            .update({"is_read": True}) \
            .eq("user_id", current_user.user_id) \
            .eq("is_read", False) \
            .execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
