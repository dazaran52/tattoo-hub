from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_supabase_client
from app.config import get_settings
from supabase import Client
import httpx
import uuid
import urllib.parse

router = APIRouter(prefix="/api/instagram", tags=["instagram"])

class ImportRequest(BaseModel):
    url: str

class ExchangeTokenRequest(BaseModel):
    code: str

class ImportBatchRequest(BaseModel):
    urls: list[str]

@router.get("/auth-url")
async def get_instagram_auth_url():
    """Generates the OAuth URL for Instagram Basic Display API"""
    settings = get_settings()
    if not settings.INSTAGRAM_CLIENT_ID or not settings.INSTAGRAM_REDIRECT_URI:
        # Fallback for development if keys are not set
        return {"url": None, "error": "Instagram API credentials not configured"}
        
    url = f"https://api.instagram.com/oauth/authorize?client_id={settings.INSTAGRAM_CLIENT_ID}&redirect_uri={settings.INSTAGRAM_REDIRECT_URI}&scope=user_profile,user_media&response_type=code"
    return {"url": url}

@router.post("/exchange-token")
async def exchange_token_and_get_media(
    req: ExchangeTokenRequest,
    current_user: AuthUser = Depends(get_current_user)
):
    """Exchanges code for token and fetches user's recent media"""
    settings = get_settings()
    if not settings.INSTAGRAM_CLIENT_ID or not settings.INSTAGRAM_CLIENT_SECRET or not settings.INSTAGRAM_REDIRECT_URI:
        raise HTTPException(status_code=500, detail="Instagram API credentials not configured")

    async with httpx.AsyncClient() as client:
        # 1. Exchange code for short-lived token
        token_res = await client.post(
            "https://api.instagram.com/oauth/access_token",
            data={
                "client_id": settings.INSTAGRAM_CLIENT_ID,
                "client_secret": settings.INSTAGRAM_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": settings.INSTAGRAM_REDIRECT_URI,
                "code": req.code
            }
        )
        
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to get token: {token_res.text}")
            
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        
        # 2. Get user media
        media_res = await client.get(
            f"https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&access_token={access_token}"
        )
        
        if media_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to fetch media: {media_res.text}")
            
        return {"media": media_res.json().get("data", [])}

class FetchUserPostsRequest(BaseModel):
    username: str

@router.post("/fetch-user-posts")
async def fetch_user_posts(
    req: FetchUserPostsRequest,
    current_user: AuthUser = Depends(get_current_user)
):
    """Fetches public posts for a given Instagram username using RapidAPI"""
    settings = get_settings()
    if not settings.RAPIDAPI_KEY:
        raise HTTPException(status_code=500, detail="RapidAPI key not configured in settings")

    async with httpx.AsyncClient() as client:
        # Using instagram-scraper-api2 from RapidAPI
        url = "https://instagram-scraper-api2.p.rapidapi.com/v1.2/posts"
        querystring = {"username_or_id_or_url": req.username}
        headers = {
            "x-rapidapi-key": settings.RAPIDAPI_KEY,
            "x-rapidapi-host": "instagram-scraper-api2.p.rapidapi.com"
        }
        
        res = await client.get(url, headers=headers, params=querystring)
        
        if res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Failed to fetch posts from RapidAPI: {res.text}")
            
        data = res.json()
        items = data.get("data", {}).get("items", [])
        
        # Transform the response to match what the frontend expects
        # Our frontend expects: id, media_type, media_url, thumbnail_url, permalink
        media_list = []
        for item in items:
            media_type = "IMAGE"
            # RapidAPI returns media_type: 1 (photo), 2 (video), 8 (carousel)
            raw_type = item.get("media_type")
            if raw_type == 8:
                media_type = "CAROUSEL_ALBUM"
            elif raw_type == 2:
                media_type = "VIDEO"
                
            code = item.get("code")
            permalink = f"https://www.instagram.com/p/{code}/" if code else ""
            
            # Find the best image resolution
            image_versions = item.get("image_versions2", {}).get("candidates", [])
            media_url = ""
            if image_versions:
                media_url = image_versions[0].get("url", "")
                
            # If carousel, get the first image
            if not media_url and media_type == "CAROUSEL_ALBUM":
                carousel_media = item.get("carousel_media", [])
                if carousel_media:
                    first_item_images = carousel_media[0].get("image_versions2", {}).get("candidates", [])
                    if first_item_images:
                        media_url = first_item_images[0].get("url", "")
            
            if media_url:
                media_list.append({
                    "id": item.get("id"),
                    "media_type": media_type,
                    "media_url": media_url,
                    "thumbnail_url": media_url,
                    "permalink": permalink,
                    "caption": item.get("caption", {}).get("text", "") if item.get("caption") else ""
                })
                
        return {"media": media_list}

@router.post("/import-batch")
async def import_batch_media(
    req: ImportBatchRequest,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Downloads multiple Instagram CDN images and saves them to Supabase"""
    public_urls = []
    
    async with httpx.AsyncClient() as client:
        for url in req.urls:
            try:
                response = await client.get(url, follow_redirects=True)
                response.raise_for_status()
                
                content_type = response.headers.get('Content-Type', '')
                if not content_type.startswith('image/'):
                    continue # Skip non-images
                    
                image_data = response.content
                
                file_ext = "jpg"
                if "webp" in content_type: file_ext = "webp"
                elif "png" in content_type: file_ext = "png"
                
                filename = f"{current_user.user_id}-{uuid.uuid4().hex[:8]}.{file_ext}"
                filepath = f"portfolio/{filename}"

                # Upload synchronously
                supabase.storage.from_("portfolio").upload(
                    filepath,
                    image_data,
                    {"content-type": content_type}
                )
                
                public_url = supabase.storage.from_("portfolio").get_public_url(filepath)
                public_urls.append(public_url)
            except Exception as e:
                print(f"Failed to import URL {url}: {e}")
                
    return {"public_urls": public_urls}

# Keep the old endpoint just in case
@router.post("/import")
async def import_instagram_media(
    req: ImportRequest,
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    res = await import_batch_media(ImportBatchRequest(urls=[req.url]), current_user, supabase)
    urls = res.get("public_urls", [])
    if not urls:
        raise HTTPException(status_code=400, detail="Failed to import image")
    return {"public_url": urls[0]}
