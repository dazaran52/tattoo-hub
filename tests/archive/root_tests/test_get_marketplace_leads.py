import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv("backend/.env")

async def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase = await create_async_client(url, key)
    raw_res = await supabase.table("leads").select("*, cities(country_id)").neq("status", "closed").order("created_at", desc=True).limit(2).execute()
    print("Marketplace:", raw_res.data)

    res2 = await supabase.table("leads").select("*, users!assigned_master_id(id, raw_user_meta_data, username)").eq("client_id", "b626dfd9-6784-4c04-8883-9e96afdbb601").order("created_at", desc=True).limit(2).execute()
    print("Client:", res2.data)

asyncio.run(main())
