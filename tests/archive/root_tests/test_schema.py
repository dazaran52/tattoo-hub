import asyncio
import os
from supabase import create_client

def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    client = create_client(supabase_url, supabase_key)
    
    try:
        res = client.table("chat_messages").select("*").limit(1).execute()
        if res.data:
            print("Columns:", list(res.data[0].keys()))
        else:
            print("Table empty, checking columns via query")
    except Exception as e:
        print("Failed:", e)

main()
