import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")  # This is the service role key

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing SUPABASE_URL or SUPABASE_KEY")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Desired Admin Details
ADMIN_EMAIL = "admin@tattoohub.cz"
ADMIN_PASSWORD = "dazaran52521Ytrbn52521"

def create_admin():
    # 1. Try to sign up or create user via admin api
    print(f"Creating admin user: {ADMIN_EMAIL}")
    try:
        # Create user through the admin api
        res = supabase.auth.admin.create_user({
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "email_confirm": True
        })
        user = res.user
        print(f"Created user id: {user.id}")
    except Exception as e:
        if "already exists" in str(e).lower() or "User already registered" in str(e):
            print("User already exists, fetching id...")
            # We can't fetch easily, but we can sign in to get the id if needed.
            res = supabase.auth.sign_in_with_password({"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
            user = res.user
            print(f"Found existing user id: {user.id}")
        else:
            print(f"Error creating user: {e}")
            sys.exit(1)

    # 2. Update the 'users' table to set is_admin = True
    print(f"Updating users table for {user.id} to set is_admin = True")
    
    # Try to insert/upsert into users table
    # usually triggers create the row, but let's be explicit
    user_data = {
        "id": user.id,
        "email": ADMIN_EMAIL,
        "is_admin": True,
        "role": "master" # Admin doesn't matter much
    }
    
    update_res = supabase.table("users").upsert(user_data).execute()
    print("Upsert result:", update_res)
    print("Admin setup complete!")

if __name__ == "__main__":
    create_admin()
