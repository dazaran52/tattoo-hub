import os
import asyncio
from dotenv import load_dotenv
from supabase._async.client import AsyncClient, create_client

load_dotenv()

async def test():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase = await create_client(url, key)
    
    query = supabase.table("users").select("id, username, portfolio_posts(id, media, description, created_at)").limit(1)
    res = await query.execute()
    print(res.data)

asyncio.run(test())
