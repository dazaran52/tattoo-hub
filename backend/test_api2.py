import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.routers.leads import get_marketplace_leads
from app.database import get_async_supabase_client

class MockAuthUser:
    def __init__(self, user_id, email):
        self.user_id = user_id
        self.email = email
        self.user_metadata = {}

async def main():
    supabase = await get_async_supabase_client()
    
    # get user id
    res = await supabase.table("users").select("id").eq("email", "fenix.mcferson@gmail.com").execute()
    if not res.data:
        print("User not found")
        return
    user_id = res.data[0]["id"]
    print("User ID:", user_id)
    
    user = MockAuthUser(user_id, "fenix.mcferson@gmail.com")
    try:
        leads = await get_marketplace_leads(current_user=user, supabase=supabase)
        print("Success, found", len(leads))
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("Error:", repr(e))

asyncio.run(main())
