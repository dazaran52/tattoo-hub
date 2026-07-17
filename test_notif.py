import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv("backend/.env")

async def main():
    supabase = await create_async_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    
    admin_res = await supabase.table("users").select("id").eq("is_admin", True).limit(1).execute()
    if admin_res.data:
        admin_id = admin_res.data[0]["id"]
        try:
            res = await supabase.table("notifications").insert({
                "user_id": admin_id,
                "title": "Test Notif",
                "message": "Test Message",
                "type": "system"
            }).execute()
            print("Insert notif OK:", res.data)
            await supabase.table("notifications").delete().eq("id", res.data[0]["id"]).execute()
        except Exception as e:
            print("ERROR inserting notif:", e)
    else:
        print("No admin found")

asyncio.run(main())
