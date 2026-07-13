import asyncio
from supabase import create_client, Client
import os

url = "https://swprcstdyskalatuvbqh.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3cHJjc3RkeXNrYWxhdHV2YnFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgxMDE5OSwiZXhwIjoyMDk1Mzg2MTk5fQ.4SNfeqQH_B2TMhPOvXebQn2B-_R270Yh8qAO3al6AQw"

supabase: Client = create_client(url, key)

def main():
    email = "admin@admin.com"
    password = "adminadmin"
    
    try:
        # Create user
        res = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "role": "admin",
                "name": "Super Admin"
            }
        })
        print(f"Created admin user: {res.user.id}")
        
        # Insert into public.users
        supabase.table("users").upsert({
            "id": res.user.id,
            "email": email,
            "role": "admin",
            "display_name": "Super Admin"
        }).execute()
        print("Upserted into public.users")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
