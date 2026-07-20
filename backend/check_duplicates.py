import asyncio
from supabase import create_client
import os
from dotenv import load_dotenv
load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# fetch all chats
res = supabase.table("lead_chats").select("*").execute()
chats = res.data

from collections import defaultdict

groups = defaultdict(list)
for chat in chats:
    # try to resolve client_id from lead if possible
    # well, we can just print all chats grouped by master_id and client_session_id
    key = (chat['master_id'], chat['client_session_id'])
    groups[key].append(chat)

duplicates = {k: v for k, v in groups.items() if len(v) > 1}
print(f"Total duplicate chat groups: {len(duplicates)}")
for k, v in duplicates.items():
    print(k, [c['id'] for c in v])
