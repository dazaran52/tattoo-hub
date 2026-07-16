import asyncio
import os
import sys
import httpx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.database import get_async_supabase_client
from app.config import get_settings

async def main():
    supabase = await get_async_supabase_client()
    
    # Let's create a test user or update a specific one
    email = "test.api.user@example.com"
    password = "SecurePassword123!"
    
    try:
        # Try to sign up
        res = await supabase.auth.sign_up({"email": email, "password": password})
    except Exception as e:
        print("Sign up failed, trying sign in...")
        
    # Sign in
    auth_res = await supabase.auth.sign_in_with_password({"email": email, "password": password})
    token = auth_res.session.access_token
    
    # Make request to production backend
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://tattoo-hub.xyz/api/leads/marketplace",
            headers={"Authorization": f"Bearer {token}"}
        )
        print("Status:", resp.status_code)
        print("Body:", resp.text)

asyncio.run(main())
