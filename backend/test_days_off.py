import asyncio
from app.core.supabase import get_async_supabase_client
from supabase._async.client import AsyncClient

async def main():
    supabase = get_async_supabase_client()
    res = await supabase.table("master_days_off").insert({
        "master_id": "41e6c3dc-6c4a-4a6c-9457-372078fb32df", # We need a valid master id, let's just use db_execute_sql
        "date": "2026-06-25",
        "is_full_day": True
    }).execute()
    print(res)

asyncio.run(main())
