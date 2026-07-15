import asyncio
from app.database import get_async_supabase_client

async def main():
    supabase = await get_async_supabase_client()
    try:
        res = await supabase.auth.admin.generate_link({"type": "magiclink", "email": "test_async@example.com"})
        if hasattr(res, 'properties'):
            print(res.properties.action_link)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
