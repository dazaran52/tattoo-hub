import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv("backend/.env")

async def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase = await create_async_client(url, key)
    try:
        res = await supabase.table("lead_chats").select(
            "id, lead_id, leads(title, users!leads_client_id_fkey(display_name))"
        ).execute()
        print("Success:", res.data[:1])
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
