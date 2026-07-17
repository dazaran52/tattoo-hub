import asyncio
from supabase._async.client import AsyncClient
import os
from dotenv import load_dotenv

load_dotenv("/home/dazaran/Загрузки/Tattoo HUB/backend/.env")

async def main():
    supabase = AsyncClient(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    res = await supabase.table("users").select("*").order("created_at", desc=True).limit(20).execute()
    for u in res.data:
        print(u["email"], u["role"], u["status"], u["created_at"])

asyncio.run(main())
