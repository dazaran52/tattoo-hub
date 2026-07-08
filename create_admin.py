import os
import asyncio
from dotenv import load_dotenv
from supabase._async.client import create_client, AsyncClient

load_dotenv("backend/.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

async def create_admin():
    supabase: AsyncClient = await create_client(url, key)
    try:
        res = await supabase.table("users").select("id").eq("email", "admin@tattoohub.cz").execute()
        if res.data:
            user_id = res.data[0]['id']
            await supabase.auth.admin.update_user_by_id(user_id, {"password": "admin123"})
            await supabase.table("users").update({"is_admin": True, "status": "approved"}).eq("id", user_id).execute()
            print("Updated existing admin user")
        else:
            user = await supabase.auth.admin.create_user({
                "email": "admin@tattoohub.cz",
                "password": "admin123",
                "email_confirm": True,
                "user_metadata": {"role": "admin"}
            })
            await supabase.table("users").upsert({
                "id": user.user.id,
                "email": "admin@tattoohub.cz",
                "is_admin": True,
                "status": "approved",
                "role": "admin",
                "balance": 0.0,
                "credits": 0,
                "display_name": "Главный Админ"
            }).execute()
            print("Created new admin user")
    except Exception as e:
        print(f"Failed to update existing: {e}")

asyncio.run(create_admin())
