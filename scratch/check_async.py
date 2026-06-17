import asyncio
from supabase._async.client import create_client as create_async_client
import os
from dotenv import load_dotenv

load_dotenv("/home/dazaran/Загрузки/Tattoo HUB/backend/.env")

async def test():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    client = await create_async_client(url, key)
    res = await client.table("users").select("id").limit(1).execute()
    print("Success:", res)

asyncio.run(test())
