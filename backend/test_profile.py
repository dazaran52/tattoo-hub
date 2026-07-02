import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from app.database import get_async_supabase_client
from app.routers.profile import update_profile, ProfileUpdate
from app.middleware.auth import AuthUser

async def test():
    client = get_async_supabase_client()
    user = AuthUser(
        user_id="d2110a58-6b45-4394-9878-a28d57d7629c", # Just a dummy, but we need a real one if RLS
        email="test@test.com",
        user_metadata={}
    )
    # Let's find a real user id
    res = await client.table("users").select("id").limit(1).execute()
    if not res.data:
        print("No users found")
        return
    user.user_id = res.data[0]["id"]
    
    update_data = ProfileUpdate(avatar_url="https://test.com/avatar.jpg")
    try:
        res = await update_profile(update_data=update_data, current_user=user, supabase=client)
        print("Success:", res)
    except Exception as e:
        print("Error:", type(e).__name__, e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
