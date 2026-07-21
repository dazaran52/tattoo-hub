import asyncio
import os
import uuid
from supabase import create_client

def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    client = create_client(supabase_url, supabase_key)
    
    # Try a dummy update to see if the syntax works
    try:
        dummy_id = str(uuid.uuid4())
        res = client.table("chat_messages").update({"is_read": True}).eq("chat_id", dummy_id).neq("sender_type", "master").eq("is_read", False).execute()
        print("Success, syntax is valid:", res.data)
    except Exception as e:
        print("Failed syntax:", e)

main()
