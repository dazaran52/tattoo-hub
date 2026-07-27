import re

path = "backend/app/routers/crm.py"
with open(path, "r") as f:
    content = f.read()

# 1. Update SessionUpdate model
old_model = '''class SessionUpdate(BaseModel):
    session_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    price: Optional[float] = None
    style: Optional[str] = None
    body_place: Optional[str] = None
    size: Optional[str] = None
    status: Optional[str] = None
    reference_images: Optional[List[str]] = None'''

new_model = '''class SessionUpdate(BaseModel):
    session_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    price: Optional[float] = None
    style: Optional[str] = None
    body_place: Optional[str] = None
    size: Optional[str] = None
    status: Optional[str] = None
    reference_images: Optional[List[str]] = None
    reject_reason: Optional[str] = None'''

if old_model in content:
    content = content.replace(old_model, new_model)
    print("Updated SessionUpdate model")

# 2. Update update_session logic
old_logic = '''@router.put("/sessions/{session_id}")
async def update_session(
    session_id: str,
    data: SessionUpdate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        if not update_data:
            return {"status": "no changes"}
            
        res = await supabase.table("master_sessions") \\
            .update(update_data) \\
            .eq("id", session_id) \\
            .eq("master_id", current_user.user_id) \\
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))'''

new_logic = '''@router.put("/sessions/{session_id}")
async def update_session(
    session_id: str,
    data: SessionUpdate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        dump = data.model_dump()
        reason = dump.pop("reject_reason", None)
        update_data = {k: v for k, v in dump.items() if v is not None}
        
        # If rejecting/cancelling, we might need to send to marketplace
        is_rejecting = update_data.get("status") in ["rejected", "cancelled"]
        
        if is_rejecting:
            # We must get the session details first to check if it's a marketplace lead
            s_res = await supabase.table("master_sessions") \\
                .select("*, master_clients(lead_id, name, leads(is_personal))") \\
                .eq("id", session_id) \\
                .eq("master_id", current_user.user_id) \\
                .execute()
            if s_res.data:
                session_data = s_res.data[0]
                client = session_data.get("master_clients") or {}
                lead_info = client.get("leads") or {}
                lead_id = client.get("lead_id")
                
                # Check if it was unlocked
                is_unlocked = False
                if lead_id:
                    u_res = await supabase.table("lead_unlocks").select("id").eq("lead_id", lead_id).eq("user_id", current_user.user_id).execute()
                    is_unlocked = bool(u_res.data)
                
                # If it's a platform lead and NOT unlocked, we should send it to marketplace
                # and maybe soft delete this session or keep it as cancelled?
                # The user said "should it fall to the general marketplace? YES"
                # So we update the lead to auction status
                if lead_id and not lead_info.get("is_personal") and not is_unlocked:
                    await supabase.table("leads").update({
                        "assigned_master_id": None,
                        "status": "auction"
                    }).eq("id", lead_id).execute()
                    
                    # We might also want to delete the master_clients/sessions since it's no longer theirs,
                    # but keeping it as 'cancelled' with is_deleted=True removes it from their active view.
                    update_data["status"] = "cancelled"
                    update_data["is_deleted"] = True
                
                # Send a system message or notification with the reason
                if lead_id:
                    # find chat_id
                    chat_res = await supabase.table("lead_chats").select("id").eq("lead_id", lead_id).execute()
                    # if no chat exists, we can still create a system message if a chat gets created, 
                    # but actually let's just insert a system message for the client
                    if not chat_res.data:
                        # create chat just for system messages if needed? Or better yet, just let the client see it via a notification in future.
                        pass
                    else:
                        chat_id = chat_res.data[0]["id"]
                        msg = f"[SYSTEM_CARD]: {{\"type\": \"master_rejected\", \"reason\": \"{reason or 'Без причины'}\"}}"
                        await supabase.table("chat_messages").insert({
                            "chat_id": chat_id,
                            "sender_type": "system",
                            "content": msg
                        }).execute()
        
        if not update_data:
            return {"status": "no changes"}
            
        res = await supabase.table("master_sessions") \\
            .update(update_data) \\
            .eq("id", session_id) \\
            .eq("master_id", current_user.user_id) \\
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found")
        return res.data[0]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))'''

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    print("Updated update_session logic")
else:
    print("Could not find update_session logic")

with open(path, "w") as f:
    f.write(content)
