import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client
import httpx

load_dotenv("backend/.env")

async def main():
    supabase = await create_async_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    
    # login as user
    res = await supabase.auth.sign_in_with_password({"email": "client@tattoohub.cz", "password": "password123"})
    token = res.session.access_token
    
    async with httpx.AsyncClient() as client:
        # local backend is not running, so let's just mock the profile creation logic to see what fails
        # Or better yet, we can use the local DB and run the logic!
        pass

asyncio.run(main())
