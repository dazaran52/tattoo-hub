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
    spent: int
    bought: int

class AnalyticsResponse(BaseModel):
    total_spent_balance: int
    total_leads_bought: int
    activity_by_day: List[DailyActivity]

@router.get("", response_model=AnalyticsResponse)
async def get_analytics(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        # 1. Total leads bought
        unlocks_res = supabase.table("lead_unlocks") \
            .select("unlocked_at, lead_id, leads(price_credits)") \
            .eq("user_id", current_user.user_id) \
            .execute()
            
        unlocks = unlocks_res.data or []
        total_leads = len(unlocks)
        
        # 2. Auctions won
        auctions_res = supabase.table("auctions") \
            .select("lead_id, current_price") \
            .eq("highest_bidder_id", current_user.user_id) \
            .eq("status", "completed") \
            .execute()
            
        auctions = {a["lead_id"]: a["current_price"] for a in (auctions_res.data or [])}
        
        # 3. Last 30 days map
        today = datetime.utcnow().date()
        days_map = {}
        for i in range(29, -1, -1):
            d = today - timedelta(days=i)
            days_map[d.isoformat()] = {"date": d.isoformat(), "spent": 0, "bought": 0}
            
        total_spent = 0
        
        for u in unlocks:
            dt = datetime.fromisoformat(u["unlocked_at"].replace("Z", "+00:00")[:19]).date()
            dt_str = dt.isoformat()
            
            # Determine price
            lead_id = u["lead_id"]
            if lead_id in auctions:
                price = auctions[lead_id]
            else:
                leads_data = u.get("leads")
                price = leads_data.get("price_credits", 0) if leads_data else 0
                
            total_spent += price
            if dt_str in days_map:
                days_map[dt_str]["bought"] += 1
                days_map[dt_str]["spent"] += price

        return {
            "total_spent_balance": total_spent,
            "total_leads_bought": total_leads,
            "activity_by_day": list(days_map.values())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
