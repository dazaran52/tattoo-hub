import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.routers.leads import get_marketplace_leads
from app.database import get_async_supabase_client

class MockAuthUser:
    def __init__(self):
        self.user_id = "ebc11438-6cf3-40e1-bbd4-4dbde784eec4" # some random user id
        self.email = "test@example.com"
        self.user_metadata = {}

async def main():
    supabase = await get_async_supabase_client()
    user = MockAuthUser()
    try:
        leads = await get_marketplace_leads(current_user=user, supabase=supabase)
        print("Success, found", len(leads))
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("Error:", e)

asyncio.run(main())
