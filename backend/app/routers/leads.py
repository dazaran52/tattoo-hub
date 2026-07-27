from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, BackgroundTasks
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
    proposal_count: int = 0
    max_proposals: int = MAX_PROPOSALS_PER_LEAD

class UnlockResponse(BaseModel):
    contacts: str
    is_unlocked: bool
    current_credits: int

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

        raw_res = await supabase.table("leads") \
            .select("*, cities(country_id)") \
            .neq("status", "closed") \
            .order("created_at", desc=True) \
            .limit(2000) \
            .execute()
        raw_leads = raw_res.data or []
        leads = [
            lead for lead in raw_leads
            if not lead.get("is_personal")
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

        # Fetch all public leads (and exclusive paid leads)
        raw_res = supabase.table("leads").select("*, cities(country_id)").order("created_at", desc=True).limit(2000).execute()
        raw_leads = raw_res.data or []
        leads = [
            l for l in raw_leads
            if l.get("assigned_master_id") is None or (l.get("assigned_master_id") == current_user.user_id and not l.get("is_personal", False))
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
                country_id=lead.get("country_id") or (lead.get("cities", {}).get("country_id") if lead.get("cities") else None),
                city_id=lead.get("city_id"),
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
    """Allow a master to create their own lead (C2C)."""
    try:
        # Insert lead (exclude country_id as it doesn't exist in DB)
        data = lead_data.model_dump()
        data.pop("country_id", None)
        lead_insert = supabase.table("leads").insert(data).execute()
        if not lead_insert.data:
            raise HTTPException(status_code=400, detail="Failed to create lead")
            
        new_lead = lead_insert.data[0]
        
        
        return new_lead
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    assigned_master_id: str | None = None
    session_date: datetime.datetime | None = None
    session_time: str | None = None
    client_name: str | None = None
    is_personal: bool = False

@router.post("/client")
async def create_client_lead(
    lead_data: ClientLeadCreate,
    background_tasks: BackgroundTasks,
    current_user: Optional[AuthUser] = Depends(get_optional_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Public endpoint for clients submitting leads via the Landing Page."""
    try:
        # Format the lead for the DB
        style_display = lead_data.style if lead_data.style and lead_data.style != 'Не определился' else ''
        body_display = lead_data.body_place if lead_data.body_place and lead_data.body_place != 'Не определился' else ''
        title = f"Татуировка {body_display}".strip() if body_display else "Новая заявка на татуировку"
        if style_display:
            title += f" ({style_display})"
            
        full_description = f"{lead_data.description}\n\n"
        if lead_data.budget:
            full_description += f"Бюджет: {lead_data.budget}\n"
        if lead_data.city:
            full_description += f"Город: {lead_data.city}\n"
        if lead_data.session_time:
            full_description += f"Желаемое время: {lead_data.session_time}\n"
            
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
            "assigned_master_id": lead_data.assigned_master_id,
            "session_date": lead_data.session_date.isoformat() if lead_data.session_date else None,
            "client_name": lead_data.client_name or lead_data.name,
            "is_personal": lead_data.is_personal
        }
        
        client_id = None
        login_link = None
        if current_user:
            client_id = current_user.user_id
        elif lead_data.email:
            email = lead_data.email.strip().lower()
            try:
                # Check if user exists in public.users
                res = await supabase.table("users").select("id").eq("email", email).execute()
                if res.data:
                    client_id = res.data[0]["id"]
                else:
                    # Create new auth user
                    import secrets, string
                    alphabet = string.ascii_letters + string.digits
                    password = ''.join(secrets.choice(alphabet) for _ in range(16))
                    user_resp = await supabase.auth.admin.create_user({
                        "email": email,
                        "password": password,
                        "email_confirm": True,
                        "user_metadata": {
                            "name": lead_data.name or "Клиент",
                            "role": "client"
                        }
                    })
                    client_id = user_resp.user.id
                    
                    try:
                        # Generate magic link
                        link_resp = await supabase.auth.admin.generate_link({
                            "type": "magiclink",
                            "email": email,
                            "options": {
                                "redirect_to": "https://tattoo-hub.xyz/dashboard"
                            }
                        })
                        
                        action_link = None
                        if hasattr(link_resp, "properties") and hasattr(link_resp.properties, "action_link"):
                            action_link = link_resp.properties.action_link
                        elif isinstance(link_resp, dict) and "properties" in link_resp:
                            action_link = link_resp["properties"].get("action_link")
                            
                        if action_link:
                            login_link = action_link
                    except Exception as le:
                        print(f"Failed to generate magic link: {le}")
            except Exception as e:
                print(f"Shadow auth failed: {e}")
                
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

        import asyncio
        max_retries = 3
        for attempt in range(max_retries):
            try:
                res = await supabase.table("leads").insert(db_lead).execute()
                if res.data:
                    new_lead = res.data[0]
                    
                    if lead_data.assigned_master_id:
                        if lead_data.is_personal:
                            # Create an accepted proposal to bypass chat filters
                            await supabase.table("lead_proposals").insert({
                                "lead_id": new_lead["id"],
                                "user_id": lead_data.assigned_master_id,
                                "status": "accepted",
                                "price_offer": 0,
                                "proposed_dates": "Сразу в работу"
                            }).execute()
                            
                            # Create or get the chat
                            chat_id = None
                            if client_id:
                                chats_res = await supabase.table("lead_chats").select("id").eq("client_id", client_id).eq("master_id", lead_data.assigned_master_id).execute()
                            else:
                                chats_res = await supabase.table("lead_chats").select("id").eq("client_session_id", client_token).eq("master_id", lead_data.assigned_master_id).execute()
                                
                            if not chats_res.data:
                                new_chat = await supabase.table("lead_chats").insert({
                                    "lead_id": new_lead["id"],
                                    "master_id": lead_data.assigned_master_id,
                                    "client_session_id": client_token,
                                    "client_id": client_id
                                }).execute()
                                if new_chat.data:
                                    chat_id = new_chat.data[0]["id"]
                            else:
                                chat_id = chats_res.data[0]["id"]
                                
                            if chat_id:
                                import json
                                system_msg = {
                                    "type": "new_lead",
                                    "lead_id": new_lead["id"],
                                    "title": new_lead["title"]
                                }
                                await supabase.table("chat_messages").insert({
                                    "chat_id": chat_id,
                                    "sender_type": "system",
                                    "content": f"[SYSTEM_CARD]: {json.dumps(system_msg)}"
                                }).execute()
                        
                        # Also automatically add to CRM (master_clients & master_sessions) for ANY directly assigned lead
                        # Try to find an existing client first
                        existing_client = None
                        if lead_data.instagram:
                            res_client = await supabase.table("master_clients").select("id").eq("master_id", lead_data.assigned_master_id).eq("instagram", lead_data.instagram.strip()).eq("is_deleted", False).execute()
                            if res_client.data: existing_client = res_client.data[0]
                        if not existing_client and lead_data.email:
                            res_client = await supabase.table("master_clients").select("id").eq("master_id", lead_data.assigned_master_id).eq("email", lead_data.email.strip()).eq("is_deleted", False).execute()
                            if res_client.data: existing_client = res_client.data[0]
                        
                        if not existing_client:
                            # Create new master_client
                            client_data = {
                                "master_id": lead_data.assigned_master_id,
                                "lead_id": new_lead["id"],
                                "name": lead_data.name or "Новый клиент",
                                "contact_info": lead_data.contact,
                                "phone": lead_data.contact if not lead_data.email and not lead_data.instagram else None,
                                "instagram": lead_data.instagram,
                                "email": lead_data.email,
                                "notes": "",
                                "source": "direct" if lead_data.is_personal else "marketplace",
                                "kanban_status": "new"
                            }
                            new_c_res = await supabase.table("master_clients").insert(client_data).execute()
                            if new_c_res.data:
                                existing_client = new_c_res.data[0]
                                
                        if existing_client:
                            # Update existing client with latest lead_id
                            update_client_data = {"lead_id": new_lead["id"]}
                            if lead_data.is_personal:
                                update_client_data["source"] = "direct"
                            await supabase.table("master_clients").update(update_client_data).eq("id", existing_client["id"]).execute()

                            # Create a master_sessions for this new request
                            session_date = lead_data.session_date.isoformat()[:10] if lead_data.session_date else datetime.datetime.utcnow().date().isoformat()
                            res = await supabase.table("master_sessions").insert({
                                "master_id": lead_data.assigned_master_id,
                                "client_id": existing_client["id"],
                                "lead_id": new_lead["id"],
                                "source": "direct" if lead_data.is_personal else "marketplace",
                                "session_date": session_date,
                                "start_time": lead_data.session_time,
                                "status": "new",
                                "style": lead_data.style,
                                "body_place": lead_data.body_place,
                                "size": lead_data.size,
                                "reference_images": lead_data.image_urls or [],
                                "price": lead_data.budget_val
                            }).execute()
                            
                            # Create in-app and push notifications for new lead
                            try:
                                await supabase.table("notifications").insert({
                                    "user_id": lead_data.assigned_master_id,
                                    "title": "Новая персональная заявка!",
                                    "message": f"У вас новая персональная заявка от клиента {lead_data.name or 'Неизвестный'}.",
                                    "type": "system"
                                }).execute()
                                
                                send_push_notification(
                                    user_id=lead_data.assigned_master_id,
                                    title="Новая заявка! 🔥",
                                    body=f"Клиент {lead_data.name or 'Неизвестный'} хочет записаться к вам на сеанс.",
                                    url="/dashboard"
                                )
                            except Exception as notif_e:
                                print(f"Warning: Failed to send notifications: {notif_e}")
                        
                        if lead_data.email and not login_link:
                            login_link = "https://tattoo-hub.xyz/login"
                            try:
                                res = await supabase.auth.admin.generate_link(
                                    {"type": "magiclink", "email": lead_data.email.strip(), "options": {"redirect_to": "https://tattoo-hub.xyz/dashboard"}}
                                )
                                if hasattr(res, 'properties') and res.properties.action_link:
                                    login_link = res.properties.action_link
                            except Exception as e:
                                print(f"Warning: Failed to generate magiclink for {lead_data.email}: {e}")
                                
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
                            
                    return {"success": True, "lead": new_lead, "login_link": login_link}
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
            .select("*, users!assigned_master_id(id, display_name, avatar_url, username)") \
            .eq("client_id", current_user.user_id) \
            .order("created_at", desc=True) \
            .execute()
        
        leads = res.data or []
        if not leads:
            return []
            
        lead_ids = [l["id"] for l in leads]
        
        # Get proposals
        props_res = await supabase.table("lead_proposals") \
            .select("lead_id, status, user_id, users(id, display_name, avatar_url, username)") \
            .in_("lead_id", lead_ids) \
            .execute()
            
        proposals = props_res.data or []
        proposals_count = {}
        accepted_masters = {}
        for p in proposals:
            lid = p["lead_id"]
            proposals_count[lid] = proposals_count.get(lid, 0) + 1
            if p["status"] in {"accepted", "booked", "completed"} and p.get("users"):
                u = p["users"]
                accepted_masters[lid] = {
                    "id": u.get("id"),
                    "username": u.get("username"),
                    "name": u.get("display_name") or u.get("username") or "Мастер",
                    "avatar_url": u.get("avatar_url")
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
                    "avatar_url": u.get("avatar_url")
                }
            elif lead["id"] in accepted_masters:
                master_info = accepted_masters[lead["id"]]
                lead["status"] = "accepted" # Ensure status is accepted if proposal is accepted

            if session and session.get("status") in ["appointment_set", "completed"]:
                 lead["status"] = session["status"]

            chat_id = None
            if master_info and master_info.get("id"):
                chat_id = chats_dict.get((lead["id"], master_info["id"]))

            out.append({
                **lead,
                "unlock_count": proposals_count.get(lead["id"], 0),
                "chat_id": chat_id,
                "master": master_info,
                "session": session
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
            "role, is_verified_master, currency"
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
                [item["user_id"] for item in existing],
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
    valid_statuses = ['new', 'active', 'paused', 'closed', 'open', 'archived', 'accepted', 'completed', 'cancelled']
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    try:
        # Verify ownership
        lead_res = supabase.table("leads").select("client_id").eq("id", lead_id).execute()
        if not lead_res.data or lead_res.data[0].get("client_id") != current_user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this lead")

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
        lead_res = supabase.table("leads").select("client_id").eq("id", lead_id).execute()
        if not lead_res.data or lead_res.data[0].get("client_id") != current_user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this lead")

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
