import asyncio
from supabase._async.client import create_client

async def main():
    supabase = await create_client(
        "https://swprcstdyskalatuvbqh.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3cHJjc3RkeXNrYWxhdHV2YnFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgxMDE5OSwiZXhwIjoyMDk1Mzg2MTk5fQ.4SNfeqQH_B2TMhPOvXebQn2B-_R270Yh8qAO3al6AQw"
    )
    user_id = 'ea64d2c0-1036-449d-b7d4-68669337cded'
    country_id = '2a71599c-91f2-4461-b77b-86a150db3aab'
    res = await supabase.table("users").update({"country_ids": [country_id]}).eq("id", user_id).execute()
    print("Update res:", res.data)
    
    res2 = await supabase.table("users").select("country_ids").eq("id", user_id).execute()
    print("Fetch res:", res2.data)

asyncio.run(main())
