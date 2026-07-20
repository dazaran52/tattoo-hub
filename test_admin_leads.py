import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv("backend/.env")

async def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase = await create_async_client(url, key)
    try:
        res = await supabase.table("users").select("id, leads(title)").limit(1).execute()
        print("Success")
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
