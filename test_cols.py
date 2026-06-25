import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client, AsyncClient

load_dotenv("backend/.env")

async def main():
    supabase: AsyncClient = await create_async_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    res = await supabase.table("master_clients").select("*").limit(1).execute()
    print(res.data)

asyncio.run(main())
