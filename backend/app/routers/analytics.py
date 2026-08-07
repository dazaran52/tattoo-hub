from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_supabase_client
from supabase import Client
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

class DailyActivity(BaseModel):
    date: str
    spent: float
    bought: int

class AnalyticsResponse(BaseModel):
    total_spent_balance: float
    total_leads_bought: int
    activity_by_day: List[DailyActivity]

@router.get("", response_model=AnalyticsResponse)
async def get_analytics(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        # 1. Total leads acquired (accepted proposals)
        proposals_res = supabase.table("lead_proposals") \
            .select("id, created_at") \
            .eq("user_id", current_user.user_id) \
            .in_("status", ["accepted", "booked", "completed"]) \
            .execute()
            
        proposals = proposals_res.data or []
        total_leads = len(proposals)
        
        # 2. Total fees spent (marketplace fee transactions)
        fees_res = supabase.table("marketplace_fee_transactions") \
            .select("amount, created_at") \
            .eq("master_id", current_user.user_id) \
            .execute()
            
        fees = fees_res.data or []
        total_spent = sum(float(f.get("amount") or 0.0) for f in fees)
        
        # 3. Last 30 days map
        today = datetime.utcnow().date()
        days_map = {}
        for i in range(29, -1, -1):
            d = today - timedelta(days=i)
            days_map[d.isoformat()] = {"date": d.isoformat(), "spent": 0.0, "bought": 0}
            
        for p in proposals:
            dt_str = p.get("created_at", "")[:10]
            if dt_str in days_map:
                days_map[dt_str]["bought"] += 1
                
        for f in fees:
            dt_str = f.get("created_at", "")[:10]
            if dt_str in days_map:
                days_map[dt_str]["spent"] += float(f.get("amount") or 0.0)

        return {
            "total_spent_balance": round(total_spent, 2),
            "total_leads_bought": total_leads,
            "activity_by_day": list(days_map.values())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
