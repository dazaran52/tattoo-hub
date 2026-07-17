import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv("backend/.env")

async def main():
    supabase = await create_async_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    
    res = await supabase.table("users").select("*").eq("role", "client").execute()
    print("Found clients:", len(res.data))
    if len(res.data) > 0:
        for client in res.data:
            print(f"Client {client['email']}: status={client['status']} username={client['username']} balance={client['balance']}")

asyncio.run(main())
