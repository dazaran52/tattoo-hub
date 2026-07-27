import os
import jwt
from dotenv import load_dotenv

load_dotenv()

secret = os.environ.get("SUPABASE_JWT_SECRET")

# dazaran master id
user_id = "26871c06-2686-406b-be67-86ad63f9505c"

payload = {
  "aud": "authenticated",
  "exp": 2999999999,
  "sub": user_id,
  "email": "fenix.mcferson@gmail.com",
  "app_metadata": {},
  "user_metadata": {},
  "role": "authenticated"
}

token = jwt.encode(payload, secret, algorithm="HS256")
print(token)
