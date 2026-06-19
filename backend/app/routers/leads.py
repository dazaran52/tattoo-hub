from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.middleware.auth import get_current_user, AuthUser, get_optional_user
from app.database import get_supabase_client, get_async_supabase_client
from supabase import Client
from supabase._async.client import AsyncClient
from typing import List, Optional
import datetime
import uuid
from app.utils.currency import convert_currency, calculate_unlock_price_base

router = APIRouter(prefix="/api/leads", tags=["leads"])

class LeadResponse(BaseModel):
    id: str
    title: str
    description: str
    contacts: str
    is_unlocked: bool
    image_urls: List[str] = []
    created_at: str | None = None
    country_id: str | None = None
    city_id: str | None = None
    trust_score: int = 100
    unlock_status: str | None = None
    unlock_count: int = 0
    max_unlocks: int = 3
    client_priority: str = 'quality'
    lowest_bid: int | None = None
    proposal_status: str | None = None
    chat_id: str | None = None
    client_budget: float | None = None
    client_currency: str | None = None
    display_budget: str | None = None
    is_negotiable_budget: bool = False
    unlock_price_local: float | None = None
    master_currency: str | None = None

class UnlockResponse(BaseModel):
    contacts: str
    is_unlocked: bool
    current_credits: int

@router.get("", response_model=List[LeadResponse])
def get_leads(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get all leads. Contacts are masked if the user hasn't unlocked them.
    Leads are limited to 3 unlocks maximum.
    """
    try:
        # Fetch current master's currency
        user_res = supabase.table("users").select("currency").eq("id", current_user.user_id).execute()
        master_currency = user_res.data[0].get("currency", "CZK") if user_res.data else "CZK"

        # Fetch all leads
        leads_res = supabase.table("leads").select("*, cities(country_id)").order("created_at", desc=True).execute()
        leads = leads_res.data or []

        # Fetch ALL unlocks
        all_unlocks_res = supabase.table("lead_unlocks").select("lead_id, user_id, status").execute()
        all_unlocks = all_unlocks_res.data or []

        # Fetch ALL proposals for lowest_bid calculation and checking own proposals
        proposals_res = supabase.table("lead_proposals").select("lead_id, user_id, price_offer, status").execute()
        proposals = proposals_res.data or []
        lowest_bids = {}
        my_proposals = {}
        
        for p in proposals:
            lid = p["lead_id"]
            if p["user_id"] == current_user.user_id:
                my_proposals[lid] = p["status"]
                
            if lid not in lowest_bids or p["price_offer"] < lowest_bids[lid]:
                lowest_bids[lid] = p["price_offer"]

        # Fetch own chats
        chats_res = supabase.table("lead_chats").select("lead_id, id").eq("master_id", current_user.user_id).execute()
        my_chats = {c["lead_id"]: c["id"] for c in (chats_res.data or [])}
        
        unlocked_by_me = {u["lead_id"]: u["status"] for u in all_unlocks if u["user_id"] == current_user.user_id}
        
        # Calculate unlocks count per lead
        unlocks_count = {}
        for u in all_unlocks:
            lid = u["lead_id"]
            unlocks_count[lid] = unlocks_count.get(lid, 0) + 1

        # Fetch active auctions to hide contacts
        auctions_res = supabase.table("auctions") \
            .select("lead_id") \
            .eq("status", "active") \
            .execute()
        auction_lead_ids = {a["lead_id"] for a in (auctions_res.data or [])}

        processed_leads = []
        for lead in leads:
            is_unlocked = lead["id"] in unlocked_by_me
            lead_unlock_count = unlocks_count.get(lead["id"], 0)
            
            # If lead has been unlocked by 3 or more masters, and this master hasn't unlocked it, hide it.
            if lead_unlock_count >= 3 and not is_unlocked:
                continue
                
            unlock_status = unlocked_by_me.get(lead["id"]) if is_unlocked else None
            
            # Hide contacts if lead is currently on auction, even if unlocked
            if lead["id"] in auction_lead_ids:
                contacts = "******** [Лид на аукционе]"
            else:
                contacts = lead["contacts"] if is_unlocked else "******** [Skryto. Odemkněte za credits]"
                
            # Format display budget
            display_budget = None
            if lead.get("is_negotiable_budget"):
                display_budget = "Договорная цена"
            elif lead.get("client_budget") and lead.get("client_currency"):
                orig_budget = lead["client_budget"]
                orig_curr = lead["client_currency"]
                if orig_curr.upper() == master_currency.upper():
                    display_budget = f"{orig_budget} {orig_curr}"
                else:
                    try:
                        converted = convert_currency(orig_budget, orig_curr, master_currency)
                        display_budget = f"{orig_budget} {orig_curr} (~{converted} {master_currency})"
                    except ValueError:
                        display_budget = f"{orig_budget} {orig_curr}"
            
            # Calculate dynamic unlock price based on the master's currency
            base_price_eur = float(lead.get("base_unlock_price_eur", 2.0))
            try:
                local_unlock_price = convert_currency(base_price_eur, "EUR", master_currency)
            except ValueError:
                local_unlock_price = base_price_eur
                
            processed_leads.append(LeadResponse(
                id=lead["id"],
                title=lead["title"],
                description=lead["description"],
                contacts=contacts,
                is_unlocked=is_unlocked,
                image_urls=lead.get("image_urls") or [],
                created_at=lead.get("created_at"),
                country_id=lead.get("country_id") or (lead.get("cities", {}).get("country_id") if lead.get("cities") else None),
                city_id=lead.get("city_id"),
                trust_score=lead.get("trust_score", 100),
                unlock_status=unlock_status,
                unlock_count=lead_unlock_count,
                max_unlocks=3,
                client_priority=lead.get("client_priority", "quality"),
                lowest_bid=lowest_bids.get(lead["id"]) if lead.get("client_priority") == 'cheap' else None,
                proposal_status=my_proposals.get(lead["id"]),
                chat_id=my_chats.get(lead["id"]),
                client_budget=lead.get("client_budget"),
                client_currency=lead.get("client_currency"),
                display_budget=display_budget,
                is_negotiable_budget=lead.get("is_negotiable_budget", False),
                unlock_price_local=float(local_unlock_price),
                master_currency=master_currency
            ))
            
        return processed_leads

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching leads: {str(e)}"
        )


@router.post("/{lead_id}/unlock", response_model=UnlockResponse)
async def unlock_lead(
    lead_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """
    Unlock a lead by deducting credits.
    """
    try:
        # Check if already unlocked
        unlock_check = await supabase.table("lead_unlocks") \
            .select("id") \
            .eq("user_id", current_user.user_id) \
            .eq("lead_id", lead_id) \
            .execute()
            
        # Get lead
        lead_res = await supabase.table("leads").select("*").eq("id", lead_id).single().execute()
        if not lead_res.data:
            raise HTTPException(status_code=404, detail="Lead not found.")
        
        lead = lead_res.data
        
        # Fetch current master's currency to calculate local unlock price
        user_res = await supabase.table("users").select("currency").eq("id", current_user.user_id).execute()
        master_currency = user_res.data[0].get("currency", "CZK") if user_res.data else "CZK"
        
        base_price_eur = float(lead.get("base_unlock_price_eur", 2.0))
        try:
            local_unlock_price = convert_currency(base_price_eur, "EUR", master_currency)
        except ValueError:
            local_unlock_price = base_price_eur
        
        # Call the atomic RPC function
        try:
            rpc_res = await supabase.rpc(
                "unlock_lead",
                {"p_user_id": current_user.user_id, "p_lead_id": lead_id, "p_deduct_amount": float(local_unlock_price)}
            ).execute()
        except Exception as e:
            if "INSUFFICIENT_CREDITS" in str(e):
                raise HTTPException(status_code=400, detail="INSUFFICIENT_CREDITS")
            elif "MAX_UNLOCKS_REACHED" in str(e):
                raise HTTPException(status_code=400, detail="MAX_UNLOCKS_REACHED")
            elif "Already unlocked" in str(e):
                # We need to fetch contacts since RPC might just return the text
                pass
            raise HTTPException(status_code=400, detail=str(e))
            
        data = rpc_res.data
        if not data or not data.get("success"):
            raise HTTPException(status_code=400, detail="Failed to unlock lead")
            
        return UnlockResponse(
            contacts=data.get("contacts", "Hidden"),
            is_unlocked=True,
            current_credits=data.get("new_credits", 0)
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error unlocking lead: {str(e)}"
        )


class LeadStatusUpdate(BaseModel):
    status: str

@router.patch("/{lead_id}/status")
def update_lead_status(
    lead_id: str,
    payload: LeadStatusUpdate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Update lead status by the master who unlocked it."""
    valid_statuses = ['new', 'contacted', 'no_answer', 'fake', 'appointment_set', 'came']
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    try:
        # Update unlock status
        res = supabase.table("lead_unlocks") \
            .update({"status": payload.status}) \
            .eq("lead_id", lead_id) \
            .eq("user_id", current_user.user_id) \
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Unlock record not found")
            
        # Recalculate lead trust score
        unlocks_res = supabase.table("lead_unlocks").select("status").eq("lead_id", lead_id).execute()
        unlocks = unlocks_res.data or []
        
        base_score = 100
        for u in unlocks:
            s = u["status"]
            if s == "fake": base_score -= 50
            elif s == "no_answer": base_score -= 20
            elif s == "came": base_score += 50
            elif s == "appointment_set": base_score += 20
            
        final_score = max(0, min(100, base_score))
        
        supabase.table("leads").update({"trust_score": final_score}).eq("id", lead_id).execute()
        
        return {"success": True, "trust_score": final_score}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class MasterLeadCreate(BaseModel):
    title: str
    description: str
    contacts: str
    city_id: str
    country_id: str
    price_credits: int = 50

@router.post("/master")
def create_master_lead(
    lead_data: MasterLeadCreate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Allow a master to create their own lead (C2C)."""
    try:
        # Insert lead (exclude country_id as it doesn't exist in DB)
        data = lead_data.model_dump()
        data.pop("country_id", None)
        lead_insert = supabase.table("leads").insert(data).execute()
        if not lead_insert.data:
            raise HTTPException(status_code=400, detail="Failed to create lead")
            
        new_lead = lead_insert.data[0]
        
        # Auto-unlock for the creator so they own it
        unlock_insert = supabase.table("lead_unlocks").insert({
            "user_id": current_user.user_id,
            "lead_id": new_lead["id"],
            "status": "new"
        }).execute()
        
        return new_lead
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ClientLeadCreate(BaseModel):
    description: str
    style: str | None = None
    location: str | None = None
    size: str | None = None
    budget: str | None = None
    budget_val: int | None = None
    budget_currency: str | None = None
    client_priority: str | None = None
    city: str | None = None
    country_id: str | None = None
    name: str | None = None
    contact: str
    is_negotiable_budget: bool = False
    image_urls: list[str] | None = None

@router.post("/client")
async def create_client_lead(
    lead_data: ClientLeadCreate,
    current_user: Optional[AuthUser] = Depends(get_optional_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Public endpoint for clients submitting leads via the Landing Page."""
    try:
        # Format the lead for the DB
        title = f"{lead_data.style or 'Тату'} {lead_data.location or ''} {lead_data.size or ''}".strip()
        if not title:
            title = "Новая заявка на тату"
            
        full_description = f"{lead_data.description}\n\n"
        if lead_data.budget:
            full_description += f"Бюджет: {lead_data.budget}\n"
        if lead_data.city:
            full_description += f"Город: {lead_data.city}\n"
            
        contacts = f"Имя: {lead_data.name or 'Без имени'}, Контакт: {lead_data.contact}"

        # Calculate dynamic price based on base currency (EUR)
        base_unlock_price_eur = calculate_unlock_price_base(
            client_budget=lead_data.budget_val if not lead_data.is_negotiable_budget else None,
            client_currency=lead_data.budget_currency
        )

        client_token = str(uuid.uuid4())

        db_lead = {
            "title": title[:255],
            "description": full_description,
            "contacts": contacts,
            "base_unlock_price_eur": base_unlock_price_eur,
            "client_priority": lead_data.client_priority or 'quality',
            "client_token": client_token,
            "trust_score": 100,
            "client_budget": lead_data.budget_val if not lead_data.is_negotiable_budget else None,
            "client_currency": lead_data.budget_currency,
            "is_negotiable_budget": lead_data.is_negotiable_budget,
            "country_id": lead_data.country_id,
            "city_id": None, # City UUID lookup logic needs implementation later if needed
            "image_urls": lead_data.image_urls or []
        }
        
        if current_user:
            db_lead["client_id"] = current_user.user_id

        import asyncio
        max_retries = 3
        for attempt in range(max_retries):
            try:
                res = await supabase.table("leads").insert(db_lead).execute()
                if res.data:
                    return {"success": True, "lead": res.data[0]}
                if attempt == max_retries - 1:
                    raise HTTPException(status_code=400, detail="Failed to create lead")
            except Exception as e:
                # PostgrestAPIError or similar might be raised
                if "foreign_key_violation" in str(e) or "23503" in str(e):
                    if attempt < max_retries - 1:
                        await asyncio.sleep(0.5)
                        continue
                if attempt == max_retries - 1:
                    raise e
            
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/client")
async def get_client_leads(
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Get leads created by the current client."""
    try:
        res = await supabase.table("leads") \
            .select("*") \
            .eq("client_id", current_user.user_id) \
            .order("created_at", desc=True) \
            .execute()
        
        # For each lead, fetch how many proposals/bids it has
        leads = res.data or []
        if not leads:
            return []
            
        lead_ids = [l["id"] for l in leads]
        
        # Get count of proposals for each lead
        props_res = await supabase.table("lead_proposals") \
            .select("lead_id, status") \
            .in_("lead_id", lead_ids) \
            .execute()
            
        proposals = props_res.data or []
        proposals_count = {}
        for p in proposals:
            lid = p["lead_id"]
            proposals_count[lid] = proposals_count.get(lid, 0) + 1
            
        out = []
        for lead in leads:
            out.append({
                "id": lead["id"],
                "title": lead["title"],
                "description": lead["description"],
                "client_priority": lead.get("client_priority", "quality"),
                "client_token": lead.get("client_token"),
                "created_at": lead.get("created_at"),
                "proposal_count": proposals_count.get(lead["id"], 0)
            })
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ClientLeadUpdate(BaseModel):
    description: str | None = None
    style: str | None = None
    location: str | None = None
    size: str | None = None
    budget: str | None = None
    budget_val: int | None = None
    budget_currency: str | None = None
    client_priority: str | None = None
    city: str | None = None
    country_id: str | None = None
    name: str | None = None
    contact: str | None = None
    is_negotiable_budget: bool | None = None
    image_urls: list[str] | None = None
    status: str | None = None

@router.patch("/client/{lead_id}")
async def update_client_lead(
    lead_id: str,
    update_data: ClientLeadUpdate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        data = update_data.model_dump(exclude_unset=True)
        if not data:
            return {"success": True}
        res = await supabase.table("leads").update(data).eq("id", lead_id).eq("client_id", current_user.user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Lead not found or no permission")
        return {"success": True, "lead": res.data[0]}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/client/{lead_id}")
async def delete_client_lead(
    lead_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        res = await supabase.table("leads").delete().eq("id", lead_id).eq("client_id", current_user.user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Lead not found or no permission")
        return {"success": True}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))


class ProposalCreate(BaseModel):
    price_offer: int
    proposed_dates: str

@router.post("/{lead_id}/proposals")
def create_proposal(
    lead_id: str,
    proposal: ProposalCreate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Submit a proposal (price & dates) and create a chat. Freezes credits implicitly by checking balance.
    """
    try:
        # Check if lead exists and get price
        lead_res = supabase.table("leads").select("price_credits, client_token").eq("id", lead_id).execute()
        if not lead_res.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        lead_data = lead_res.data[0]

        # Check balance
        user_res = supabase.table("users").select("credits").eq("id", current_user.user_id).execute()
        if not user_res.data or user_res.data[0]["credits"] < lead_data["price_credits"]:
            raise HTTPException(status_code=400, detail="INSUFFICIENT_CREDITS")

        db_proposal = {
            "lead_id": lead_id,
            "user_id": current_user.user_id,
            "price_offer": proposal.price_offer,
            "proposed_dates": proposal.proposed_dates,
            "status": "pending"
        }

        # Use upsert in case they update their proposal
        insert_res = supabase.table("lead_proposals").upsert(db_proposal, on_conflict="lead_id,user_id").execute()
        if not insert_res.data:
            raise HTTPException(status_code=400, detail="Failed to submit proposal")

        # Create chat if not exists
        try:
            supabase.table("lead_chats").insert({
                "lead_id": lead_id,
                "master_id": current_user.user_id,
                "client_session_id": lead_data["client_token"]
            }).execute()
        except Exception as e:
            # ignore if chat already exists (unique constraint)
            pass

        return {"success": True, "proposal": insert_res.data[0]}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

class ProposalStatusUpdate(BaseModel):
    status: str

@router.put("/{lead_id}/proposals/status")
def update_proposal_status(
    lead_id: str,
    payload: ProposalStatusUpdate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Update the status of an existing proposal for a master (e.g. booked, completed).
    Clients update status to 'accepted' via the client_portal API.
    """
    valid_statuses = ['pending', 'accepted', 'rejected', 'booked', 'completed']
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    try:
        res = supabase.table("lead_proposals").update({
            "status": payload.status
        }).eq("lead_id", lead_id).eq("user_id", current_user.user_id).execute()

        if not res.data:
            raise HTTPException(status_code=404, detail="Proposal not found")

        return {"success": True, "proposal": res.data[0]}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

