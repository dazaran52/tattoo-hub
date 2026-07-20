import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv("backend/.env")

async def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase = await create_async_client(url, key)
    res = await supabase.table("leads").select("*").order("created_at", desc=True).limit(3).execute()
    for row in res.data:
        print("Lead:", row.get("id"), row.get("title"), row.get("client_id"), row.get("assigned_master_id"), row.get("status"), row.get("is_personal"))

asyncio.run(main())
