import asyncio
import os
import uuid
import httpx
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv("backend/.env")

async def main():
    supabase = await create_async_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    
    # 1. Register a new user
    fake_email = f"test_{uuid.uuid4().hex[:6]}@tattoohub.cz"
    res = await supabase.auth.sign_up({
        "email": fake_email,
        "password": "password123",
        "options": {
            "data": {
                "role": "client",
                "username": fake_email.split('@')[0]
            }
        }
    })
    
    if not res.session:
        print("Failed to register:", res)
        return
        
    token = res.session.access_token
    print(f"Registered {fake_email}")
    
    # 2. Call the LIVE backend via proxy
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://tattoo-hub.xyz/api/profile",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0
        )
        print("Status:", resp.status_code)
        print("Body:", resp.text)
        
    # Cleanup (ignore errors)
    try:
        await supabase.auth.admin.delete_user(res.user.id)
    except:
        pass

asyncio.run(main())
