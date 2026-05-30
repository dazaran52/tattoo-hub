from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_supabase_client
from supabase import Client

router = APIRouter(prefix="/api/admin", tags=["admin"])

class UserStatusUpdate(BaseModel):
    status: str

class AdminUserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    phone: str | None = None
    bio: str | None = None
    status: str
    credits: int
    created_at: str

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
                credits=u["credits"],
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
        response = supabase.table("users") \
            .update({"status": update_data.status}) \
            .eq("id", user_id) \
            .execute()
            
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        return {"message": f"User status updated to {update_data.status}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user status: {str(e)}"
        )
