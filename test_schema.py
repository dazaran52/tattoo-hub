import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client

load_dotenv(dotenv_path="backend/.env")

async def main():
    supabase = await create_async_client(
        os.environ.get("SUPABASE_URL"),
        os.environ.get("SUPABASE_KEY")
    )
    # Get columns of 'users' table
    res = await supabase.table("users").select("*").limit(1).execute()
    if res.data:
        print("Columns in 'users':")
        for k, v in res.data[0].items():
            print(f"- {k}")

asyncio.run(main())
