import asyncio
from app.database import get_supabase_client
supabase = get_supabase_client()
try:
    res = supabase.table("payment_requests").select("*").in_("status", ["pending", "screenshot_uploaded"]).execute()
    print("Success:", res.data)
except Exception as e:
    print("Error:", type(e).__name__, e)
