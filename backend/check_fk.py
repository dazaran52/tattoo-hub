import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv()

async def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase = await create_async_client(url, key)
    # just execute a rpc or raw sql... supabase python client cannot easily execute raw sql
    res = await supabase.table("leads").select("*, users!assigned_master_id(*)").limit(1).execute()
    print(res)

asyncio.run(main())
