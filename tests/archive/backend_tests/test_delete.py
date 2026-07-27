import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client, AsyncClient

load_dotenv("backend/.env")

async def main():
    supabase: AsyncClient = await create_async_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    try:
        res = await supabase.table("master_clients").update({"is_deleted": True}).eq("id", "123").execute()
        print(res)
    except Exception as e:
        print(f"ERROR: {e}")

asyncio.run(main())
