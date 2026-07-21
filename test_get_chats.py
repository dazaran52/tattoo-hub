import requests
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("backend/.env")
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

res = supabase.auth.sign_in_with_password({"email": "fenix.mcferson@gmail.com", "password": "password123"})
token = res.session.access_token

r = requests.get("http://localhost:8000/api/chat/my", headers={"Authorization": f"Bearer {token}"})
print(r.status_code)
print(r.text)
