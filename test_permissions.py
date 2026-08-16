import asyncio
from supabase._async.client import create_client as create_async_client
from supabase import create_client
from app.config import get_settings

async def main():
    settings = get_settings()
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    # Get user fenix.mcferson@gmail.com
    res = client.table("users").select("id").eq("email", "fenix.mcferson@gmail.com").execute()
    if not res.data:
        print("User not found")
        return
    user_id = res.data[0]["id"]
    
    print("Updating...")
    res2 = client.table("users").update({"can_create_leads": False}).eq("id", user_id).execute()
    print(res2.data)

if __name__ == "__main__":
    asyncio.run(main())
