"""Profile router for master data endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_supabase_client
from supabase import Client
import uuid


router = APIRouter(prefix="/api", tags=["profile"])


class ProfileResponse(BaseModel):
    """Profile data response model."""
    id: str
    email: str
    credits: int
    created_at: str | None = None
    display_name: str | None = None
    phone: str | None = None
    bio: str | None = None
    status: str = "pending"
    is_admin: bool = False
    portfolio_url: str | None = None
    own_referral_code: str | None = None
    referred_by: str | None = None
    country_ids: list[str] | None = None
    city_ids: list[str] | None = None
    discount_tokens: int = 0
    withdrawable_credits: int = 0
    unlocked_leads_count: int = 0
    gamification_level: str = "Newbie"
    role: str | None = None
    is_verified_master: bool = False
    certificate_url: str | None = None


class ProfileCreate(BaseModel):
    """Profile creation data."""
    id: str
    email: str


class ProfileUpdate(BaseModel):
    """Profile update data."""
    display_name: str | None = None
    phone: str | None = None
    bio: str | None = None


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
) -> ProfileResponse:
    """
    Get current master profile.
    
    If profile doesn't exist, creates it automatically with 0 credits.
    """
    data = None
    try:
        # Try to fetch existing profile
        response = supabase.table("users") \
            .select("*") \
            .eq("id", current_user.user_id) \
            .single() \
            .execute()
        
        if response.data:
            data = response.data
            
    except Exception:
        # Profile not found, will create below
        pass
    
    if not data:
        # Create new profile with 0 credits and a generated referral code
        try:
            portfolio_url = current_user.user_metadata.get("portfolio_url")
            referred_by = current_user.user_metadata.get("referred_by")
            country_ids = current_user.user_metadata.get("country_ids", [])
            city_ids = current_user.user_metadata.get("city_ids", [])
            role = current_user.user_metadata.get("role", "master")
            
            # Clients are automatically approved
            status = "approved" if role == "client" else "pending"
            
            new_profile = {
                "id": current_user.user_id,
                "email": current_user.email,
                "credits": 0,
                "own_referral_code": str(uuid.uuid4())[:8].upper(),
                "portfolio_url": portfolio_url,
                "referred_by": referred_by,
                "country_ids": country_ids,
                "city_ids": city_ids,
                "discount_tokens": 0,
                "withdrawable_credits": 0,
                "role": role,
                "status": status,
                "is_verified_master": False,
                "certificate_url": None
            }
            
            response = supabase.table("users").insert(new_profile).execute()
            if response.data and len(response.data) > 0:
                data = response.data[0]
                
                # Notify admins about new pending master
                if role == "master":
                    try:
                        admin_res = supabase.table("users").select("id").eq("is_admin", True).execute()
                        for admin in (admin_res.data or []):
                            supabase.table("notifications").insert({
                                "user_id": admin["id"],
                                "title": "Новая регистрация мастера",
                                "message": f"Новый мастер зарегистрировался ({current_user.email}) и ожидает проверки.",
                                "type": "system"
                            }).execute()
                    except Exception as e:
                        print(f"Error notifying admins: {e}")
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create profile"
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating profile: {str(e)}"
            )

    # Calculate unlocks and gamification level
    unlocks_res = supabase.table("lead_unlocks").select("id", count="exact").eq("user_id", current_user.user_id).execute()
    unlocked_count = unlocks_res.count if unlocks_res.count is not None else len(unlocks_res.data)
    
    level = "Newbie"
    if unlocked_count >= 10:
        level = "Elite"
    elif unlocked_count >= 3:
        level = "Pro"
        
    return ProfileResponse(
        id=data["id"],
        email=data["email"],
        credits=data["credits"],
        created_at=data.get("created_at"),
        display_name=data.get("display_name"),
        phone=data.get("phone"),
        bio=data.get("bio"),
        status=data.get("status", "pending"),
        is_admin=data.get("is_admin", False),
        portfolio_url=data.get("portfolio_url"),
        own_referral_code=data.get("own_referral_code"),
        referred_by=data.get("referred_by"),
        country_ids=data.get("country_ids", []),
        city_ids=data.get("city_ids", []),
        discount_tokens=data.get("discount_tokens", 0),
        unlocked_leads_count=unlocked_count,
        gamification_level=level,
        withdrawable_credits=data.get("withdrawable_credits", 0),
        role=data.get("role"),
        is_verified_master=data.get("is_verified_master", False),
        certificate_url=data.get("certificate_url")
    )


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    update_data: ProfileUpdate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
) -> ProfileResponse:
    """
    Update current user profile.
    """
    try:
        print(f"DEBUG PUT: user_id={current_user.user_id}")
        print(f"DEBUG PUT: update_data={update_data.model_dump()}")
        
        # Build update dict with only provided fields
        update_dict = {}
        if update_data.display_name is not None:
            update_dict["display_name"] = update_data.display_name
        if update_data.phone is not None:
            update_dict["phone"] = update_data.phone
        if update_data.bio is not None:
            update_dict["bio"] = update_data.bio
        
        print(f"DEBUG PUT: update_dict={update_dict}")
        
        if not update_dict:
            # No fields to update, return current profile
            print("DEBUG PUT: No fields to update, fetching current profile")
            response = supabase.table("users") \
                .select("*") \
                .eq("id", current_user.user_id) \
                .single() \
                .execute()
            data = response.data
            print(f"DEBUG PUT: fetched data={data}")
        else:
            # Update profile
            print(f"DEBUG PUT: Executing update")
            response = supabase.table("users") \
                .update(update_dict) \
                .eq("id", current_user.user_id) \
                .execute()
            print(f"DEBUG PUT: response={response}")
            print(f"DEBUG PUT: response.data={response.data}")
            data = response.data[0] if response.data else None
        
        if not data:
            print("DEBUG PUT: No data returned")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        unlocks_res = supabase.table("lead_unlocks").select("id", count="exact").eq("user_id", current_user.user_id).execute()
        unlocked_count = unlocks_res.count if unlocks_res.count is not None else len(unlocks_res.data)
        
        level = "Newbie"
        if unlocked_count >= 10:
            level = "Elite"
        elif unlocked_count >= 3:
            level = "Pro"
            
        print(f"DEBUG PUT: Success, returning profile")
        return ProfileResponse(
            id=data["id"],
            email=data["email"],
            credits=data["credits"],
            created_at=data.get("created_at"),
            display_name=data.get("display_name"),
            phone=data.get("phone"),
            bio=data.get("bio"),
            status=data.get("status", "pending"),
            is_admin=data.get("is_admin", False),
            portfolio_url=data.get("portfolio_url"),
            own_referral_code=data.get("own_referral_code"),
            referred_by=data.get("referred_by"),
            country_ids=data.get("country_ids", []),
            city_ids=data.get("city_ids", []),
            discount_tokens=data.get("discount_tokens", 0),
            unlocked_leads_count=unlocked_count,
            gamification_level=level,
            withdrawable_credits=data.get("withdrawable_credits", 0),
            role=data.get("role"),
            is_verified_master=data.get("is_verified_master", False),
            certificate_url=data.get("certificate_url")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG PUT ERROR: {type(e).__name__}: {e}")
        import traceback
        print(f"DEBUG PUT TRACEBACK: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating profile: {str(e)}"
        )


@router.get("/my-leads")
async def get_my_leads(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get leads unlocked by the current user."""
    try:
        unlocks_res = supabase.table("lead_unlocks") \
            .select("lead_id") \
            .eq("user_id", current_user.user_id) \
            .execute()
        
        lead_ids = [u["lead_id"] for u in (unlocks_res.data or [])]
        
        if not lead_ids:
            return []
            
        leads_res = supabase.table("leads") \
            .select("*") \
            .in_("id", lead_ids) \
            .order("created_at", desc=True) \
            .execute()
            
        leads = leads_res.data or []
        
        # Check active auctions to hide contacts
        auctions_res = supabase.table("auctions") \
            .select("lead_id") \
            .eq("status", "active") \
            .execute()
        auction_lead_ids = {a["lead_id"] for a in (auctions_res.data or [])}
        
        processed_leads = []
        for lead in leads:
            if lead["id"] in auction_lead_ids:
                contact_info = "******** [Лид на аукционе]"
            else:
                contact_info = lead["contacts"]
                
            processed_leads.append({
                "id": lead["id"],
                "title": lead["title"],
                "description": lead["description"],
                "contacts": contact_info,
                "price_credits": lead["price_credits"],
                "is_unlocked": True,
                "image_urls": lead.get("image_urls", []),
                "created_at": lead.get("created_at"),
                "country_id": lead.get("country_id"),
                "city_id": lead.get("city_id")
            })
            
        return processed_leads
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching my leads: {str(e)}"
        )

@router.get("/proposals")
async def get_my_proposals(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get all proposals made by the current master for the CRM board."""
    try:
        props_res = supabase.table("lead_proposals").select(
            "lead_id, status, price_offer, proposed_dates, leads(title, description, image_urls, client_priority)"
        ).eq("user_id", current_user.user_id).execute()
        
        return props_res.data or []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching proposals: {str(e)}"
        )

@router.delete("/city/{city_id}")
async def remove_city(
    city_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Remove a city from master's preferences."""
    try:
        supabase.table("user_cities").delete().eq("user_id", current_user.user_id).eq("city_id", city_id).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AnalyticsResponse(BaseModel):
    total_spent_credits: int
    total_leads_bought: int
    activity_by_day: list[dict]

@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get user analytics for the dashboard."""
    try:
        # Fetch all unlocked leads for the user with their prices
        unlocks_res = supabase.table("lead_unlocks").select("unlocked_at, leads(price)").eq("user_id", current_user.user_id).execute()
        
        total_spent = 0
        total_leads = len(unlocks_res.data)
        
        from collections import defaultdict
        from datetime import datetime
        
        daily_activity = defaultdict(lambda: {"spent": 0, "bought": 0})
        
        for unlock in unlocks_res.data:
            price = unlock.get("leads", {}).get("price", 0) if unlock.get("leads") else 0
            # If price is missing or null, default to 0
            if price is None:
                price = 0
                
            total_spent += price
            
            # Format date as YYYY-MM-DD
            date_str = unlock["unlocked_at"][:10] if unlock.get("unlocked_at") else datetime.utcnow().strftime("%Y-%m-%d")
            daily_activity[date_str]["spent"] += price
            daily_activity[date_str]["bought"] += 1
            
        # Convert to list and sort by date
        activity_list = [{"date": k, "spent": v["spent"], "bought": v["bought"]} for k, v in daily_activity.items()]
        activity_list.sort(key=lambda x: x["date"])
        
        # Fill empty days for the last 7 days if empty
        if not activity_list:
            today = datetime.utcnow().strftime("%Y-%m-%d")
            activity_list = [{"date": today, "spent": 0, "bought": 0}]
            
        return {
            "total_spent_credits": total_spent,
            "total_leads_bought": total_leads,
            "activity_by_day": activity_list[-30:] # Last 30 days of activity
        }
    except Exception as e:
        print(f"Analytics error: {e}")
        # Return empty stats on error
        return {
            "total_spent_credits": 0,
            "total_leads_bought": 0,
            "activity_by_day": []
        }


@router.delete("/profile", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Delete current user profile from DB and delete their auth account from Supabase Auth.
    """
    try:
        # 1. Delete public.users table record
        supabase.table("users").delete().eq("id", current_user.user_id).execute()
        
        # 2. Delete Supabase Auth account
        supabase.auth.admin.delete_user(current_user.user_id)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting profile: {str(e)}"
        )

