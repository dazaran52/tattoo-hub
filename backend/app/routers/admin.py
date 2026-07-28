from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query, Response
from pydantic import BaseModel
from typing import List
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_supabase_client
from supabase import Client
from app.services.mail import send_transactional_email
from app.services.notifications import send_push_notification
from app.services.verification import (
    build_certificate_review_update,
    ensure_certificate_reviewable,
)
from app.services.marketplace import build_admin_balance_update
from decimal import Decimal

router = APIRouter(prefix="/api/admin", tags=["admin"])

class UserStatusUpdate(BaseModel):
    status: str


class CertificateReview(BaseModel):
    status: str
    reason: str | None = None

class UserBalanceUpdate(BaseModel):
    credits: int | None = None
    balance: Decimal | None = None

class AdminUserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    phone: str | None = None
    bio: str | None = None
    status: str
    is_verified_master: bool
    is_admin: bool
    balance: float
    credits: int
    telegram_id: int | None = None
    telegram_username: str | None = None
    whatsapp_number: str | None = None
    created_at: str
    portfolio_url: str | None = None
    role: str | None = None
    referred_by: str | None = None
    certificate_url: str | None = None
    certificate_status: str = "not_submitted"
    certificate_submitted_at: str | None = None
    certificate_rejection_reason: str | None = None

class AdminUserPaginatedResponse(BaseModel):
    users: List[AdminUserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

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
    status: str | None = None
    assigned_master_id: str | None = None
    is_personal: bool | None = None

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


@router.get("/users", response_model=AdminUserPaginatedResponse)
async def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role_filter: str | None = None,
    status_filter: str | None = None,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
) -> AdminUserPaginatedResponse:
    """Get all users, paginated and optionally filtered by role and status."""
    try:
        # We need to query with count="exact" to get the total count for pagination
        query = supabase.table("users").select("*", count="exact")
        
        if status_filter:
            query = query.eq("status", status_filter)
            
        if role_filter and role_filter != 'all':
            if role_filter == 'admin':
                query = query.eq("is_admin", True)
            else:
                query = query.eq("role", role_filter)
                query = query.eq("is_admin", False)
                
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.order("created_at", desc=True).range(offset, offset + page_size - 1)
            
        response = query.execute()
        
        users_list = [
            AdminUserResponse(
                id=u["id"],
                email=u["email"],
                display_name=u.get("display_name"),
                phone=u.get("phone"),
                bio=u.get("bio"),
                status=u.get("status", "pending"),
                is_verified_master=u.get("is_verified_master") or False,
                is_admin=u.get("is_admin") or False,
                balance=float(u.get("balance") or 0.0) if float(u.get("balance") or 0.0) > 0 else float(u.get("credits") or 0),
                credits=u.get("credits") or 0,
                created_at=u["created_at"],
                portfolio_url=u.get("portfolio_url"),
                role=u.get("role"),
                referred_by=u.get("referred_by"),
                certificate_url=u.get("certificate_url"),
                certificate_status=u.get("certificate_status") or "not_submitted",
                certificate_submitted_at=u.get("certificate_submitted_at"),
                certificate_rejection_reason=u.get("certificate_rejection_reason"),
            )
            for u in response.data
        ]
        
        total_count = response.count if response.count is not None else len(users_list)
        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 1
        
        return AdminUserPaginatedResponse(
            users=users_list,
            total=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
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
        update_payload: dict[str, object] = {"status": update_data.status}
        if update_data.status == "approved":
            update_payload["is_verified_master"] = True
        elif update_data.status in {"pending", "rejected"}:
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

            if target_user.get("role") == "master":
                supabase.table("notifications").insert({
                    "user_id": user_id,
                    "title": "Аккаунт мастера одобрен",
                    "message": "Ваш аккаунт одобрен администратором. Проверка сертификата отображается отдельным статусом.",
                    "type": "system"
                }).execute()
            
            # Send Email
            user_email = target_user.get("email")
            if user_email:
                send_transactional_email(
                    to_email=user_email,
                    subject="Ваш аккаунт мастера Tattoo Hub одобрен",
                    html_content="<h1>Добро пожаловать в Tattoo Hub!</h1><p>Ваш аккаунт одобрен. Статус проверки сертификата отображается отдельно в профиле.</p>"
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


@router.get("/users/{user_id}/certificate-url")
async def get_certificate_preview_url(
    user_id: str,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Create a short-lived URL for an admin to inspect a private certificate."""
    user_res = supabase.table("users").select("certificate_url, role").eq("id", user_id).single().execute()
    if not user_res.data or user_res.data.get("role") != "master":
        raise HTTPException(status_code=404, detail="Master not found")
    object_path = user_res.data.get("certificate_url")
    if not object_path:
        raise HTTPException(status_code=404, detail="Certificate not submitted")

    signed = supabase.storage.from_("certificates").create_signed_url(object_path, 600)
    signed_url = signed.get("signedURL") or signed.get("signedUrl") or signed.get("signed_url")
    if not signed_url:
        raise HTTPException(status_code=500, detail="Could not create certificate preview")
    return {"url": signed_url, "expires_in": 600}


@router.put("/users/{user_id}/certificate-review")
async def review_master_certificate(
    user_id: str,
    review: CertificateReview,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client),
):
    """Approve or reject a submitted master certificate."""
    user_res = supabase.table("users").select(
        "role, email, certificate_url, certificate_status"
    ).eq("id", user_id).single().execute()
    if not user_res.data or user_res.data.get("role") != "master":
        raise HTTPException(status_code=404, detail="Master not found")
    if not user_res.data.get("certificate_url"):
        raise HTTPException(status_code=400, detail="Certificate not submitted")
    try:
        ensure_certificate_reviewable(
            user_res.data.get("certificate_status") or "not_submitted"
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    try:
        update = build_certificate_review_update(
            review.status,
            review.reason,
            admin_user.user_id,
            datetime.now(timezone.utc),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    response = supabase.table("users").update(update).eq("id", user_id).eq(
        "certificate_status", "pending"
    ).eq("certificate_url", user_res.data["certificate_url"]).execute()
    if not response.data:
        raise HTTPException(status_code=409, detail="Certificate changed during review")

    approved = review.status == "approved"
    supabase.table("notifications").insert({
        "user_id": user_id,
        "title": "Сертификат подтверждён" if approved else "Сертификат отклонён",
        "message": (
            "Администратор проверил сертификат. На публичном профиле появился знак подтверждения обучения."
            if approved
            else f"Загрузите новый сертификат. Причина: {update['certificate_rejection_reason']}"
        ),
        "type": "system",
    }).execute()

    return {
        "certificate_status": review.status,
        "certificate_rejection_reason": update["certificate_rejection_reason"],
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Permanently delete a user from DB and Supabase Auth.
    Requires service_role key initialized client to delete from Auth.
    """
    try:
        # Delete from public.users table
        supabase.table("users").delete().eq("id", user_id).execute()
        
        # Delete from Supabase Auth (requires service_role)
        supabase.auth.admin.delete_user(user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )

@router.put("/users/{user_id}/balance")
async def update_user_balance(
    user_id: str,
    update_data: UserBalanceUpdate,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Update a user's credit balance."""
    try:
        update_payload = build_admin_balance_update(
            update_data.credits, update_data.balance
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        serialized_update = {
            key: float(value) if key == "balance" else value
            for key, value in update_payload.items()
        }
        response = supabase.table("users") \
            .update(serialized_update) \
            .eq("id", user_id) \
            .execute()
            
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Send Email notification for balance change
        updated_field, updated_value = next(iter(update_payload.items()))
        user_email = response.data[0].get("email")
        if user_email:
            send_transactional_email(
                to_email=user_email,
                subject="Ваш баланс Tattoo Hub обновлён",
                html_content=(
                    "<h1>Ваш баланс обновлён</h1>"
                    f"<p>{updated_field}: <strong>{updated_value}</strong>.</p>"
                ),
            )

        return {
            "message": "User balance updated",
            "updated": serialized_update,
        }
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
    response: Response,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status_filter: str | None = None,
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get all leads with unmasked contacts for admin."""
    try:
        query = supabase.table("leads").select("*, cities(country_id)")
        if status_filter:
            query = query.eq("status", status_filter)
        res = query.order("created_at", desc=True).limit(2000).execute()
        leads = res.data or []
        paginated_leads = leads[offset:offset+limit]
        has_more = len(leads) > offset + limit
        response.headers["X-Has-More"] = "true" if has_more else "false"
        
        for lead in paginated_leads:
            lead["country_id"] = lead.get("cities", {}).get("country_id") if lead.get("cities") else None
        return paginated_leads
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
                
            user_res = supabase.table("users").select("credits").eq("id", user_id).single().execute()
            if user_res.data:
                # We refund the original base_unlock_price in credits. 
                # (Assuming 1 credit = 1 EUR for simplicity, or we should have price_credits on leads?)
                # Actually, in leads.py price_credits is fixed at 50, but we'll fallback to price if price_credits doesn't exist
                # Let's get price_credits if it exists, otherwise use 50.
                lead_price_res = supabase.table("leads").select("price_credits").eq("id", dispute["lead_id"]).single().execute()
                refund_amount = lead_price_res.data.get("price_credits") if lead_price_res.data and lead_price_res.data.get("price_credits") else 50

                new_credits = float(user_res.data.get("credits", 0)) + float(refund_amount)
                supabase.table("users").update({"credits": new_credits}).eq("id", user_id).execute()
                
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

from app.services.currency_service import fetch_and_update_ecb_rates
from app.utils.currency import ExchangeRateCache

@router.get("/currency/rates")
async def get_currency_rates(
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get current exchange rates from Supabase table or cache."""
    try:
        res = supabase.table("exchange_rates").select("*").order("currency_code").execute()
        rates_data = res.data or []
        # Ensure cache is synced
        cached = ExchangeRateCache.get_rates(supabase)
        return {
            "rates": rates_data,
            "cached": cached,
            "base": "EUR"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/currency/sync-rates")
async def sync_currency_rates(
    admin_user: AuthUser = Depends(get_admin_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Fetch latest ECB exchange rates via Frankfurter API and update DB + cache."""
    try:
        result = await fetch_and_update_ecb_rates(supabase)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync currency rates: {str(e)}"
        )
