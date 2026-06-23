from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_supabase_client
from supabase import Client
from app.services.mail import send_transactional_email
from app.services.notifications import send_push_notification

router = APIRouter(prefix="/api/admin", tags=["admin"])

class UserStatusUpdate(BaseModel):
    status: str

class UserBalanceUpdate(BaseModel):
    balance: float

class AdminUserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    phone: str | None = None
    bio: str | None = None
    status: str
    balance: float
    created_at: str

class LeadCreate(BaseModel):
    title: str
    description: str
    contacts: str
    base_unlock_price_eur: float
    image_urls: List[str] = []
    country_id: str | None = None
    city_id: str | None = None

class LeadUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    contacts: str | None = None
    base_unlock_price_eur: float | None = None
    image_urls: List[str] | None = None
    country_id: str | None = None
    city_id: str | None = None

async def get_admin_user(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
) -> AuthUser:
    """Dependency to check if current user is an admin."""
    try:
        response = supabase.table("users") \
            .select("is_admin") \
            .eq("id", current_user.user_id) \
            .single() \
            .execute()
        
        if not response.data or not response.data.get("is_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
            
        return current_user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error verifying admin status: {str(e)}"
        )


@router.get("/users", response_model=List[AdminUserResponse])
async def get_users(
    status_filter: str | None = None,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
) -> List[AdminUserResponse]:
    """Get all users, optionally filtered by status."""
    try:
        query = supabase.table("users").select("*").order("created_at", desc=True)
        
        if status_filter:
            query = query.eq("status", status_filter)
            
        response = query.execute()
        
        return [
            AdminUserResponse(
                id=u["id"],
                email=u["email"],
                display_name=u.get("display_name"),
                phone=u.get("phone"),
                bio=u.get("bio"),
                status=u.get("status", "pending"),
                balance=u.get("balance", 0),
                created_at=u["created_at"]
            )
            for u in response.data
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching users: {str(e)}"
        )


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    update_data: UserStatusUpdate,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Approve or reject a master account."""
    if update_data.status not in ["pending", "approved", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be pending, approved, or rejected"
        )
        
    try:
        update_payload = {"status": update_data.status}
        if update_data.status == "approved":
            update_payload["is_verified_master"] = True
        elif update_data.status == "rejected":
            update_payload["is_verified_master"] = False
            
        response = supabase.table("users") \
            .update(update_payload) \
            .eq("id", user_id) \
            .execute()
            
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        if update_data.status == "approved":
            target_user = response.data[0]
            
            # Reward Referrer if present
            if target_user.get("referred_by"):
                referrer_code = target_user["referred_by"]
                try:
                    referrer_res = supabase.table("users").select("id, discount_tokens, email").eq("own_referral_code", referrer_code).single().execute()
                    if referrer_res.data:
                        referrer_id = referrer_res.data["id"]
                        current_tokens = referrer_res.data.get("discount_tokens", 0)
                        supabase.table("users").update({"discount_tokens": current_tokens + 1}).eq("id", referrer_id).execute()
                        
                        # Notify referrer
                        supabase.table("notifications").insert({
                            "user_id": referrer_id,
                            "title": "Новый реферал!",
                            "message": f"Мастер {target_user.get('email')} был одобрен. Вы получили 1 скидочный токен (50% скидка)!",
                            "type": "system"
                        }).execute()
                        
                        # Clear referred_by to prevent double rewards
                        supabase.table("users").update({"referred_by": None}).eq("id", user_id).execute()
                except Exception as e:
                    print(f"Error rewarding referrer {referrer_code}: {e}")

            supabase.table("notifications").insert({
                "user_id": user_id,
                "title": "Профиль верифицирован",
                "message": "Ваш профиль успешно проверен администратором. Теперь вы можете получать заявки на тату!",
                "type": "system"
            }).execute()
            
            # Send Email
            user_email = target_user.get("email")
            if user_email:
                send_transactional_email(
                    to_email=user_email,
                    subject="Поздравляем! Ваш профиль Tattoo Hub верифицирован",
                    html_content="<h1>Добро пожаловать в Tattoo Hub!</h1><p>Ваш аккаунт успешно проверен. Теперь вы можете получать заявки на тату в нашем приложении.</p>"
                )
        elif update_data.status == "rejected":
            # Send Email for rejection
            user_email = response.data[0].get("email")
            if user_email:
                send_transactional_email(
                    to_email=user_email,
                    subject="Статус вашего профиля Tattoo Hub",
                    html_content="<h1>Здравствуйте</h1><p>К сожалению, мы не можем подтвердить ваш аккаунт на данный момент.</p>"
                )
            
        return {"message": f"User status updated to {update_data.status}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user status: {str(e)}"
        )

@router.put("/users/{user_id}/balance")
async def update_user_balance(
    user_id: str,
    update_data: UserBalanceUpdate,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Update a user's credit balance."""
    if update_data.balance < 0:
        raise HTTPException(status_code=400, detail="Credits cannot be negative")
        
    try:
        response = supabase.table("users") \
            .update({"balance": update_data.balance}) \
            .eq("id", user_id) \
            .execute()
            
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Send Email notification for balance change
        user_email = response.data[0].get("email")
        if user_email:
            send_transactional_email(
                to_email=user_email,
                subject="Ваш баланс Tattoo Hub пополнен!",
                html_content=f"<h1>Ваш баланс обновлен</h1><p>Текущий баланс: <strong>{update_data.balance} кредитов</strong>.</p>"
            )
            
        return {"message": f"User credits updated to {update_data.balance}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating credits: {str(e)}")

@router.delete("/chat/{user_id}")
async def clear_user_chat(
    user_id: str,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Delete all support messages for a specific user."""
    try:
        response = supabase.table("support_messages") \
            .delete() \
            .eq("user_id", user_id) \
            .execute()
            
        return {"message": "Chat history cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing chat: {str(e)}")


@router.get("/leads")
async def get_admin_leads(
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get all leads with unmasked contacts for admin."""
    try:
        response = supabase.table("leads").select("*, cities(country_id)").order("created_at", desc=True).execute()
        leads = response.data or []
        for lead in leads:
            lead["country_id"] = lead.get("cities", {}).get("country_id") if lead.get("cities") else None
        return leads
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching leads: {str(e)}"
        )

@router.post("/leads")
async def create_lead(
    lead_data: LeadCreate,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Create a new lead."""
    try:
        data_dump = lead_data.model_dump()
        data_dump.pop("country_id", None)
        response = supabase.table("leads").insert(data_dump).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create lead")
            
        new_lead = response.data[0]
        
        # Optionally send push notification asynchronously
        try:
            city_res = supabase.table("cities").select("name_ru").eq("id", new_lead.get("city_id")).execute()
            city_name = city_res.data[0]["name_ru"] if city_res.data else "новом городе"
            price = new_lead.get("base_unlock_price_eur", 5.0)
            
            # Fetch all users who have a push subscription
            # For a real scalable app, you'd use a background worker (Celery/RQ)
            subs_res = supabase.table("push_subscriptions").select("user_id").execute()
            user_ids = list(set([sub["user_id"] for sub in subs_res.data]))
            
            for uid in user_ids:
                send_push_notification(
                    user_id=uid,
                    title="Новый лид! 🔥",
                    body=f"Доступен новый лид в {city_name} за {price}€. Успей забрать первым!"
                )
        except Exception as e:
            print(f"Failed to send notifications: {e}")
            
        return new_lead
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating lead: {str(e)}"
        )

@router.put("/leads/{lead_id}")
async def update_lead(
    lead_id: str,
    lead_data: LeadUpdate,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Update an existing lead."""
    try:
        update_dict = {k: v for k, v in lead_data.model_dump().items() if v is not None}
        update_dict.pop("country_id", None)
        if not update_dict:
            raise HTTPException(status_code=400, detail="No fields to update")
            
        response = supabase.table("leads").update(update_dict).eq("id", lead_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating lead: {str(e)}"
        )

@router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: str,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Delete a lead."""
    try:
        response = supabase.table("leads").delete().eq("id", lead_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        return {"message": "Lead deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting lead: {str(e)}"
        )

# --- Locations Admin ---

class CountryCreate(BaseModel):
    code: str
    name_ru: str
    name_en: str

class CityCreate(BaseModel):
    country_id: str
    name_ru: str
    name_en: str

@router.post("/locations/countries")
async def create_country(
    data: CountryCreate,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        res = supabase.table("countries").insert(data.model_dump()).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/locations/countries/{country_id}")
async def delete_country(
    country_id: str,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        res = supabase.table("countries").delete().eq("id", country_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/locations/cities")
async def create_city(
    data: CityCreate,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        res = supabase.table("cities").insert(data.model_dump()).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/locations/cities/{city_id}")
async def delete_city(
    city_id: str,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        res = supabase.table("cities").delete().eq("id", city_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DisputeResolution(BaseModel):
    action: str
    admin_comment: str

@router.get("/disputes")
async def get_all_disputes(
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        res = supabase.table("disputes") \
            .select("*, users(email), leads(title, base_unlock_price_eur)") \
            .eq("status", "pending") \
            .order("created_at", desc=True) \
            .execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/disputes/{dispute_id}/resolve")
async def resolve_dispute(
    dispute_id: str,
    resolution: DisputeResolution,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        dispute_res = supabase.table("disputes").select("*").eq("id", dispute_id).single().execute()
        if not dispute_res.data:
            raise HTTPException(status_code=404, detail="Dispute not found")
            
        dispute = dispute_res.data
        if dispute["status"] != "pending":
            raise HTTPException(status_code=400, detail="Dispute already resolved")
        user_id = dispute["user_id"]
        
        if resolution.action == "refund":
            # get lead price
            lead_res = supabase.table("leads").select("base_unlock_price_eur").eq("id", dispute["lead_id"]).single().execute()
            price = lead_res.data["base_unlock_price_eur"] if lead_res.data else 5.0
                
            user_res = supabase.table("users").select("balance").eq("id", user_id).single().execute()
            if user_res.data:
                new_balance = float(user_res.data["balance"]) + float(price) # FIXME: Ideally we should refund the exact local amount that was deducted
                supabase.table("users").update({"balance": new_balance}).eq("id", user_id).execute()
                
            supabase.table("disputes").update({"status": "resolved"}).eq("id", dispute_id).execute()
            
            supabase.table("notifications").insert({
                "user_id": user_id,
                "title": "Спор разрешен (Возврат средств)",
                "message": f"Ваш спор по лиду был удовлетворен. {price} кредитов возвращено. Комментарий: {resolution.admin_comment}",
                "type": "system"
            }).execute()
        else:
            supabase.table("disputes").update({"status": "rejected"}).eq("id", dispute_id).execute()
            
            supabase.table("notifications").insert({
                "user_id": user_id,
                "title": "Спор отклонен",
                "message": f"Ваш спор по лиду был отклонен. Комментарий: {resolution.admin_comment}",
                "type": "system"
            }).execute()
            
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/withdrawals")
async def get_withdrawals(
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        res = supabase.table("withdrawal_requests").select("*, users(email)").order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ProcessWithdrawalRequest(BaseModel):
    action: str # "approve" or "reject"
    
@router.post("/withdrawals/{req_id}/process")
async def process_withdrawal(
    req_id: str,
    action_data: ProcessWithdrawalRequest,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        req_res = supabase.table("withdrawal_requests").select("*").eq("id", req_id).single().execute()
        if not req_res.data:
            raise HTTPException(status_code=404, detail="Request not found")
            
        req = req_res.data
        if req["status"] != "pending":
            raise HTTPException(status_code=400, detail="Request already processed")
            
        if action_data.action == "approve":
            supabase.table("withdrawal_requests").update({
                "status": "approved",
                "processed_at": "now()"
            }).eq("id", req_id).execute()
            
            supabase.table("notifications").insert({
                "user_id": req["user_id"],
                "title": "Вывод средств одобрен",
                "message": f"Ваша заявка на вывод {req['amount']} кредитов успешно обработана.",
                "type": "system"
            }).execute()
            
        elif action_data.action == "reject":
            # Refund credits
            user_res = supabase.table("users").select("credits, withdrawable_credits").eq("id", req["user_id"]).single().execute()
            if user_res.data:
                supabase.table("users").update({
                    "credits": user_res.data["credits"] + req["amount"],
                    "withdrawable_credits": user_res.data["withdrawable_credits"] + req["amount"]
                }).eq("id", req["user_id"]).execute()
                
            supabase.table("withdrawal_requests").update({
                "status": "rejected",
                "processed_at": "now()"
            }).eq("id", req_id).execute()
            
            supabase.table("notifications").insert({
                "user_id": req["user_id"],
                "title": "Вывод средств отклонен",
                "message": f"К сожалению, ваша заявка на вывод отклонена. Кредиты возвращены на баланс.",
                "type": "system"
            }).execute()
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
            
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations")
async def get_ai_conversations(
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get all email lead conversations for admin review."""
    try:
        res = supabase.table("email_lead_conversations") \
            .select("*") \
            .order("created_at", desc=True) \
            .execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PauseConversationRequest(BaseModel):
    is_paused: bool

@router.put("/conversations/{conversation_id}/pause")
async def pause_conversation(
    conversation_id: str,
    pause_data: PauseConversationRequest,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Pause or unpause an AI email conversation."""
    try:
        res = supabase.table("email_lead_conversations") \
            .update({"is_paused": pause_data.is_paused}) \
            .eq("id", conversation_id) \
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Conversation not found")
            
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating conversation pause status: {str(e)}"
        )

