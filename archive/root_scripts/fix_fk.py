import asyncio
import os
from dotenv import load_dotenv
import asyncpg

load_dotenv("backend/.env")

async def main():
    url = os.environ.get("POSTGRES_URL")
    if not url:
        print("POSTGRES_URL not found")
        return
    conn = await asyncpg.connect(url)
    
    # Drop existing foreign key
    # We first need to find the name of the constraint
    queries = [
        """
        ALTER TABLE public.leads
        DROP CONSTRAINT IF EXISTS leads_assigned_master_id_fkey;
        """,
        """
        ALTER TABLE public.leads
        ADD CONSTRAINT leads_assigned_master_id_fkey
        FOREIGN KEY (assigned_master_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL;
        """
    ]
    for q in queries:
        try:
            await conn.execute(q)
            print("Executed:", q)
        except Exception as e:
            print("Error executing:", e)
            
    # Refresh postgrest schema cache
    try:
        await conn.execute("NOTIFY pgrst, 'reload schema';")
        print("Schema reloaded")
    except Exception as e:
        print("Error reloading schema:", e)
        
    await conn.close()

asyncio.run(main())
