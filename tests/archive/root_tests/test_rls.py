import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv("backend/.env")

async def main():
    supabase = await create_async_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    
    # Query pg_policies
    res = await supabase.table("pg_policies").select("*").eq("tablename", "users").execute()
    # Supabase doesn't expose pg_policies to PostgREST by default, we can use an RPC or raw SQL!
    pass

asyncio.run(main())
