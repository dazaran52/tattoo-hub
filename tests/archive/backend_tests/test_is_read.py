import os
import asyncio
from dotenv import load_dotenv
from supabase import create_async_client, AsyncClient

load_dotenv(".env")

async def main():
    supabase: AsyncClient = await create_async_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    res = await supabase.table("chat_messages").select("content, sender_type, is_read, created_at").order("created_at", desc=True).limit(10).execute()
    for row in res.data:
        print(row)

asyncio.run(main())
