import asyncio
from supabase._async.client import AsyncClient
from supabase._async.client import create_client
import os

async def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase = await AsyncClient.create(url, key)
    
    res = await supabase.table("leads").select("id, client_name, is_personal").order("created_at", desc=True).limit(5).execute()
    for row in res.data:
        print(row)

asyncio.run(main())
