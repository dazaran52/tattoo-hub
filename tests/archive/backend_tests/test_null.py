import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import get_async_supabase_client

async def main():
    supabase = await get_async_supabase_client()
    res = await supabase.table("leads").select("id, base_unlock_price_eur").is_("base_unlock_price_eur", "null").execute()
    print("Leads with NULL base_unlock_price_eur:", len(res.data))

asyncio.run(main())
