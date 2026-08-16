import asyncio
import os
import sys

sys.path.append(os.path.dirname(__file__))

from app.config import get_settings
import asyncpg

async def run_migration():
    settings = get_settings()
    conn_str = settings.get_postgres_url()
    print(f"Connecting to {conn_str}...")
    
    conn = await asyncpg.connect(conn_str)
    
    with open('migrations/065_create_ban_system.sql', 'r') as f:
        sql = f.read()
        
    await conn.execute(sql)
    await conn.close()
    print("Migration executed successfully.")

if __name__ == '__main__':
    asyncio.run(run_migration())
