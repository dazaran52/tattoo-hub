import asyncio
import os
from supabase import create_client

supabase_url = None
supabase_key = None

for path in ['backend/.env']:
    if os.path.exists(path):
        with open(path, 'r') as f:
            for line in f:
                if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
                    supabase_url = line.strip().split('=', 1)[1]
                elif line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                    supabase_key = line.strip().split('=', 1)[1]

supabase = create_client(supabase_url, supabase_key)

try:
    # 1. Create a dummy user in auth.users
    print("Creating auth user...")
    user_res = supabase.auth.admin.create_user({
        'email': 'test_client_001@example.com',
        'password': 'password123',
        'email_confirm': True,
        'user_metadata': {
            'role': 'client'
        }
    })
    user_id = user_res.user.id
    print("User ID:", user_id)

    # 2. Replicate what backend/app/routers/profile.py does
    new_profile = {
        "id": user_id,
        "username": None,
        "email": 'test_client_001@example.com',
        "credits": 0,
        "own_referral_code": "ABCDEFGH",
        "portfolio_url": None,
        "referred_by": None,
        "country_ids": [],
        "city_ids": [],
        "discount_tokens": 0,
        "withdrawable_credits": 0,
        "role": 'client',
        "status": "approved",
        "is_verified_master": False,
        "certificate_url": None,
        "currency": "CZK",
        "balance": 0.0,
        "theme": "system"
    }

    print("Inserting profile...")
    response = supabase.table("users").insert(new_profile).execute()
    print("Profile inserted:", response.data)

    # 3. Clean up
    print("Cleaning up...")
    supabase.auth.admin.delete_user(user_id)
    print("Done!")

except Exception as e:
    print("EXCEPTION:", e)
