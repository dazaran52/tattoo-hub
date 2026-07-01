import asyncio
from app.routers.profile import get_profile
from app.middleware.auth import AuthUser
from app.database import get_async_supabase_client
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

async def main():
    # 1. Create a user in auth.users
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    client = create_client(url, key)
    res = client.auth.admin.create_user({"email": "test44@test.com", "password": "password"})
    user_id = res.user.id
    
    # 2. Mock current_user
    current_user = AuthUser(user_id=user_id, email="test44@test.com", user_metadata={"role": "client"})
    
    # 3. Call get_profile
    async_client = await get_async_supabase_client()
    try:
        profile = await get_profile(current_user=current_user, supabase=async_client)
        print("Profile created:", profile)
    except Exception as e:
        print("Error getting profile:", e)

asyncio.run(main())
