import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from app.database import get_async_supabase_client
from app.routers.profile import update_profile, ProfileUpdate
from app.middleware.auth import AuthUser

async def test():
    client = await get_async_supabase_client()
    user = AuthUser(
        user_id="26871c06-2686-406b-be67-86ad63f9505c", # the same user
        email="fenix.mcferson@gmail.com",
        user_metadata={}
    )
    
    update_data = ProfileUpdate(
        username="dazaran",
        display_name="dazaran",
        phone="+420 728 715 574",
        bio="делаю партаки",
        portfolio_url="https://instagram.com/dazaran",
        country_ids=["2a71599c-91f2-4461-b77b-86a150db3aab"],
        city_ids=["349c9e1a-01a2-41db-b5b0-f9c12df92ccf"],
        theme="violet"
    )
    try:
        res = await update_profile(update_data=update_data, current_user=user, supabase=client)
        print("Success:", res)
    except Exception as e:
        print("Error:", type(e).__name__, e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
