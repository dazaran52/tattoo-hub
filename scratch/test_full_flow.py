import sys
sys.path.append('.')
import asyncio
import os
from supabase import create_client
from app.routers.profile import get_profile
from app.middleware.auth import AuthUser
from app.database import get_async_supabase_client

supabase = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])
res = supabase.auth.sign_in_with_password({"email": "test_client_flow_1@example.com", "password": "password123"})
user = res.user

async def main():
    async_supabase = await get_async_supabase_client()
    current_user = AuthUser(
        user_id=user.id,
        email=user.email,
        user_metadata=user.user_metadata or {}
    )
    from fastapi import BackgroundTasks
    tasks = BackgroundTasks()
    try:
        profile = await get_profile(current_user=current_user, background_tasks=tasks, supabase=async_supabase)
        print("Success:", profile)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
