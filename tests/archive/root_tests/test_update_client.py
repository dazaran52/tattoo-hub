import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client, AsyncClient

load_dotenv("backend/.env")

async def main():
    supabase: AsyncClient = await create_async_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    res = await supabase.table("master_clients").select("*").limit(1).execute()
    if res.data:
        client_id = res.data[0]["id"]
        master_id = res.data[0]["master_id"]
        print(f"Testing delete for {client_id}")
        
        # We need to test it with normal user token or at least check if service role works
        # Let's just check the RLS policies
        policies = await supabase.rpc("get_policies").execute() # This might not exist
        
    print(res.data)

asyncio.run(main())
