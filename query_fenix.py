import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv(dotenv_path="backend/.env")

async def main():
    supabase = await create_async_client(
        os.environ.get("SUPABASE_URL"),
        os.environ.get("SUPABASE_KEY")
    )
    res = await supabase.table("users").select("balance, credits").eq("email", "fenix.mcferson@gmail.com").execute()
    print(res.data)

asyncio.run(main())
