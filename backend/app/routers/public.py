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
    badge_tier: str = "none"
    badge_expires_at: str | None = None
    certificate_status: str = "not_submitted"
    portfolio_posts: list[dict] = []
    theme: str = "system"
    avatar_url: str | None = None
    rating: float = 0.0
    review_count: int = 0
    styles: list[str] = []
    last_seen: str | None = None

@router.get("/masters", response_model=list[PublicMasterResponse])
async def get_public_masters(
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """
    Get a list of top verified masters for the marketplace feed.
    """
    try:
        query = supabase.table("users").select(
            "id, username, display_name, bio, portfolio_url, city_ids, styles, is_verified_master, badge_tier, badge_expires_at, certificate_status, status, role, theme, avatar_url, last_seen, portfolio_posts(id, media, description, created_at), master_reviews!master_reviews_master_id_fkey(rating), is_admin"
        ).eq("role", "master").eq("is_verified_master", True).eq("status", "approved")
        
        response = await query.execute()
        
        masters_list = []
        for data in response.data or []:
            if data.get("is_admin") is True:
                continue
            
            # Sort posts by created_at desc
            posts = data.get("portfolio_posts") or []
            posts.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            
            # Limit posts to 3 for the feed
            top_posts = posts[:3]

            # Calculate rating
            reviews = data.get("master_reviews!master_reviews_master_id_fkey") or []
            review_count = len(reviews)
            rating = sum([r.get("rating", 0) for r in reviews]) / review_count if review_count > 0 else 0.0

            # Generate a pseudo trust score to sort by (e.g. rating * log(reviews))
            # For simplicity, we just use rating + (reviews * 0.1) as a sort key
            sort_score = rating + (review_count * 0.1)
            
            masters_list.append({
                "master": PublicMasterResponse(
                    id=data["id"],
                    username=data.get("username"),
                    display_name=data.get("display_name"),
                    bio=data.get("bio"),
                    portfolio_url=data.get("portfolio_url"),
                    city_ids=data.get("city_ids", []),
                    is_verified_master=data.get("is_verified_master", False),
                    certificate_status=data.get("certificate_status") or "not_submitted",
                    portfolio_posts=top_posts,
                    theme=data.get("theme", "system"),
                    avatar_url=data.get("avatar_url"),
                    rating=round(rating, 1),
                    review_count=review_count,
                    styles=data.get("styles") or [],
                    last_seen=data.get("last_seen")
                ),
                "score": sort_score
            })
            
        masters_list.sort(key=lambda x: x["score"], reverse=True)
        return [item["master"] for item in masters_list]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching top masters: {str(e)}"
        )

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

        query = supabase.table("users").select(
            "id, username, display_name, bio, portfolio_url, city_ids, styles, is_verified_master, certificate_status, status, role, theme, avatar_url, last_seen, portfolio_posts(id, media, description, created_at), master_reviews!master_reviews_master_id_fkey(rating)"
        )
        
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

        # Sort posts by created_at desc
        posts = data.get("portfolio_posts") or []
        posts.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        # Calculate rating
        reviews = data.get("master_reviews!master_reviews_master_id_fkey") or []
        review_count = len(reviews)
        rating = sum([r.get("rating", 0) for r in reviews]) / review_count if review_count > 0 else 0.0

        return PublicMasterResponse(
            id=data["id"],
            username=data.get("username"),
            display_name=data.get("display_name"),
            bio=data.get("bio"),
            portfolio_url=data.get("portfolio_url"),
            city_ids=data.get("city_ids", []),
            is_verified_master=data.get("is_verified_master", False),
            certificate_status=data.get("certificate_status") or "not_submitted",
            portfolio_posts=posts,
            theme=data.get("theme", "system"),
            avatar_url=data.get("avatar_url"),
            rating=round(rating, 1),
            review_count=review_count,
            styles=data.get("styles") or [],
            last_seen=data.get("last_seen")
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

@router.get("/master/{username_or_id}/reviews")
async def get_public_master_reviews(
    username_or_id: str,
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Get all reviews for a master."""
    try:
        # Check if it's a UUID
        is_uuid = False
        try:
            uuid.UUID(username_or_id)
            is_uuid = True
        except ValueError:
            pass

        query = supabase.table("users").select("id").eq("role", "master")
        if is_uuid:
            query = query.eq("id", username_or_id)
        else:
            query = query.eq("username", username_or_id)
            
        master_res = await query.single().execute()
        if not master_res.data:
            raise HTTPException(status_code=404, detail="Мастер не найден")
            
        master_id = master_res.data["id"]

        # Fetch reviews
        reviews_res = await supabase.table("master_reviews") \
            .select("*, users!client_id(display_name, username)") \
            .eq("master_id", master_id) \
            .order("created_at", desc=True) \
            .execute()
            
        reviews = reviews_res.data or []
        # Format the response
        formatted = []
        for r in reviews:
            client_info = r.get("users") or {}
            client_name = client_info.get("display_name") or client_info.get("username") or "Анонимный клиент"
            formatted.append({
                "id": r["id"],
                "rating": r["rating"],
                "text": r.get("text"),
                "created_at": r["created_at"],
                "client_name": client_name
            })
            
        return formatted
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
