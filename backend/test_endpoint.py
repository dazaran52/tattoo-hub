import asyncio
from app.routers.chat import get_my_chats
from app.middleware.auth import AuthUser
from app.database import get_supabase_client

async def main():
    user = AuthUser(user_id="26871c06-2686-406b-be67-86ad63f9505c", email="fenix.mcferson@gmail.com", user_metadata={"role": "master"})
    supabase = get_supabase_client()
    try:
        res = await get_my_chats(limit=50, offset=0, current_user=user, supabase=supabase)
        print("Success! Got chats:", len(res))
    except Exception as e:
        print("Error:", type(e).__name__, e)

asyncio.run(main())
