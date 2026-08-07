import asyncio
from app.database import get_supabase_client
from app.config import get_settings

async def main():
    try:
        supabase = get_supabase_client()
        # Find any user
        users = supabase.table("users").select("*").limit(1).execute()
        if not users.data:
            print("No users found")
            return
        
        user_id = users.data[0]['id']
        current_bal = users.data[0].get('balance', 0)
        print(f"User {users.data[0]['email']} current balance: {current_bal}")
        
        # Try to update
        res = supabase.table("users").update({"balance": current_bal + 1}).eq("id", user_id).execute()
        print("Update response:", res.data)
        
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
