from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, BackgroundTasks, Body
from pydantic import BaseModel
from app.middleware.auth import get_current_user, AuthUser, get_optional_user
from app.database import get_supabase_client, get_async_supabase_client
from supabase import Client
from supabase._async.client import AsyncClient
from app.services.mail import send_transactional_email
from app.services.notifications import send_push_notification
from typing import List, Optional
import datetime
import uuid
from app.utils.currency import convert_currency, calculate_unlock_price_base
from app.services.marketplace import (
    MAX_PROPOSALS_PER_LEAD,
    calculate_success_fee,
    ensure_master_can_access_marketplace,
    ensure_proposal_slot_available,
    ensure_proposal_status_transition,
)
from decimal import Decimal

router = APIRouter(prefix="/api/leads", tags=["leads"])

class LeadResponse(BaseModel):
    id: str
    title: str
    description: str
    contacts: str
    is_unlocked: bool
    image_urls: List[str] = []
    created_at: str | None = None
    client_id: str | None = None
    client_last_seen: str | None = None
    creator_master_id: str | None = None
    creator_master_last_seen: str | None = None
    country_id: str | None = None
    city_id: str | None = None
    style: str | None = None
    body_place: str | None = None
    size: str | None = None
    session_date: str | None = None
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
    proposal_count: int = 0
    max_proposals: int = MAX_PROPOSALS_PER_LEAD
    proposals: list[dict] = []

class UnlockResponse(BaseModel):
    contacts: str
    is_unlocked: bool
    current_credits: int

@router.get("/marketplace/my-shared", response_model=List[LeadResponse])
async def get_my_shared_leads(
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Return leads created by the master (B2B leads) and their proposals."""
    try:
        user_res = await supabase.table("users").select("currency").eq("id", current_user.user_id).single().execute()
        master_currency = (user_res.data or {}).get("currency") or "CZK"

        raw_res = await supabase.table("leads") \
            .select("*, cities(country_id)") \
            .eq("creator_master_id", current_user.user_id) \
            .order("created_at", desc=True) \
            .execute()
        
        leads = raw_res.data or []
        lead_ids = [lead["id"] for lead in leads]
        
        proposals = []
        if lead_ids:
            proposal_res = await supabase.table("lead_proposals").select(
                "*, users!lead_proposals_user_id_fkey(full_name, avatar_url, badge_tier)"
            ).in_("lead_id", lead_ids).execute()
            proposals = proposal_res.data or []
            
        proposal_counts: dict[str, int] = {}
        for proposal in proposals:
            proposal_counts[proposal["lead_id"]] = proposal_counts.get(proposal["lead_id"], 0) + 1

        processed = []
        for lead in leads:
            lead_dict = {**lead}
            # Add proposals specifically for the creator to view
            lead_dict["proposals"] = [p for p in proposals if p["lead_id"] == lead["id"]]
            lead_dict["proposal_count"] = proposal_counts.get(lead["id"], 0)
            lead_dict["max_proposals"] = MAX_PROPOSALS_PER_LEAD
            lead_dict["master_currency"] = master_currency
            
            budget = lead.get("client_budget")
            budget_currency = lead.get("client_currency") or "CZK"
            lead_dict["display_budget"] = (
                f"{budget} {budget_currency}" if budget else "По договоренности"
            )
            if lead_dict.get("cities"):
                lead_dict["country_id"] = lead_dict["cities"].get("country_id")
            
            # Since creator_master_id is the owner, contacts are always visible to them
            lead_dict["is_unlocked"] = True
            processed.append(lead_dict)

        return processed
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/marketplace", response_model=List[LeadResponse])
async def get_marketplace_leads(
    response: Response,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Return marketplace leads only to masters with MVP access verification."""
    try:
        user_res = await supabase.table("users").select(
            "role, is_verified_master, currency"
        ).eq("id", current_user.user_id).single().execute()
        try:
            ensure_master_can_access_marketplace(user_res.data or {})
        except ValueError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc

        seven_days_ago = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)).isoformat()
        raw_res = await supabase.table("leads") \
            .select("*, cities(country_id), users!leads_client_id_fkey(id, last_seen)") \
            .neq("status", "closed") \
            .gte("created_at", seven_days_ago) \
            .order("created_at", desc=True) \
            .limit(2000) \
            .execute()
        raw_leads = raw_res.data or []
        
        rejected_res = await supabase.table("lead_proposals").select("lead_id").eq("user_id", current_user.user_id).eq("status", "rejected").execute()
        rejected_lead_ids = {p["lead_id"] for p in (rejected_res.data or [])}
        
        leads = [
            lead for lead in raw_leads
            if not lead.get("is_personal")
            and lead["id"] not in rejected_lead_ids
            and (
                lead.get("assigned_master_id") is None
                or lead.get("assigned_master_id") == current_user.user_id
            )
        ]
        paginated_leads = leads[offset:offset + limit]
        response.headers["X-Has-More"] = "true" if len(leads) > offset + limit else "false"

        lead_ids = [lead["id"] for lead in paginated_leads]
        proposals = []
        if lead_ids:
            proposal_res = await supabase.table("lead_proposals").select(
                "lead_id, user_id, status, price_offer"
            ).in_("lead_id", lead_ids).execute()
            proposals = proposal_res.data or []

        proposal_counts: dict[str, int] = {}
        my_proposals: dict[str, dict] = {}
        for proposal in proposals:
            proposal_counts[proposal["lead_id"]] = proposal_counts.get(proposal["lead_id"], 0) + 1
            if proposal["user_id"] == current_user.user_id:
                my_proposals[proposal["lead_id"]] = proposal

        chats: dict[str, str] = {}
        accepted_ids = [
            lead_id for lead_id, proposal in my_proposals.items()
            if proposal.get("status") in {"accepted", "booked", "completed"}
            and any(
                lead["id"] == lead_id
                and lead.get("assigned_master_id") == current_user.user_id
                for lead in paginated_leads
            )
        ]
        if accepted_ids:
            chat_res = await supabase.table("lead_chats").select("lead_id, id").eq(
                "master_id", current_user.user_id
            ).in_("lead_id", accepted_ids).execute()
            chats = {chat["lead_id"]: chat["id"] for chat in chat_res.data or []}

        master_currency = (user_res.data or {}).get("currency") or "CZK"
        processed = []
        for lead in paginated_leads:
            own_proposal = my_proposals.get(lead["id"])
            accepted = (
                own_proposal is not None
                and own_proposal.get("status") in {"accepted", "booked", "completed"}
                and lead.get("assigned_master_id") == current_user.user_id
            )
            lead_dict = dict(lead)
            lead_dict["is_unlocked"] = accepted
            lead_dict["contacts"] = lead.get("contacts") if accepted else "Контакт скрыт до выбора мастера"
            lead_dict["proposal_status"] = own_proposal.get("status") if own_proposal else None
            lead_dict["chat_id"] = chats.get(lead["id"]) if accepted else None
            lead_dict["unlock_count"] = proposal_counts.get(lead["id"], 0)
            lead_dict["max_unlocks"] = MAX_PROPOSALS_PER_LEAD
            lead_dict["proposal_count"] = proposal_counts.get(lead["id"], 0)
            lead_dict["max_proposals"] = MAX_PROPOSALS_PER_LEAD
            lead_dict["master_currency"] = master_currency
            lead_dict["unlock_price_local"] = 0
            budget = lead.get("client_budget")
            budget_currency = lead.get("client_currency") or "CZK"
            lead_dict["display_budget"] = (
                f"{budget} {budget_currency}" if budget else "По договоренности"
            )
            if lead_dict.get("cities"):
                lead_dict["country_id"] = lead_dict["cities"].get("country_id")
            if lead_dict.get("users"):
                lead_dict["client_last_seen"] = lead_dict["users"].get("last_seen")
            processed.append(lead_dict)
        return processed
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc



@router.get("/personal", response_model=List[LeadResponse])
def get_personal_leads(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get personal CRM leads for the current master."""
    try:
        # Fetch current master's currency
        user_res = supabase.table("users").select("currency").eq("id", current_user.user_id).execute()
        master_currency = user_res.data[0].get("currency", "CZK") if user_res.data else "CZK"

        leads_res = supabase.table("leads") \
            .select("*, cities(country_id)") \
            .eq("assigned_master_id", current_user.user_id) \
            .order("created_at", desc=True) \
            .execute()

        leads = leads_res.data or []

        processed_leads = []
        for lead in leads:
            # Assignment is the authorization boundary for direct/personal CRM leads.
            is_unlocked = True
            unlock_status = lead.get("status")
            contacts = lead["contacts"]

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
                    display_budget = f"{orig_budget} {orig_curr}"

            # Calculate dynamic unlock price based on the master's currency
            base_price_eur = float(lead.get("base_unlock_price_eur", 2.0))
            local_unlock_price = base_price_eur

            processed_leads.append({
                **lead,
                "contacts": contacts,
                "city_id": lead.get("city_id"),
                "country_id": lead.get("cities", {}).get("country_id") if lead.get("cities") else lead.get("country_id"),
                "is_unlocked": is_unlocked,
                "unlock_status": unlock_status,
                "price_credits": local_unlock_price,
                "unlock_price_local": local_unlock_price,
                "master_currency": master_currency,
                "lowest_bid": None,
                "my_proposal_status": lead.get("status", "new"),
                "my_chat_id": None,
                "display_budget": display_budget
            })

        return processed_leads
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[LeadResponse])
def get_leads(
    response: Response,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Get legacy marketplace feed with contacts available only after selection.
    """
    try:
        user_res = supabase.table("users").select(
            "role, is_verified_master, currency"
        ).eq("id", current_user.user_id).execute()
        profile = user_res.data[0] if user_res.data else {}
        try:
            ensure_master_can_access_marketplace(profile)
        except ValueError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc
        master_currency = profile.get("currency", "CZK")

        # Fetch all public leads (and exclusive paid leads) within 7 days
        seven_days_ago = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)).isoformat()
        raw_res = supabase.table("leads").select("*, cities(country_id)").neq("status", "closed").gte("created_at", seven_days_ago).order("created_at", desc=True).limit(2000).execute()
        raw_leads = raw_res.data or []
        
        rejected_res = supabase.table("lead_proposals").select("lead_id").eq("user_id", current_user.user_id).eq("status", "rejected").execute()
        rejected_lead_ids = {p["lead_id"] for p in (rejected_res.data or [])}
        
        leads = [
            l for l in raw_leads
            if l["id"] not in rejected_lead_ids
            and (l.get("assigned_master_id") is None or (l.get("assigned_master_id") == current_user.user_id and not l.get("is_personal", False)))
        ]

        paginated_leads = leads[offset:offset+limit]
        has_more = len(leads) > offset + limit
        response.headers["X-Has-More"] = "true" if has_more else "false"

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

        proposal_counts: dict[str, int] = {}
        for proposal in proposals:
            lead_id = proposal["lead_id"]
            proposal_counts[lead_id] = proposal_counts.get(lead_id, 0) + 1

        # Fetch last_seen for clients and creators
        user_ids_to_fetch = set()
        for lead in paginated_leads:
            if lead.get("client_id"):
                user_ids_to_fetch.add(lead["client_id"])
            if lead.get("creator_master_id"):
                user_ids_to_fetch.add(lead["creator_master_id"])
        
        last_seen_map = {}
        if user_ids_to_fetch:
            users_res = supabase.table("users").select("id, last_seen").in_("id", list(user_ids_to_fetch)).execute()
            for u in (users_res.data or []):
                last_seen_map[u["id"]] = u.get("last_seen")

        processed_leads = []
        for lead in paginated_leads:
            proposal_status = my_proposals.get(lead["id"])
            is_unlocked = (
                proposal_status in {"accepted", "booked", "completed"}
                and lead.get("assigned_master_id") == current_user.user_id
            )
            lead_proposal_count = proposal_counts.get(lead["id"], 0)
            unlock_status = proposal_status

            contacts = lead["contacts"] if is_unlocked else "Контакт скрыт до выбора мастера"

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
                        converted = convert_currency(orig_budget, orig_curr, master_currency, supabase=supabase)
                        display_budget = f"{orig_budget} {orig_curr} (~{converted} {master_currency})"
                    except ValueError:
                        display_budget = f"{orig_budget} {orig_curr}"

            # Calculate dynamic unlock price based on the master's currency
            base_price_eur = float(lead.get("base_unlock_price_eur", 2.0))
            try:
                local_unlock_price = convert_currency(base_price_eur, "EUR", master_currency, supabase=supabase)
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
                client_id=lead.get("client_id"),
                client_last_seen=last_seen_map.get(lead.get("client_id")),
                creator_master_id=lead.get("creator_master_id"),
                creator_master_last_seen=last_seen_map.get(lead.get("creator_master_id")),
                country_id=lead.get("country_id") or (lead.get("cities", {}).get("country_id") if lead.get("cities") else None),
                city_id=lead.get("city_id"),
                style=lead.get("style"),
                body_place=lead.get("body_place"),
                size=lead.get("size"),
                session_date=lead.get("session_date"),
                trust_score=lead.get("trust_score", 100),
                unlock_status=unlock_status,
                unlock_count=lead_proposal_count,
                max_unlocks=MAX_PROPOSALS_PER_LEAD,
                client_priority=lead.get("client_priority", "quality"),
                lowest_bid=lowest_bids.get(lead["id"]) if lead.get("client_priority") == 'cheap' else None,
                proposal_status=proposal_status,
                chat_id=my_chats.get(lead["id"]) if is_unlocked else None,
                client_budget=lead.get("client_budget"),
                client_currency=lead.get("client_currency"),
                display_budget=display_budget,
                is_negotiable_budget=lead.get("is_negotiable_budget", False),
                unlock_price_local=0,
                master_currency=master_currency
            ))

        return processed_leads

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching leads: {str(e)}"
        )



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
    """Allow a master to create their own lead (C2C) and list on marketplace."""
    try:
        # Insert lead (exclude country_id as it doesn't exist in DB)
        data = lead_data.model_dump()
        data.pop("country_id", None)
        data["creator_master_id"] = current_user.user_id
        data["status"] = "new"
        data["is_personal"] = False
        data["client_token"] = str(uuid.uuid4())

        lead_insert = supabase.table("leads").insert(data).execute()
        if not lead_insert.data:
            raise HTTPException(status_code=400, detail="Failed to create lead")

        new_lead = lead_insert.data[0]

        # Also create a client record in CRM for the master who shared the lead
        try:
            client_data = {
                "master_id": current_user.user_id,
                "name": data["title"],
                "contact_info": data["contacts"],
                "phone": data["contacts"],
                "notes": data.get("description", ""),
                "source": "marketplace",
                "kanban_status": "marketplace",
                "lead_id": new_lead["id"]
            }
            supabase.table("master_clients").insert(client_data).execute()
        except Exception as client_err:
            print(f"Warning: Failed to auto-create CRM client for master lead: {client_err}")

        return new_lead
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/master/{lead_id}/sell_b2b")
async def sell_lead_b2b(
    lead_id: str,
    price_credits: int = Body(..., embed=True),
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Convert a direct lead in CRM to a B2B marketplace lead."""
    lead_res = await supabase.table("leads").select("*").eq("id", lead_id).eq("master_id", current_user.user_id).execute()
    if not lead_res.data:
        raise HTTPException(status_code=404, detail="LEAD_NOT_FOUND_OR_UNAUTHORIZED")
        
    lead = lead_res.data[0]
    
    if not lead.get("is_personal"):
        raise HTTPException(status_code=400, detail="LEAD_ALREADY_IN_MARKETPLACE")
        
    # Update lead
    update_res = await supabase.table("leads").update({
        "is_personal": False,
        "master_id": None,
        "creator_master_id": current_user.user_id,
        "price_credits": price_credits,
        "status": "new"
    }).eq("id", lead_id).execute()
    
    if not update_res.data:
        raise HTTPException(status_code=500, detail="FAILED_TO_UPDATE_LEAD")
        
    # Update CRM client record
    await supabase.table("master_clients").update({
        "kanban_status": "marketplace"
    }).eq("lead_id", lead_id).eq("master_id", current_user.user_id).execute()
    
    return update_res.data[0]


@router.post("/master/{lead_id}/proposals/{master_id}/accept")
async def accept_master_proposal(
    lead_id: str,
    master_id: str,
    background_tasks: BackgroundTasks,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client),
):
    """Let an authenticated master owner (creator) choose one marketplace proposal for their B2B lead."""
    lead_res = await supabase.table("leads").select(
        "id, creator_master_id, client_token, title"
    ).eq("id", lead_id).eq("creator_master_id", current_user.user_id).execute()
    
    if not lead_res.data:
        raise HTTPException(status_code=404, detail="LEAD_NOT_FOUND_OR_UNAUTHORIZED")

    lead = lead_res.data[0]
    try:
        acceptance = await supabase.rpc("accept_marketplace_proposal", {
            "p_lead_id": lead_id,
            "p_master_id": master_id,
            "p_client_token": lead.get("client_token"),
        }).execute()
    except Exception as exc:
        message = str(exc)
        if "PROPOSAL_ALREADY_ACCEPTED" in message:
            raise HTTPException(status_code=409, detail="PROPOSAL_ALREADY_ACCEPTED") from exc
        raise HTTPException(status_code=400, detail="PROPOSAL_ACCEPT_FAILED") from exc

    if not acceptance.data or not acceptance.data.get("success"):
        raise HTTPException(status_code=400, detail="PROPOSAL_ACCEPT_FAILED")

    if not acceptance.data.get("already_charged"):
        background_tasks.add_task(
            send_push_notification,
            user_id=master_id,
            title="Сделка B2B подтверждена! 🎉",
            body=f"Мастер передал вам клиента по заявке '{lead.get('title')}'.",
            url="/dashboard?tab=messages",
        )

    return {
        "success": True,
        "chat_id": acceptance.data.get("chat_id"),
        "already_charged": acceptance.data.get("already_charged", False),
    }

class ClientLeadCreate(BaseModel):
    description: str
    email: str | None = None
    style: str | None = None
    location: str | None = None
    body_place: str | None = None
    size: str | None = None
    budget: str | None = None
    budget_val: int | None = None
    budget_currency: str | None = None
    client_priority: str | None = None
    city: str | None = None
    country_id: str | None = None
    name: str | None = None
    contact: str | None = None
    instagram: str | None = None
    is_negotiable_budget: bool = False
    image_urls: list[str] | None = None
    session_date: datetime.datetime | None = None
    session_time: str | None = None
    client_name: str | None = None
    source: str | None = None

@router.post("/client")
async def create_public_client_lead(
    lead_data: ClientLeadCreate,
    background_tasks: BackgroundTasks,
    current_user: Optional[AuthUser] = Depends(get_optional_user),
    supabase: AsyncClient = Depends(get_async_supabase_client),
):
    return await _create_client_lead(
        lead_data, background_tasks, None, current_user, supabase
    )


@router.post("/client/direct/{master_id}")
async def create_direct_client_lead(
    master_id: str,
    lead_data: ClientLeadCreate,
    background_tasks: BackgroundTasks,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client),
):
    return await _create_client_lead(
        lead_data, background_tasks, master_id, current_user, supabase
    )


async def _create_client_lead(
    lead_data: ClientLeadCreate,
    background_tasks: BackgroundTasks,
    master_id: str | None,
    current_user: Optional[AuthUser],
    supabase: AsyncClient,
):
    """Create a public marketplace lead or an authenticated direct booking."""
    try:
        trusted_master_id = None
        is_direct_booking = master_id is not None
        is_personal_booking = (lead_data.source == "personal")
        if master_id:
            master_res = await supabase.table("users").select(
                "id, role, status, is_verified_master"
            ).eq("id", master_id).execute()
            if not master_res.data:
                raise HTTPException(status_code=404, detail="MASTER_NOT_FOUND")
            master = master_res.data[0]
            if (
                master.get("role") != "master"
                or master.get("status") != "approved"
                or not master.get("is_verified_master")
            ):
                raise HTTPException(status_code=403, detail="MASTER_NOT_AVAILABLE")
            trusted_master_id = master_id

        # Format the lead for the DB
        style_display = lead_data.style if lead_data.style and lead_data.style != 'Не определился' else ''
        body_display = lead_data.body_place if lead_data.body_place and lead_data.body_place != 'Не определился' else ''
        title = "Новая заявка"

        full_description = lead_data.description or ""
        if lead_data.session_time:
            full_description += f"\n\nЖелаемое время: {lead_data.session_time}\n"

        contacts = f"Имя: {lead_data.name or 'Без имени'}, Контакт: {lead_data.contact}"
        if lead_data.email:
            contacts += f", Email: {lead_data.email}"
        if lead_data.instagram:
            contacts += f", Inst: {lead_data.instagram}"

        # Calculate dynamic price based on base currency (EUR)
        base_unlock_price_eur = calculate_unlock_price_base(
            client_budget=lead_data.budget_val if not lead_data.is_negotiable_budget else None,
            client_currency=lead_data.budget_currency,
            supabase=supabase
        )

        client_token = str(uuid.uuid4())

        city_id = None
        if lead_data.city:
            try:
                # First try to find match in name_ru, then name_en
                q1 = supabase.table("cities").select("id").ilike("name_ru", f"%{lead_data.city}%")
                if lead_data.country_id:
                    q1 = q1.eq("country_id", lead_data.country_id)
                city_res = await q1.execute()
                if city_res.data:
                    city_id = city_res.data[0]["id"]
                else:
                    q2 = supabase.table("cities").select("id").ilike("name_en", f"%{lead_data.city}%")
                    if lead_data.country_id:
                        q2 = q2.eq("country_id", lead_data.country_id)
                    city_res2 = await q2.execute()
                    if city_res2.data:
                        city_id = city_res2.data[0]["id"]
            except Exception as e:
                print(f"Failed to lookup city_id for {lead_data.city}: {e}")

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
            "city_id": city_id,
            "image_urls": lead_data.image_urls or [],
            "style": lead_data.style,
            "size": lead_data.size,
            "body_place": lead_data.body_place,
            "assigned_master_id": trusted_master_id,
            "session_date": lead_data.session_date.isoformat() if lead_data.session_date else None,
            "client_name": lead_data.client_name or lead_data.name,
            "is_personal": is_personal_booking
        }

        client_id = current_user.user_id if current_user else None
        login_link = "https://tattoo-hub.xyz/login" if lead_data.email else None

        if client_id:
            try:
                # Ensure client exists in public.users to avoid foreign key constraint error
                u_res = await supabase.table("users").select("id").eq("id", client_id).execute()
                if not u_res.data:
                    client_profile = {
                        "id": client_id,
                        "email": lead_data.email.strip().lower() if lead_data.email else f"{client_id}@client.tattoohub.xyz",
                        "credits": 0,
                        "role": "client",
                        "status": "approved",
                        "display_name": lead_data.name or lead_data.client_name or "Клиент",
                        "currency": "CZK",
                        "balance": 0.0,
                        "theme": "system"
                    }
                    await supabase.table("users").insert(client_profile).execute()
            except Exception as eu:
                print(f"Failed to ensure client user in public.users: {eu}")
            db_lead["client_id"] = client_id

        if is_direct_booking and trusted_master_id and is_personal_booking:
            rpc_lead = {
                key: (str(value) if isinstance(value, Decimal) else value)
                for key, value in db_lead.items()
            }
            direct_res = await supabase.rpc("create_direct_booking", {
                "p_lead": rpc_lead,
                "p_master_id": trusted_master_id,
                "p_client_id": client_id,
                "p_client_token": client_token,
                "p_client_email": lead_data.email.strip() if lead_data.email else None,
                "p_client_instagram": lead_data.instagram.strip() if lead_data.instagram else None,
                "p_client_name": lead_data.name or lead_data.client_name,
                "p_contact": lead_data.contact,
                "p_session_time": lead_data.session_time,
            }).execute()
            direct_result = direct_res.data or {}
            if not direct_result.get("success") or not direct_result.get("lead"):
                raise HTTPException(status_code=400, detail="DIRECT_BOOKING_FAILED")

            background_tasks.add_task(
                send_push_notification,
                user_id=trusted_master_id,
                title="Новая заявка! 🔥",
                body=f"Клиент {lead_data.name or 'Неизвестный'} хочет записаться к вам на сеанс.",
                url="/dashboard",
            )
            return {
                "success": True,
                "lead": direct_result["lead"],
                "chat_id": direct_result.get("chat_id"),
                "login_link": login_link or ("https://tattoo-hub.xyz/login" if lead_data.email else None),
            }

        import asyncio
        max_retries = 3
        for attempt in range(max_retries):
            try:
                res = await supabase.table("leads").insert(db_lead).execute()
                if res.data:
                    new_lead = res.data[0]

                    if lead_data.email:
                        def send_submission_email(link: str = login_link or "https://tattoo-hub.xyz/login"):
                            from app.services.email_lead_agent import send_smtp_reply
                            subject = "Ваша заявка успешно отправлена! 🎉"
                            html = f'''
                            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f9fafb;">
                                <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                    <h2 style="color: #111827; font-size: 24px; font-weight: 800; margin-top: 0; text-align: center;">Заявка принята!</h2>
                                    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
                                        Привет, {lead_data.name or 'друг'}! Мы успешно получили твою заявку на татуировку.
                                    </p>
                                    <p style="font-size: 16px; line-height: 1.6; color: #4b5563; text-align: center;">
                                        Мастер скоро ознакомится с ней. Вы можете отслеживать статус заявки и общаться с мастером в личном кабинете.
                                    </p>
                                    <div style="text-align: center; margin: 35px 0;">
                                        <a href="{link}" style="background-color: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block;">Открыть мои заявки</a>
                                    </div>
                                    <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                                        Используйте email {lead_data.email} для входа.
                                    </p>
                                </div>
                            </div>
                            '''
                            try:
                                # Ensure we use Resend
                                from app.config import get_settings
                                settings = get_settings()
                                original_name = getattr(settings, 'LEAD_REPLY_FROM_NAME', 'Tattoo HUB')
                                settings.LEAD_REPLY_FROM_NAME = "Tattoo HUB"
                                send_smtp_reply(lead_data.email.strip(), subject, html)
                                settings.LEAD_REPLY_FROM_NAME = original_name
                            except Exception as e:
                                print(f"Error sending submission email: {e}")

                        background_tasks.add_task(send_submission_email)

                    chat_id = None
                    if is_direct_booking and trusted_master_id and not is_personal_booking:
                        chat_payload = {
                            "lead_id": new_lead["id"],
                            "master_id": trusted_master_id,
                            "client_session_id": client_token,
                            "client_id": client_id
                        }
                        # If client_id is None, Supabase might complain if not handled by unique constraint properly, but we'll insert what we have
                        chat_res = await supabase.table("lead_chats").insert(chat_payload).execute()
                        if chat_res.data:
                            chat_id = chat_res.data[0]["id"]
                            import json
                            sys_content = f'[SYSTEM_CARD]: {json.dumps({"type": "new_lead", "lead_id": new_lead["id"], "title": "Новая заявка с маркетплейса"})}'
                            await supabase.table("chat_messages").insert({
                                "chat_id": chat_id,
                                "sender_type": "system",
                                "content": sys_content
                            }).execute()

                        background_tasks.add_task(
                            send_push_notification,
                            user_id=trusted_master_id,
                            title="Новая заявка с маркетплейса! 🎯",
                            body=f"Клиент {lead_data.name or 'Неизвестный'} выбрал вас на маркетплейсе.",
                            url="/dashboard",
                        )

                    return {"success": True, "lead": new_lead, "login_link": login_link, "chat_id": chat_id}
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
        raise HTTPException(status_code=500, detail="LEAD_CREATION_FAILED")


@router.get("/client")
async def get_client_leads(
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Get leads created by the current client."""
    try:
        res = await supabase.table("leads") \
            .select("*, users!assigned_master_id(id, display_name, avatar_url, username, last_seen)") \
            .eq("client_id", current_user.user_id) \
            .order("created_at", desc=True) \
            .execute()

        leads = res.data or []
        if not leads:
            return []

        lead_ids = [l["id"] for l in leads]

        # Get proposals
        props_res = await supabase.table("lead_proposals") \
            .select("lead_id, status, user_id, price_offer, proposed_dates, offer_currency, users(id, display_name, avatar_url, username, certificate_status, last_seen)") \
            .in_("lead_id", lead_ids) \
            .execute()

        proposals = props_res.data or []
        proposals_count = {}
        proposals_by_lead = {}
        accepted_masters = {}
        for p in proposals:
            if p.get("status") == "rejected":
                continue
            lid = p["lead_id"]
            proposals_count[lid] = proposals_count.get(lid, 0) + 1
            master = p.get("users") or {}
            proposals_by_lead.setdefault(lid, []).append({
                "master_id": p["user_id"],
                "master_name": master.get("display_name") or master.get("username") or "Мастер",
                "master_username": master.get("username"),
                "master_avatar": master.get("avatar_url"),
                "master_last_seen": master.get("last_seen"),
                "certificate_verified": master.get("certificate_status") == "approved",
                "price_offer": p.get("price_offer"),
                "offer_currency": p.get("offer_currency") or "CZK",
                "proposed_dates": p.get("proposed_dates"),
                "status": p.get("status") or "pending",
            })
            if p["status"] in {"accepted", "booked", "completed"} and p.get("users"):
                u = p["users"]
                accepted_masters[lid] = {
                    "id": u.get("id"),
                    "username": u.get("username"),
                    "name": u.get("display_name") or u.get("username") or "Мастер",
                    "avatar_url": u.get("avatar_url"),
                    "last_seen": u.get("last_seen")
                }

        # Get chats
        chats_res = await supabase.table("lead_chats").select("lead_id, id, master_id").in_("lead_id", lead_ids).execute()
        chats_dict = {(c["lead_id"], c["master_id"]): c["id"] for c in (chats_res.data or [])}

        # Get master clients & sessions
        master_clients_res = await supabase.table("master_clients").select("id, lead_id").in_("lead_id", lead_ids).execute()
        master_clients = master_clients_res.data or []
        mc_dict = {mc["lead_id"]: mc["id"] for mc in master_clients}

        sessions_dict = {}
        if master_clients:
            mc_ids = [mc["id"] for mc in master_clients]
            sessions_res = await supabase.table("master_sessions").select("*").in_("client_id", mc_ids).order("session_date", desc=True).execute()
            for s in (sessions_res.data or []):
                # Keep the latest session for each client
                if s["client_id"] not in sessions_dict:
                    sessions_dict[s["client_id"]] = s

        out = []
        for lead in leads:
            mc_id = mc_dict.get(lead["id"])
            session = sessions_dict.get(mc_id) if mc_id else None

            master_info = None
            if lead.get("users"): # from assigned_master_id
                u = lead["users"]
                master_info = {
                    "id": u.get("id"),
                    "username": u.get("username"),
                    "name": u.get("display_name") or u.get("username") or "Мастер",
                    "avatar_url": u.get("avatar_url"),
                    "last_seen": u.get("last_seen")
                }
            elif lead["id"] in accepted_masters:
                master_info = accepted_masters[lead["id"]]
                lead["status"] = "accepted" # Ensure status is accepted if proposal is accepted

            if session and session.get("status") in ["booked", "in_progress", "completed", "cancelled"]:
                 lead["status"] = session["status"]

            chat_id = None
            if master_info and master_info.get("id"):
                chat_id = chats_dict.get((lead["id"], master_info["id"]))

            out.append({
                **lead,
                "unlock_count": proposals_count.get(lead["id"], 0),
                "proposals": proposals_by_lead.get(lead["id"], []),
                "chat_id": chat_id,
                "master": master_info,
                "session": session
            })
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/client/{lead_id}/proposals/{master_id}/accept")
async def accept_client_proposal(
    lead_id: str,
    master_id: str,
    background_tasks: BackgroundTasks,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client),
):
    """Let an authenticated lead owner choose one marketplace proposal."""
    lead_res = await supabase.table("leads").select(
        "id, client_id, client_token, title"
    ).eq("id", lead_id).eq("client_id", current_user.user_id).execute()
    if not lead_res.data:
        raise HTTPException(status_code=404, detail="LEAD_NOT_FOUND")

    lead = lead_res.data[0]
    try:
        acceptance = await supabase.rpc("accept_marketplace_proposal", {
            "p_lead_id": lead_id,
            "p_master_id": master_id,
            "p_client_token": lead.get("client_token"),
        }).execute()
    except Exception as exc:
        message = str(exc)
        if "PROPOSAL_ALREADY_ACCEPTED" in message:
            raise HTTPException(status_code=409, detail="PROPOSAL_ALREADY_ACCEPTED") from exc
        raise HTTPException(status_code=400, detail="PROPOSAL_ACCEPT_FAILED") from exc

    if not acceptance.data or not acceptance.data.get("success"):
        raise HTTPException(status_code=400, detail="PROPOSAL_ACCEPT_FAILED")

    if not acceptance.data.get("already_charged"):
        background_tasks.add_task(
            send_push_notification,
            user_id=master_id,
            title="Сеанс подтвержден!",
            body=f"Клиент выбрал вас для заявки '{lead.get('title')}'.",
            url="/dashboard?tab=messages",
        )

    return {
        "success": True,
        "chat_id": acceptance.data.get("chat_id"),
        "already_charged": acceptance.data.get("already_charged", False),
    }


@router.post("/client/{lead_id}/proposals/{master_id}/reject")
async def reject_client_proposal(
    lead_id: str,
    master_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client),
):
    """Let an authenticated lead owner reject a marketplace proposal."""
    lead_res = await supabase.table("leads").select("id").eq("id", lead_id).eq("client_id", current_user.user_id).execute()
    if not lead_res.data:
        raise HTTPException(status_code=404, detail="LEAD_NOT_FOUND")

    res = await supabase.table("lead_proposals").update({"status": "rejected"}).eq("lead_id", lead_id).eq("user_id", master_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="PROPOSAL_NOT_FOUND")

    return {"success": True}


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
        current = await supabase.table("leads").select(
            "status,assigned_master_id"
        ).eq("id", lead_id).eq("client_id", current_user.user_id).single().execute()
        if not current.data:
            raise HTTPException(status_code=404, detail="Lead not found or no permission")
        if current.data.get("assigned_master_id") or current.data.get("status") in {"accepted", "booked", "completed"}:
            raise HTTPException(status_code=409, detail="ASSIGNED_LEAD_IMMUTABLE")
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
        current = await supabase.table("leads").select(
            "status,assigned_master_id"
        ).eq("id", lead_id).eq("client_id", current_user.user_id).single().execute()
        if not current.data:
            raise HTTPException(status_code=404, detail="Lead not found or no permission")
        if current.data.get("assigned_master_id") or current.data.get("status") in {"accepted", "booked", "completed"}:
            raise HTTPException(status_code=409, detail="ASSIGNED_LEAD_CANNOT_BE_DELETED")
        res = await supabase.table("leads").delete().eq("id", lead_id).eq("client_id", current_user.user_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Lead not found or no permission")
        return {"success": True}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))


class ProposalCreate(BaseModel):
    price_offer: Decimal
    proposed_dates: str
    currency: str | None = None

@router.post("/{lead_id}/proposals")
def create_proposal(
    lead_id: str,
    proposal: ProposalCreate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Submit or edit a free proposal; fee and chat activate only on acceptance."""
    try:
        profile_res = supabase.table("users").select(
            "role, is_verified_master, currency, balance"
        ).eq("id", current_user.user_id).single().execute()
        try:
            ensure_master_can_access_marketplace(profile_res.data or {})
        except ValueError as exc:
            raise HTTPException(status_code=403, detail=str(exc)) from exc

        lead_res = supabase.table("leads").select(
            "id, status, assigned_master_id"
        ).eq("id", lead_id).single().execute()
        if not lead_res.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        if lead_res.data.get("status") in {"closed", "accepted"}:
            raise HTTPException(status_code=409, detail="LEAD_NOT_ACCEPTING_PROPOSALS")

        existing_res = supabase.table("lead_proposals").select(
            "user_id, status"
        ).eq("lead_id", lead_id).execute()
        existing = existing_res.data or []
        own = next((item for item in existing if item["user_id"] == current_user.user_id), None)
        if own and own.get("status") == "accepted":
            raise HTTPException(status_code=409, detail="ACCEPTED_PROPOSAL_CANNOT_BE_EDITED")
        try:
            ensure_proposal_slot_available(
                [item["user_id"] for item in existing if item.get("status") != "rejected"],
                current_user.user_id,
            )
        except ValueError as exc:
            raise HTTPException(status_code=409, detail=str(exc)) from exc

        profile_currency = ((profile_res.data or {}).get("currency") or "CZK").upper()
        offer_currency = (proposal.currency or profile_currency).upper()
        if offer_currency != profile_currency:
            raise HTTPException(status_code=400, detail="OFFER_CURRENCY_MUST_MATCH_BALANCE")
        try:
            fee = calculate_success_fee(proposal.price_offer, offer_currency)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
            
        if (profile_res.data.get("balance") or 0) < fee.amount:
            raise HTTPException(status_code=402, detail="INSUFFICIENT_BALANCE_FOR_COMMISSION")
        proposed_dates = proposal.proposed_dates.strip()
        if not proposed_dates:
            raise HTTPException(status_code=400, detail="PROPOSED_DATES_REQUIRED")

        result = supabase.rpc("upsert_marketplace_proposal", {
            "p_lead_id": lead_id,
            "p_master_id": current_user.user_id,
            "p_price_offer": str(proposal.price_offer),
            "p_proposed_dates": proposed_dates,
            "p_currency": fee.currency,
            "p_success_fee_rate": str(fee.rate),
            "p_success_fee_amount": str(fee.amount),
        }).execute()
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to submit proposal")
        
        is_targeted_marketplace = (lead_res.data.get("assigned_master_id") == current_user.user_id)
        if is_targeted_marketplace:
            accept_result = supabase.rpc("master_accept_targeted_lead", {
                "p_lead_id": lead_id,
                "p_master_id": current_user.user_id
            }).execute()
            
            # Send notification to the client that the master accepted
            client_id = lead_res.data.get("client_id")
            if client_id:
                background_tasks.add_task(
                    send_push_notification,
                    user_id=client_id,
                    title="Мастер принял вашу заявку!",
                    body=f"Мастер согласился на вашу заявку и предлагает сеанс за {proposal.price_offer} {proposal.currency or 'CZK'}.",
                    url="/dashboard",
                )
            
            return {
                "success": True,
                "proposal": result.data,
                "chat_id": accept_result.data.get("chat_id") if accept_result.data else None,
                "proposal_count": len(existing) if own else len(existing) + 1,
                "max_proposals": MAX_PROPOSALS_PER_LEAD,
            }

        return {
            "success": True,
            "proposal": result.data,
            "proposal_count": len(existing) if own else len(existing) + 1,
            "max_proposals": MAX_PROPOSALS_PER_LEAD,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

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
    valid_statuses = ['booked', 'completed']
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    try:
        current_res = supabase.table("lead_proposals").select("status").eq(
            "lead_id", lead_id
        ).eq("user_id", current_user.user_id).execute()
        if current_res.data:
            try:
                ensure_proposal_status_transition(
                    current_res.data[0].get("status", "pending"), payload.status
                )
            except ValueError as exc:
                raise HTTPException(status_code=409, detail=str(exc)) from exc

        res = supabase.table("lead_proposals").update({
            "status": payload.status
        }).eq("lead_id", lead_id).eq("user_id", current_user.user_id).execute()

        if res.data:
            # Sync lead status if current master is the assigned master
            supabase.table("leads").update({
                "status": payload.status
            }).eq("id", lead_id).eq("assigned_master_id", current_user.user_id).execute()

        if not res.data:
            # Fallback for personal leads: update the lead status directly
            lead_res = supabase.table("leads").update({
                "status": payload.status
            }).eq("id", lead_id).eq("assigned_master_id", current_user.user_id).execute()

            if not lead_res.data:
                raise HTTPException(status_code=404, detail="Proposal or Personal Lead not found")
            return {"success": True, "lead": lead_res.data[0]}

        return {"success": True, "proposal": res.data[0]}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

class LeadStatusUpdate(BaseModel):
    status: str

@router.patch("/{lead_id}/status")
def update_lead_status(
    lead_id: str,
    payload: LeadStatusUpdate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Update the status of a lead (e.g. active, paused, open, archived).
    Must be the owner of the lead.
    """
    valid_statuses = {'new', 'open', 'active', 'paused', 'closed'}
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    try:
        # Verify ownership and enforce the pre-selection lifecycle only.
        lead_res = supabase.table("leads").select("client_id, status, assigned_master_id").eq("id", lead_id).execute()
        if not lead_res.data or lead_res.data[0].get("client_id") != current_user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this lead")

        lead = lead_res.data[0]
        current_status = lead.get("status") or "new"
        allowed_transitions = {
            "new": {"active", "paused", "closed"},
            "open": {"active", "paused", "closed"},
            "active": {"paused", "closed"},
            "paused": {"active", "closed"},
            "closed": set(),
        }
        if lead.get("assigned_master_id") or payload.status not in allowed_transitions.get(current_status, set()):
            raise HTTPException(status_code=409, detail="INVALID_LEAD_STATUS_TRANSITION")

        res = supabase.table("leads").update({
            "status": payload.status
        }).eq("id", lead_id).execute()

        if not res.data:
            raise HTTPException(status_code=404, detail="Lead not found")

        return {"success": True, "lead": res.data[0]}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{lead_id}")
def delete_lead(
    lead_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Delete a lead. Must be the owner of the lead.
    """
    try:
        # Verify ownership
        lead_res = supabase.table("leads").select("client_id,status,assigned_master_id").eq("id", lead_id).execute()
        if not lead_res.data or lead_res.data[0].get("client_id") != current_user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this lead")
        lead = lead_res.data[0]
        if lead.get("assigned_master_id") or lead.get("status") in {"accepted", "booked", "completed"}:
            raise HTTPException(status_code=409, detail="ASSIGNED_LEAD_CANNOT_BE_DELETED")

        res = supabase.table("leads").delete().eq("id", lead_id).execute()
        return {"success": True}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

class DayOffRequest(BaseModel):
    date: datetime.date

@router.post("/unavailable-dates", status_code=status.HTTP_201_CREATED)
async def add_day_off(
    request: DayOffRequest,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Add a day off for the master."""
    try:
        await supabase.table("master_days_off").insert({
            "master_id": current_user.user_id,
            "date": request.date.isoformat()
        }).execute()
        return {"status": "success"}
    except Exception as e:
        if "duplicate key" in str(e).lower() or "23505" in str(e):
            return {"status": "already_exists"}
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/unavailable-dates/{date_str}")
async def remove_day_off(
    date_str: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Remove a day off for the master."""
    try:
        await supabase.table("master_days_off").delete().match({
            "master_id": current_user.user_id,
            "date": date_str
        }).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/days-off", response_model=List[str])
async def get_my_days_off(
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Get explicit days off for the logged-in master."""
    try:
        res = await supabase.table("master_days_off").select("date").eq("master_id", current_user.user_id).execute()
        return [d["date"] for d in res.data or []]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/public/master/{username}/unavailable-dates", response_model=List[str])
async def get_master_unavailable_dates(
    username: str,
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Get all unavailable dates for a master (days off + booked sessions)."""
    try:
        # First try resolving by username, if not found check by id
        master_res = await supabase.table("users").select("id").eq("username", username).execute()
        if not master_res.data:
            master_res = await supabase.table("users").select("id").eq("id", username).execute()
        if not master_res.data:
            return []

        master_id = master_res.data[0]["id"]

        # Get explicit days off
        days_off_res = await supabase.table("master_days_off").select("date").eq("master_id", master_id).eq("is_full_day", True).execute()
        unavailable_dates = set([d["date"] for d in days_off_res.data or []])

        return list(unavailable_dates)
    except Exception as e:
        return []
