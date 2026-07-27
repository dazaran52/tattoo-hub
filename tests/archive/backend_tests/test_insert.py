import asyncio
from supabase._async.client import AsyncClient
import os
import uuid
from dotenv import load_dotenv

load_dotenv("/home/dazaran/Загрузки/Tattoo HUB/backend/.env")

async def main():
    supabase = AsyncClient(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    
    # Let's check if the client user 'test_45fd36@tattoohub.cz' exists and has missing data.
    res = await supabase.table("users").select("*").eq("email", "test_45fd36@tattoohub.cz").single().execute()
    print("User exists:", res.data)

asyncio.run(main())
