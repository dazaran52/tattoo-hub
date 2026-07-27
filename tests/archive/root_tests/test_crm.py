import asyncio
from supabase import create_async_client
import os

async def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase = await create_async_client(url, key)
    
    res = await supabase.table("master_sessions") \
        .select("*, master_clients(*, leads(title, description, image_urls, client_priority, is_personal))") \
        .limit(1) \
        .execute()
    
    print(res.data)

if __name__ == "__main__":
    asyncio.run(main())
