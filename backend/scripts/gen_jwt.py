import jwt
import os
import time
from dotenv import load_dotenv

load_dotenv()
secret = os.environ.get("SUPABASE_JWT_SECRET")
# The user id from earlier
payload = {
    "aud": "authenticated",
    "exp": int(time.time()) + 3600,
    "sub": "26871c06-2686-406b-be67-86ad63f9505c",
    "email": "fenix.mcferson@gmail.com",
    "role": "authenticated"
}
token = jwt.encode(payload, secret, algorithm="HS256")
print(token)
