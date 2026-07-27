from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from app.database import get_supabase_client
from supabase import Client
from typing import List, Optional
from decimal import Decimal

router = APIRouter(prefix="/api/client-portal", tags=["client-portal"])

class ClientProposalResponse(BaseModel):
    master_id: str
    master_name: str
    master_avatar: Optional[str]
    price_offer: Decimal
    proposed_dates: str
    status: str
    chat_id: str | None = None
    offer_currency: str = "CZK"

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
    prop_res = supabase.table("lead_proposals").select("user_id, price_offer, proposed_dates, status, offer_currency").eq("lead_id", lead_id).execute()
    proposals_data = prop_res.data or []

    # Get master profiles
    master_ids = [p["user_id"] for p in proposals_data]
    users_dict = {}
    if master_ids:
        users_res = supabase.table("users").select("id, display_name, username, avatar_url").in_("id", master_ids).execute()
        users_dict = {u["id"]: u for u in (users_res.data or [])}

    # Get chats
    client_id = lead.get("client_id")
    client_session_id = lead.get("client_session_id") or lead.get("client_token")
    if client_id:
        chats_res = supabase.table("lead_chats").select("id, master_id").eq("client_id", client_id).execute()
    else:
        chats_res = supabase.table("lead_chats").select("id, master_id").eq("client_session_id", client_session_id).execute()
    chats_dict = {c["master_id"]: c["id"] for c in (chats_res.data or [])}

    proposals_out = []
    for p in proposals_data:
        master_info = users_dict.get(p["user_id"], {})
        is_selected = (
            p["status"] in {"accepted", "booked", "completed"}
            and lead.get("assigned_master_id") == p["user_id"]
        )
        effective_status = p["status"] if is_selected or p["status"] not in {
            "accepted", "booked", "completed"
        } else "pending"
        proposals_out.append(ClientProposalResponse(
            master_id=p["user_id"],
            master_name=master_info.get("display_name") or master_info.get("username") or "Unknown Master",
            master_avatar=master_info.get("avatar_url"),
            price_offer=p["price_offer"],
            proposed_dates=p["proposed_dates"],
            status=effective_status,
            chat_id=(
                chats_dict.get(p["user_id"])
                if is_selected
                else None
            ),
            offer_currency=p.get("offer_currency") or "CZK",
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

    # Charge the snapshotted fee and accept/reject proposals atomically in PostgreSQL.
    try:
        acceptance = supabase.rpc("accept_marketplace_proposal", {
            "p_lead_id": lead_id,
            "p_master_id": master_id,
            "p_client_token": token,
        }).execute()
    except Exception as exc:
        message = str(exc)
        if "INSUFFICIENT_BALANCE" in message:
            raise HTTPException(status_code=409, detail="У мастера недостаточно средств для комиссии") from exc
        if "PROPOSAL_ALREADY_ACCEPTED" in message:
            raise HTTPException(status_code=409, detail="Мастер уже выбран") from exc
        raise HTTPException(status_code=400, detail=message) from exc
    if not acceptance.data or not acceptance.data.get("success"):
        raise HTTPException(status_code=400, detail="Не удалось выбрать мастера")

    if not acceptance.data.get("already_charged"):
        from app.services.notifications import send_push_notification
        import asyncio
        asyncio.create_task(asyncio.to_thread(
            send_push_notification,
            master_id,
            "Сеанс подтвержден!",
            f"Клиент выбрал вас для заявки '{lead.get('title')}'.",
            "/dashboard?tab=messages",
        ))

    return {
        "success": True,
        "chat_id": acceptance.data.get("chat_id"),
        "already_charged": acceptance.data.get("already_charged", False),
    }
