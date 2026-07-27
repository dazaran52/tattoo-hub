import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import get_async_supabase_client
import uuid

async def main():
    supabase = await get_async_supabase_client()
    try:
        user_id = str(uuid.uuid4())
        # Simulate the exact query from marketplace
        res = await supabase.table("leads").select("*, cities(country_id)").or_(f"assigned_master_id.is.null,and(assigned_master_id.eq.{user_id},is_personal.eq.false)").neq("status", "closed").order("created_at", desc=True).execute()
        print("Success:", len(res.data))
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("Error:", e)

asyncio.run(main())
