import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client, AsyncClient

load_dotenv("backend/.env")

async def main():
    supabase: AsyncClient = await create_async_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    res = await supabase.table("leads").select("*").order("created_at", desc=True).limit(2).execute()
    for row in res.data:
        print(row)

asyncio.run(main())
