import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv("backend/.env")

async def main():
    url = os.environ.get("POSTGRES_URL")
    conn = await asyncpg.connect(url)
    res = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name='lead_chats'")
    for row in res:
        print(row['column_name'])
    await conn.close()

asyncio.run(main())
