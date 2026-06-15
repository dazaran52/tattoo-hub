from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from app.database import get_supabase_client
from supabase import Client
from typing import List, Optional

router = APIRouter(prefix="/api/client-portal", tags=["client-portal"])

class ClientProposalResponse(BaseModel):
    master_id: str
    master_name: str
    master_avatar: Optional[str]
    price_offer: int
    proposed_dates: str
    status: str
    chat_id: str

class ClientLeadResponse(BaseModel):
    id: str
    title: str
    description: str
    client_priority: str
    proposals: List[ClientProposalResponse]

@router.get("/leads/{lead_id}", response_model=ClientLeadResponse)
async def get_client_lead(
    lead_id: str,
    token: str = Query(...),
    supabase: Client = Depends(get_supabase_client)
):
    # Verify token
    lead_res = supabase.table("leads").select("*").eq("id", lead_id).eq("client_token", token).execute()
    if not lead_res.data:
        raise HTTPException(status_code=403, detail="Invalid token or lead not found")
    
    lead = lead_res.data[0]

    # Get proposals
    prop_res = supabase.table("lead_proposals").select("user_id, price_offer, proposed_dates, status").eq("lead_id", lead_id).execute()
    proposals_data = prop_res.data or []

    # Get master profiles
    master_ids = [p["user_id"] for p in proposals_data]
    users_dict = {}
    if master_ids:
        users_res = supabase.table("users").select("id, raw_user_meta_data").in_("id", master_ids).execute()
        for u in (users_res.data or []):
            users_dict[u["id"]] = u

    # Get chats
    chats_res = supabase.table("lead_chats").select("id, master_id").eq("lead_id", lead_id).execute()
    chats_dict = {c["master_id"]: c["id"] for c in (chats_res.data or [])}

    proposals_out = []
    for p in proposals_data:
        master_info = users_dict.get(p["user_id"], {})
        meta = master_info.get("raw_user_meta_data", {})
        proposals_out.append(ClientProposalResponse(
            master_id=p["user_id"],
            master_name=meta.get("name") or meta.get("telegram_username") or "Unknown Master",
            master_avatar=meta.get("avatar_url"),
            price_offer=p["price_offer"],
            proposed_dates=p["proposed_dates"],
            status=p["status"],
            chat_id=chats_dict.get(p["user_id"], "")
        ))

    return ClientLeadResponse(
        id=lead["id"],
        title=lead["title"],
        description=lead["description"],
        client_priority=lead.get("client_priority", "quality"),
        proposals=proposals_out
    )

@router.post("/leads/{lead_id}/proposals/{master_id}/accept")
async def accept_proposal(
    lead_id: str,
    master_id: str,
    token: str = Query(...),
    supabase: Client = Depends(get_supabase_client)
):
    # Verify token
    lead_res = supabase.table("leads").select("*").eq("id", lead_id).eq("client_token", token).execute()
    if not lead_res.data:
        raise HTTPException(status_code=403, detail="Invalid token")
    
    lead = lead_res.data[0]

    # Check if a proposal is already accepted
    existing_accepted = supabase.table("lead_proposals").select("id").eq("lead_id", lead_id).eq("status", "accepted").execute()
    if existing_accepted.data:
        raise HTTPException(status_code=400, detail="A proposal has already been accepted for this lead")

    # Get the proposal
    prop_res = supabase.table("lead_proposals").select("*").eq("lead_id", lead_id).eq("user_id", master_id).execute()
    if not prop_res.data:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    # Process Success Fee deduction
    price_credits = lead["price_credits"]
    
    # 1. Check master balance
    master_res = supabase.table("users").select("credits").eq("id", master_id).execute()
    if not master_res.data or master_res.data[0]["credits"] < price_credits:
        # Instead of failing silently, mark as failed or just return an error to client so they know.
        # But this is bad UX for client if master ran out of money. 
        # Ideally, we should check this before showing it to client, or freeze it at proposal time.
        # For now, if master doesn't have credits, we fail it.
        raise HTTPException(status_code=400, detail="Master no longer has enough credits")

    # 2. Deduct credits via RPC or update
    new_balance = master_res.data[0]["credits"] - price_credits
    supabase.table("users").update({"credits": new_balance}).eq("id", master_id).execute()

    # 3. Add transaction record
    supabase.table("transactions").insert({
        "user_id": master_id,
        "amount": -price_credits,
        "type": "lead_unlock",
        "status": "completed",
        "description": f"Success fee for lead {lead['title']}"
    }).execute()

    # 4. Accept proposal
    supabase.table("lead_proposals").update({"status": "accepted"}).eq("lead_id", lead_id).eq("user_id", master_id).execute()
    
    # 5. Reject others
    supabase.table("lead_proposals").update({"status": "rejected"}).eq("lead_id", lead_id).neq("user_id", master_id).execute()

    return {"success": True}
