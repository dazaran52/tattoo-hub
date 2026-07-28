import asyncio
from supabase._async.client import create_client
import os

async def main():
    supabase_url = "https://swprcstdyskalatuvbqh.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3cHJjc3RkeXNrYWxhdHV2YnFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgxMDE5OSwiZXhwIjoyMDk1Mzg2MTk5fQ.4SNfeqQH_B2TMhPOvXebQn2B-_R270Yh8qAO3al6AQw"
    client = await create_client(supabase_url, supabase_key)
    # The Supabase python client doesn't support raw SQL easily unless using rpc.
    print("Will try RPC or similar if needed")
    
asyncio.run(main())
