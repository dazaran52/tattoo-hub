from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.database import get_async_supabase_client
from supabase._async.client import AsyncClient
import uuid

router = APIRouter(prefix="/api/public", tags=["public"])

class PublicMasterResponse(BaseModel):
    id: str
    username: str | None = None
    display_name: str | None = None
    bio: str | None = None
    portfolio_url: str | None = None
    city_ids: list[str] | None = None
    is_verified_master: bool = False
    portfolio_image_urls: list[str] | None = None
    theme: str = "system"

@router.get("/master/{username_or_id}", response_model=PublicMasterResponse)
async def get_public_master(
    username_or_id: str,
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """
    Get public profile of a master by their unique username or UUID.
    Only approved masters are returned.
    """
    try:
        # Check if it's a UUID
        is_uuid = False
        try:
            uuid.UUID(username_or_id)
            is_uuid = True
        except ValueError:
            pass

        query = supabase.table("users").select("id, username, display_name, bio, portfolio_url, city_ids, is_verified_master, status, role, portfolio_image_urls, theme")
        
        if is_uuid:
            query = query.eq("id", username_or_id)
        else:
            query = query.eq("username", username_or_id)

        response = await query.single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Мастер не найден")
            
        data = response.data
        
        # Ensure it's a master
        if data.get("role") != "master":
            raise HTTPException(status_code=404, detail="Мастер не найден")

        return PublicMasterResponse(
            id=data["id"],
            username=data.get("username"),
            display_name=data.get("display_name"),
            bio=data.get("bio"),
            portfolio_url=data.get("portfolio_url"),
            city_ids=data.get("city_ids", []),
            is_verified_master=data.get("is_verified_master", False),
            portfolio_image_urls=data.get("portfolio_image_urls", []),
            theme=data.get("theme", "system")
        )

    except HTTPException:
        raise
    except Exception as e:
        if "row not found" in str(e).lower() or "not find" in str(e).lower():
            raise HTTPException(status_code=404, detail="Мастер не найден")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching master profile: {str(e)}"
        )
