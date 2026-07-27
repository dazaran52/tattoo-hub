import os
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Reset password for lolmakaka@gmail.com to inspect
try:
    # We use admin auth to update user password
    user_id = "379bf40b-2272-401f-a825-1ac9e599b291"
    supabase.auth.admin.update_user_by_id(
        user_id,
        attributes={"password": "TestPassword123!"}
    )
    print("Password reset successful")

    # Now sign in as user
    res = supabase.auth.sign_in_with_password({
        "email": "lolmakaka@gmail.com",
        "password": "TestPassword123!"
    })
    token = res.session.access_token
    print("Signed in successfully. Token obtained.")

    # Call local API /api/profile
    api_url = "http://localhost:8000/api/profile"
    # Wait, we need to run the backend first to call it locally.
    # Or we can call the production API!
    prod_api_url = "https://api.tattoo-hub.xyz/api/profile"
    
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(prod_api_url, headers=headers)
    print("Production API response status:", resp.status_code)
    print("Production API response JSON:", resp.json())

except Exception as e:
    print("Error:", e)
