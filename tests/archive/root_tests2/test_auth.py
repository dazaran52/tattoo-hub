import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from app.routers.admin import get_admin_user

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# I can't easily test get_admin_user without a valid JWT token of the admin!
