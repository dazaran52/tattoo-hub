import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

async def main():
    db_url = os.getenv("POSTGRES_URL")
    if not db_url:
        print("POSTGRES_URL not found")
        return
    
    conn = await asyncpg.connect(db_url)
    
    with open("migrations/031_fiat_balance_final.sql", "r") as f:
        sql = f.read()
    
    print("Applying migration...")
    await conn.execute(sql)
    print("Migration applied successfully.")
    
    await conn.close()

asyncio.run(main())
