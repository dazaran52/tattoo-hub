import asyncio
import os
from dotenv import load_dotenv
from supabase import create_async_client
import json

load_dotenv(dotenv_path="backend/.env")

async def main():
    supabase = await create_async_client(
        os.environ.get("SUPABASE_URL"),
        os.environ.get("SUPABASE_KEY")
    )
    res = await supabase.table("users").select("*").eq("email", "kuzmin.nekit2003@gmail.com").execute()
    if res.data:
        data = res.data[0]
        # Calculate unlocks and gamification level
        unlocks_res = await supabase.table("lead_unlocks").select("id", count="exact").eq("user_id", data['id']).execute()
        unlocked_count = unlocks_res.count if unlocks_res.count is not None else len(unlocks_res.data)
        print("Unlocked count:", unlocked_count)
        data["unlocked_leads_count"] = unlocked_count
        data["gamification_level"] = "Newbie"
        
        # Test Pydantic validation
        import sys
        sys.path.append('backend')
        from app.routers.profile import ProfileResponse
        
        try:
            profile = ProfileResponse(**data)
            print("Pydantic validation SUCCESS!")
        except Exception as e:
            print("Pydantic validation ERROR:", e)

asyncio.run(main())
