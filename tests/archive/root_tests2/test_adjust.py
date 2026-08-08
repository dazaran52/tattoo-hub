import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

user_res = supabase.table("users").select("id, balance, display_name").eq("email", "fenix.mcferson@gmail.com").single().execute()
print("Initial:", user_res.data)

user_id = user_res.data["id"]
print(f"Updating user_id {user_id}")

update_res = supabase.table("users").update({"balance": 600.0}).eq("id", user_id).execute()
print("Update response:", update_res.data)

res2 = supabase.table("users").select("id, balance").eq("id", user_id).single().execute()
print("Final:", res2.data)
