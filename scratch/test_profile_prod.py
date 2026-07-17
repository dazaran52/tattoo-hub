import asyncio
import os
import jwt
import time
import httpx
from supabase import create_client

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])

res = supabase.table('users').select('id, email').eq('role', 'client').limit(1).execute()
if not res.data:
    print("No client found")
    exit()

client_id = res.data[0]['id']
client_email = res.data[0]['email']
print(f"Testing with client: {client_email} ({client_id})")

secret = os.environ['SUPABASE_JWT_SECRET']
payload = {
    "aud": "authenticated",
    "exp": int(time.time()) + 3600,
    "sub": client_id,
    "email": client_email,
    "role": "authenticated",
    "app_metadata": {"provider": "email"},
    "user_metadata": {"role": "client"}
}
token = jwt.encode(payload, secret, algorithm="HS256")

api_url = "https://tattoo-hub-production.up.railway.app" # wait, where is it hosted?
# let's try local first if it's not known
