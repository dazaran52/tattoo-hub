import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Log in as dazaran or admin
# First, let's create a new client without service_role bypass
client.auth.sign_in_with_password({"email": "admin@tattoo-hub.xyz", "password": "password"}) # Wait, I don't know the password...
