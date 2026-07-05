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
