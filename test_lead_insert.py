import asyncio
import os
import traceback
from supabase import create_client, Client

async def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not supabase_url or not supabase_key:
        print("No creds")
        return
        
    supabase: Client = create_client(supabase_url, supabase_key)
    
    db_lead = {
        "title": "Test Lead",
        "description": "Test",
        "contacts": "Test",
        "base_unlock_price_eur": 2.0,
        "client_priority": "quality",
        "client_token": "test-token",
        "trust_score": 100,
        "client_budget": None,
        "client_currency": "CZK",
        "is_negotiable_budget": True,
        "country_id": None,
        "city_id": None,
        "image_urls": [],
        "style": None,
        "size": None,
        "body_place": None,
        "client_name": "Test Client",
        "is_personal": True
    }
    
    try:
        res = supabase.table("leads").insert(db_lead).execute()
        print("SUCCESS")
        supabase.table("leads").delete().eq("id", res.data[0]["id"]).execute()
    except Exception as e:
        print(f"FAILED: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
