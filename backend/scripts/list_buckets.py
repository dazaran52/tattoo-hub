import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)
try:
    buckets = supabase.storage.list_buckets()
    print([b.name for b in buckets])
except Exception as e:
    print(f"Error: {e}")
