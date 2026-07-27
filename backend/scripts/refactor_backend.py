import os
import re

def process_client_portal():
    path = "backend/app/routers/client_portal.py"
    with open(path, "r") as f:
        content = f.read()
    
    old_code = 'chats_res = supabase.table("lead_chats").select("id, master_id").eq("lead_id", lead_id).execute()'
    new_code = '''client_id = lead.get("client_id")
    client_session_id = lead.get("client_session_id")
    if client_id:
        chats_res = supabase.table("lead_chats").select("id, master_id").eq("client_id", client_id).execute()
    else:
        chats_res = supabase.table("lead_chats").select("id, master_id").eq("client_session_id", client_session_id).execute()'''
    
    content = content.replace(old_code, new_code)
    with open(path, "w") as f:
        f.write(content)

process_client_portal()
print("Processed client_portal.py")
