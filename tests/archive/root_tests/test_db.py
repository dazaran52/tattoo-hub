import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv("backend/.env")

async def main():
    supabase = await create_async_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    
    # Try inserting a dummy user
    try:
        new_profile = {
            "id": "00000000-0000-0000-0000-000000000000",
            "username": None,
            "email": "test1@test.com",
            "credits": 0,
            "own_referral_code": "TEST1",
            "role": "client",
            "status": "approved",
            "balance": 0.0
        }
        res = await supabase.table("users").insert(new_profile).execute()
        print(res.data)
        await supabase.table("users").delete().eq("id", "00000000-0000-0000-0000-000000000000").execute()
    except Exception as e:
        print(f"ERROR: {e}")

asyncio.run(main())
