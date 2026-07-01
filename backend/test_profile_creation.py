import asyncio
from app.database import get_async_supabase_client
import uuid

async def main():
    client = await get_async_supabase_client()
    try:
        new_profile = {
            "id": "11111111-1111-1111-1111-111111111111",
            "username": None,
            "email": "test@test.com",
            "credits": 0,
            "own_referral_code": str(uuid.uuid4())[:8].upper(),
            "portfolio_url": None,
            "referred_by": None,
            "country_ids": [],
            "city_ids": [],
            "discount_tokens": 0,
            "withdrawable_credits": 0,
            "role": "master",
            "status": "approved",
            "is_verified_master": False,
            "certificate_url": None,
            "currency": "CZK",
            "balance": 0.0
        }
        res = await client.table("users").insert(new_profile).execute()
        print("Success:", res)
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
