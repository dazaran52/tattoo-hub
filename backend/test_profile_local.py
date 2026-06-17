import os
from fastapi.testclient import TestClient
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# We need to import the app from main
import sys
sys.path.append(os.path.abspath('.'))
from main import app

client = TestClient(app)

# Login to supabase to get valid session and token
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    res = supabase.auth.sign_in_with_password({
        "email": "lolmakaka@gmail.com",
        "password": "TestPassword123!"
    })
    token = res.session.access_token
    print("Token obtained.")

    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/profile", headers=headers)
    print("Local TestClient status code:", response.status_code)
    print("Local TestClient JSON response:")
    import json
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print("Error:", e)
