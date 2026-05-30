"""Profile router for master data endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_supabase_client
from supabase import Client


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
    try:
        # Try to fetch existing profile
        response = supabase.table("users") \
            .select("*") \
            .eq("id", current_user.user_id) \
            .single() \
            .execute()
        
        if response.data:
            # Profile exists, return it
            data = response.data
            return ProfileResponse(
                id=data["id"],
                email=data["email"],
                credits=data["credits"],
                created_at=data.get("created_at"),
                display_name=data.get("display_name"),
                phone=data.get("phone"),
                bio=data.get("bio"),
                status=data.get("status", "pending"),
                is_admin=data.get("is_admin", False)
            )
        
    except Exception:
        # Profile not found, will create below
        pass
    
    # Create new profile with 0 credits
    try:
        new_profile = {
            "id": current_user.user_id,
            "email": current_user.email,
            "credits": 0
        }
        
        response = supabase.table("users") \
            .insert(new_profile) \
            .execute()
        
        if response.data and len(response.data) > 0:
            data = response.data[0]
            return ProfileResponse(
                id=data["id"],
                email=data["email"],
                credits=data["credits"],
                created_at=data.get("created_at"),
                display_name=data.get("display_name"),
                phone=data.get("phone"),
                bio=data.get("bio"),
                status=data.get("status", "pending"),
                is_admin=data.get("is_admin", False)
            )
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
            is_admin=data.get("is_admin", False)
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

