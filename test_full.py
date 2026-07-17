import asyncio
import os
import uuid
import httpx
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv("backend/.env")

async def main():
    supabase = await create_async_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    
    # 1. Register a new user
    fake_email = f"test_{uuid.uuid4().hex[:6]}@tattoohub.cz"
    res = await supabase.auth.sign_up({
        "email": fake_email,
        "password": "password123",
        "options": {
            "data": {
                "role": "client",
                "username": fake_email.split('@')[0]
            }
        }
    })
    
    if not res.session:
        print("Failed to register:", res)
        return
        
    token = res.session.access_token
    print(f"Registered {fake_email}")
    
    # 2. Call the GET /api/profile directly on python router logic instead of HTTP if backend is not running
    import sys
    sys.path.insert(0, "backend")
    from app.routers.profile import get_profile
    from app.middleware.auth import AuthUser
    
    auth_user = AuthUser(user_id=res.user.id, email=res.user.email, user_metadata=res.user.user_metadata)
    
    try:
        profile = await get_profile(background_tasks=None, current_user=auth_user, supabase=supabase)
        print("Profile created successfully:", profile)
    except Exception as e:
        print(f"EXCEPTION: {type(e).__name__}: {e}")
        
    # Cleanup
    await supabase.auth.admin.delete_user(res.user.id)
    print("Cleaned up user")

asyncio.run(main())
