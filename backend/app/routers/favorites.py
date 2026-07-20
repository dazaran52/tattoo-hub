from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.database import get_async_supabase_client
from supabase._async.client import AsyncClient
from app.middleware.auth import get_current_user, AuthUser
from datetime import datetime

router = APIRouter(prefix="/api/favorites", tags=["favorites"])

@router.get("")
async def get_favorites(
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """
    Get a list of master_ids that the current client has favorited.
    """
    try:
        response = await supabase.table("favorites") \
            .select("master_id") \
            .eq("client_id", current_user.user_id) \
            .execute()
            
        return [row["master_id"] for row in response.data or []]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching favorites: {str(e)}"
        )

@router.post("/{master_id}")
async def add_favorite(
    master_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """
    Add a master to favorites.
    """
    try:
        # Check if already exists to avoid duplicate errors
        check = await supabase.table("favorites") \
            .select("id") \
            .eq("client_id", current_user.user_id) \
            .eq("master_id", master_id) \
            .execute()
            
        if not check.data:
            await supabase.table("favorites").insert({
                "client_id": current_user.user_id,
                "master_id": master_id
            }).execute()
            
        return {"status": "success", "message": "Добавлено в избранное"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding to favorites: {str(e)}"
        )

@router.delete("/{master_id}")
async def remove_favorite(
    master_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """
    Remove a master from favorites.
    """
    try:
        await supabase.table("favorites") \
            .delete() \
            .eq("client_id", current_user.user_id) \
            .eq("master_id", master_id) \
            .execute()
            
        return {"status": "success", "message": "Удалено из избранного"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error removing from favorites: {str(e)}"
        )
