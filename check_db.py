import asyncio
from supabase._async.client import create_client

async def main():
    supabase = await create_client(
        "https://swprcstdyskalatuvbqh.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3cHJjc3RkeXNrYWxhdHV2YnFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgxMDE5OSwiZXhwIjoyMDk1Mzg2MTk5fQ.4SNfeqQH_B2TMhPOvXebQn2B-_R270Yh8qAO3al6AQw"
    )
    res = await supabase.table("users").select("id, email, display_name, country_ids, city_ids").execute()
    for user in res.data:
        print(user)

asyncio.run(main())
