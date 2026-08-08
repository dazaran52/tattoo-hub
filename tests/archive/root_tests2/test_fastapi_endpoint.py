import asyncio
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

from app.routers.admin import adjust_user_balance, BalanceAdjustmentRequest

async def run():
    payload = BalanceAdjustmentRequest(amount=600, operation="deduct", reason="!")
    try:
        res = await adjust_user_balance(
            user_id='26871c06-2686-406b-be67-86ad63f9505c',
            payload=payload,
            admin_user=None, # not used in function body
            supabase=supabase
        )
        print("Success:", res)
    except Exception as e:
        print("Error during execution:", e)

asyncio.run(run())
