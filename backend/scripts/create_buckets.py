import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

buckets_to_create = ["avatars", "portfolio"]

try:
    existing_buckets = [b.name for b in supabase.storage.list_buckets()]
    print(f"Existing buckets: {existing_buckets}")
    
    for bucket in buckets_to_create:
        if bucket not in existing_buckets:
            print(f"Creating bucket: {bucket}")
            # Try to create with public=True if SDK supports it, or just create
            res = supabase.storage.create_bucket(bucket, {"public": True})
            print(f"Created {bucket}: {res}")
            
    print("Buckets created successfully. Note: you may need to apply RLS policies for storage via SQL.")
except Exception as e:
    print(f"Error: {e}")
