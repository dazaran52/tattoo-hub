from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
user_id = '26871c06-2686-406b-be67-86ad63f9505c'

try:
    res = supabase.table("notifications").insert({
        "user_id": user_id,
        "title": f"Изменение баланса",
        "message": f"Ваш баланс изменен.",
        "type": "system"
    }).execute()
    print("Notification success:", res.data)
except Exception as e:
    print("Notification error:", e)
