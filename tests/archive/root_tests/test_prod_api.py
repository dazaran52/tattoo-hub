import asyncio
import os
import httpx
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv(dotenv_path="backend/.env")

async def main():
    supabase = await create_async_client(
        os.environ.get("SUPABASE_URL"),
        os.environ.get("SUPABASE_KEY")
    )
    
    # 1. Sign up a new test user
    email = "test_client_prod_1@example.com"
    password = "password123"
    
    print("Signing up...")
    auth_res = await supabase.auth.sign_up({
        "email": email,
        "password": password,
        "options": {
            "data": {
                "role": "client"
            }
        }
    })
    
    token = auth_res.session.access_token
    print("Got token, calling prod API...")
    
    # 2. Call the production API
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "http://49.13.145.179:8000/api/profile",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0
        )
        print("Status:", res.status_code)
        print("Response:", res.text)

asyncio.run(main())
