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

@router.get("/marketplace", response_model=List[LeadResponse])
async def get_marketplace_leads(
    response: Response,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Get all public leads (marketplace) that are not assigned to a master."""
    try:
        raw_res = await supabase.table("leads") \
            .select("*, cities(country_id)") \
            .neq("status", "closed") \
            .order("created_at", desc=True) \
            .limit(2000) \
            .execute()
            
        raw_leads = raw_res.data or []
        leads = [
            l for l in raw_leads
            if l.get("assigned_master_id") is None or (l.get("assigned_master_id") == current_user.user_id and not l.get("is_personal", False))
        ]
        
        paginated_leads = leads[offset:offset+limit]
        has_more = len(leads) > offset + limit
        response.headers["X-Has-More"] = "true" if has_more else "false"
        
        # Check unlocks
        unlocks_res = await supabase.table("lead_unlocks") \
            .select("lead_id") \
            .eq("user_id", current_user.user_id) \
            .execute()
        unlocked_lead_ids = {u["lead_id"] for u in unlocks_res.data or []}
        
        # Get user currency
        user_res = await supabase.table("users").select("currency").eq("id", current_user.user_id).execute()
        master_currency = user_res.data[0].get("currency", "CZK") if user_res.data else "CZK"

        processed_leads = []
        for lead in paginated_leads:
            is_unlocked = lead["id"] in unlocked_lead_ids
            
            base_price = float(lead.get("base_unlock_price_eur", 5.0))
            try:
                local_price = convert_currency(base_price, "EUR", master_currency)
            except ValueError:
                local_price = base_price
                
            lead_dict = dict(lead)
            lead_dict["is_unlocked"] = is_unlocked
            lead_dict["unlock_price_local"] = local_price
            lead_dict["master_currency"] = master_currency
            
            # Format budget
            b_val = lead.get("client_budget")
            b_cur = lead.get("client_currency", "CZK")
            lead_dict["display_budget"] = f"{b_val} {b_cur}" if b_val else "По договоренности"
            
            if not is_unlocked:
                lead_dict["contacts"] = "Контакт скрыт"
                
            if lead_dict.get("cities"):
                lead_dict["country_id"] = lead_dict["cities"].get("country_id")
                
            processed_leads.append(lead_dict)
            
        return processed_leads
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{lead_id}/dump")
async def dump_lead(
    lead_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Dump a lead into the marketplace (auction)."""
    try:
        # Check ownership
        lead_res = await supabase.table("leads").select("assigned_master_id").eq("id", lead_id).single().execute()
        if not lead_res.data or lead_res.data.get("assigned_master_id") != current_user.user_id:
            raise HTTPException(status_code=403, detail="Not authorized to dump this lead")
            
        # Update lead
        await supabase.table("leads").update({
            "assigned_master_id": None,
            "status": "auction"
        }).eq("id", lead_id).execute()
        
        return {"status": "success"}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


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
        
        # Fetch unlocks for these leads
        lead_ids = [l["id"] for l in leads]
        unlocked_by_me = {}
        if lead_ids:
            unlocks_res = supabase.table("lead_unlocks").select("lead_id, status").eq("user_id", current_user.user_id).in_("lead_id", lead_ids).execute()
            unlocked_by_me = {u["lead_id"]: u["status"] for u in (unlocks_res.data or [])}

        processed_leads = []
        for lead in leads:
            is_unlocked = lead["id"] in unlocked_by_me
            unlock_status = unlocked_by_me.get(lead["id"]) if is_unlocked else None
            
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
    Get all leads. Contacts are masked if the user hasn't unlocked them.
    Leads are limited to 3 unlocks maximum.
    """
    try:
        # Fetch current master's currency
        user_res = supabase.table("users").select("currency").eq("id", current_user.user_id).execute()
        master_currency = user_res.data[0].get("currency", "CZK") if user_res.data else "CZK"

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
        for lead in paginated_leads:
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
    email: str
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
            client_currency=lead_data.budget_currency
        )

        client_token = str(uuid.uuid4())

        city_id = None
        if lead_data.city:
            try:
                # First try to find exact match in name_ru or name_en
                q = supabase.table("cities").select("id").or_(f"name_ru.ilike.{lead_data.city},name_en.ilike.{lead_data.city}")
                if lead_data.country_id:
                    q = q.eq("country_id", lead_data.country_id)
                city_res = await q.execute()
                if city_res.data:
                    city_id = city_res.data[0]["id"]
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
                            from app.services.mail import send_transactional_email
                            html = f"""
                            <h2>Ваша заявка успешно отправлена!</h2>
                            <p>Мы создали для вас личный кабинет, чтобы вы могли общаться с мастерами.</p>
                            <p><a href="{action_link}" style="display:inline-block;padding:10px 20px;background:#8b5cf6;color:white;text-decoration:none;border-radius:5px;">Войти в кабинет</a></p>
                            <p>Если кнопка не работает, скопируйте эту ссылку в браузер:</p>
                            <p>{action_link}</p>
                            """
                            send_transactional_email(email, "Личный кабинет Tattoo Hub", html)
                    except Exception as le:
                        print(f"Failed to generate/send magic link: {le}")
            except Exception as e:
                print(f"Shadow auth failed: {e}")
                
        if client_id:
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
                                "source": "lead",
                                "kanban_status": "new"
                            }
                            new_c_res = await supabase.table("master_clients").insert(client_data).execute()
                            if new_c_res.data:
                                existing_client = new_c_res.data[0]
                                
                        if existing_client:
                            # Create a master_sessions for this new request
                            session_date = lead_data.session_date.isoformat()[:10] if lead_data.session_date else datetime.datetime.utcnow().date().isoformat()
                            res = await supabase.table("master_sessions").insert({
                                "master_id": lead_data.assigned_master_id,
                                "client_id": existing_client["id"],
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
                        
                        if lead_data.email:
                            login_link = "https://tattoo-hub.xyz/login"
                            try:
                                res = await supabase.auth.admin.generate_link(
                                    {"type": "magiclink", "email": lead_data.email.strip()}
                                )
                                if hasattr(res, 'properties') and res.properties.action_link:
                                    login_link = res.properties.action_link
                            except Exception as e:
                                print(f"Warning: Failed to generate magiclink for {lead_data.email}: {e}")
                                
                            def send_submission_email(link: str = login_link):
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
                            
                    return {"success": True, "lead": new_lead}
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
            if p["status"] == "accepted" and p.get("users"):
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
    Update the status of a lead (e.g. active, paused).
    Must be the owner of the lead.
    """
    valid_statuses = ['new', 'active', 'paused', 'closed']
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
        # First resolve username to master_id
        master_res = await supabase.table("users").select("id").eq("username", username).single().execute()
        if not master_res.data:
            raise HTTPException(status_code=404, detail="Master not found")
            
        master_id = master_res.data["id"]
        
        # Get explicit days off
        days_off_res = await supabase.table("master_days_off").select("date").eq("master_id", master_id).eq("is_full_day", True).execute()
        unavailable_dates = set([d["date"] for d in days_off_res.data or []])
                
        return list(unavailable_dates)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
