import asyncio
from supabase import create_async_client
import os

async def main():
    url = os.environ.get("SUPABASE_URL", "http://127.0.0.1:54321")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtd3dzaG9nZ2xveWhxZWt5emhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwNzMyOTAyMSwiZXhwIjoyMDIyOTI5MDIxfQ.rR-M9vG0h02Vl74UqF-v_j1w05Vf_0bF5C4v2x4Q4-I")
    client = await create_async_client(url, key)
    res = await client.table("leads").select("id, client_id, users!leads_client_id_fkey(last_seen)").limit(1).execute()
    print(res.data)

asyncio.run(main())
