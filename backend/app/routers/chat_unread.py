import re

path = "backend/app/routers/chat.py"
with open(path, "r") as f:
    content = f.read()

new_endpoint = '''@router.get("/unread-count")
async def get_unread_count(
    current_user: AuthUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    try:
        user_role = current_user.user_metadata.get("role", "client")
        
        # Get all chats for the user
        query = supabase.table("lead_chats").select("id")
        if user_role == "client":
            query = query.eq("client_id", current_user.user_id)
        else:
            query = query.eq("master_id", current_user.user_id)
            
        chats_res = query.execute()
        chat_ids = [c["id"] for c in (chats_res.data or [])]
        
        if not chat_ids:
            return {"count": 0}
            
        target_sender = "master" if user_role == "client" else "client"
        
        # We can fetch in batches or just count. PostgREST doesn't support IN with exact count easily, 
        # but we can fetch them since the number shouldn't be massive for unread.
        unread_res = supabase.table("chat_messages")\\
            .select("id")\\
            .in_("chat_id", chat_ids)\\
            .eq("sender_type", target_sender)\\
            .eq("is_read", False)\\
            .execute()
            
        return {"count": len(unread_res.data or [])}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
'''

if "@router.get(\"/unread-count\")" not in content:
    # Insert it before get_my_chats
    content = content.replace("@router.get(\"/my\")", new_endpoint + "\n@router.get(\"/my\")")
    with open(path, "w") as f:
        f.write(content)
    print("Added unread-count endpoint")
else:
    print("Endpoint already exists")

