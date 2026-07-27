import requests

token = "..." # Need to login as master
import os
from supabase import create_client, Client
from dotenv import load_dotenv
load_dotenv("backend/.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

res = supabase.auth.sign_in_with_password({"email": "fenix.mcferson@gmail.com", "password": "password123"})
session = res.session
print("Token:", session.access_token)

r = requests.get("http://localhost:8000/api/chat/my", headers={"Authorization": f"Bearer {session.access_token}"})
print(r.status_code)
print(r.json())
