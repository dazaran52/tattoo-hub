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
        res = await supabase.table("leads").select("is_personal").limit(1).execute()
        print("Success:", res.data)
    except Exception as e:
        print("Error:", repr(e))

asyncio.run(main())
