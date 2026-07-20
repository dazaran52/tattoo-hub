import asyncio
import os
import requests
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv()

async def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase = await create_async_client(url, key)
    
    # Login as client kuzmin.nekit2003
    res = await supabase.auth.sign_in_with_password({"email": "kuzmin.nekit2003@gmail.com", "password": "password123"})
    token = res.session.access_token
    
    # Call the API
    response = requests.get("http://localhost:8000/api/chat/my", headers={"Authorization": f"Bearer {token}"})
    print("Status Code:", response.status_code)
    print("Response JSON:")
    try:
        print(response.json())
    except:
        print(response.text)

asyncio.run(main())
