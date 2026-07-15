import asyncio
from app.database import get_async_supabase_client
from app.routers.profile import get_profile
from app.middleware.auth import AuthUser

async def main():
    supabase = await get_async_supabase_client()
    
    user = AuthUser(
        user_id="dummy",
        email="fenix.mcferson@gmail.com",
        user_metadata={}
    )
    
    res = await supabase.auth.admin.list_users()
    users = res if isinstance(res, list) else res.users
    for u in users:
        if u.email == "fenix.mcferson@gmail.com":
            user.user_id = u.id
            user.user_metadata = u.user_metadata
            break
            
    try:
        profile = await get_profile(current_user=user, supabase=supabase)
        print("Success:", profile)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
