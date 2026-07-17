import asyncio
import os
import httpx
from dotenv import load_dotenv
from supabase import create_async_client
import jwt
from datetime import datetime, timedelta

load_dotenv("backend/.env")

async def main():
    supabase = await create_async_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    
    # Get user id
    res = await supabase.table("users").select("id, email").eq("email", "kuzmin.nekit2003@gmail.com").execute()
    if not res.data:
        print("User not found in DB")
        return
        
    user_id = res.data[0]["id"]
    email = res.data[0]["email"]
    
    # Generate JWT signed with SUPABASE_JWT_SECRET
    secret = os.environ["SUPABASE_JWT_SECRET"]
    payload = {
        "aud": "authenticated",
        "exp": int((datetime.now() + timedelta(hours=1)).timestamp()),
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "user_metadata": {"role": "client"}
    }
    token = jwt.encode(payload, secret, algorithm="HS256")
    
    print("Testing live API for Kuzmin...")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://tattoo-hub.xyz/api/profile",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0
        )
        print("Status:", resp.status_code)
        print("Body:", resp.text)

asyncio.run(main())
