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
    
    email = "test_client_prod_2@example.com"
    password = "password123"
    
    auth_res = await supabase.auth.sign_up({
        "email": email,
        "password": password,
        "options": {"data": {"role": "client"}}
    })
    
    token = auth_res.session.access_token
    
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://tattoo-hub.xyz/api/profile",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0
        )
        print("Status:", res.status_code)
        print("Response:", res.text)

asyncio.run(main())
