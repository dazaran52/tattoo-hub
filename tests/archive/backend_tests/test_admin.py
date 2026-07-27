import asyncio
from app.database import get_async_supabase_client

async def main():
    s = await get_async_supabase_client()
    print(dir(s.auth))
    if hasattr(s.auth, 'admin'):
        print(dir(s.auth.admin))

asyncio.run(main())
