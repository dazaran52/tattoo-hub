from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import date, time, datetime
from app.middleware.auth import get_current_user, AuthUser
from app.database import get_async_supabase_client
from supabase._async.client import AsyncClient
from app.services.mail import send_transactional_email
import asyncio

router = APIRouter()

class SessionStatusUpdate(BaseModel):
    status: str

class DayOffUpdate(BaseModel):
    date: str
    is_full_day: bool = True
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class ManualClientCreate(BaseModel):
    name: str
    contact_info: Optional[str] = None
    phone: Optional[str] = None
    telegram: Optional[str] = None
    instagram: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    session_date: Optional[str] = None

class SessionCreate(BaseModel):
    client_id: str
    session_date: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    price: Optional[float] = None
    style: Optional[str] = None
    body_place: Optional[str] = None
    size: Optional[str] = None
    reference_images: Optional[List[str]] = []

class SessionUpdate(BaseModel):
    session_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    price: Optional[float] = None
    style: Optional[str] = None
    body_place: Optional[str] = None
    size: Optional[str] = None
    status: Optional[str] = None
    reference_images: Optional[List[str]] = None

class CompleteSessionData(BaseModel):
    result_image_urls: Optional[List[str]] = []
    portfolio_media: Optional[List[dict]] = []
    description: Optional[str] = ""
    publish_to_portfolio: bool = False
    send_review_request: bool = False
    end_time: Optional[str] = None

class SendAcceptEmailData(BaseModel):
    price: Optional[float] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    date: Optional[str] = None

@router.get("/clients")
async def get_clients(
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        # Fetch non-deleted clients linked to this master
        res = await supabase.table("master_clients") \
            .select("*, leads(title, description, image_urls, client_priority), master_sessions(*)") \
            .eq("master_id", current_user.user_id) \
            .eq("is_deleted", False) \
            .order("created_at", desc=True) \
            .execute()
        
        clients = res.data or []
        
        # Fetch chats for these clients
        lead_ids = [c["lead_id"] for c in clients if c.get("lead_id")]
        chat_dict = {}
        if lead_ids:
            chats_res = await supabase.table("lead_chats") \
                .select("id, lead_id") \
                .eq("master_id", current_user.user_id) \
                .in_("lead_id", lead_ids) \
                .execute()
            chat_dict = {c["lead_id"]: c["id"] for c in (chats_res.data or [])}

        # Filter out deleted sessions in the client's nested array just in case
        for client in clients:
            if client.get("master_sessions"):
                client["master_sessions"] = [s for s in client["master_sessions"] if not s.get("is_deleted")]
            client["chat_id"] = chat_dict.get(client.get("lead_id"))
        
        return clients
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clients/{client_id}")
async def delete_client(
    client_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        print(f"Deleting client {client_id} for master {current_user.user_id}")
        # Soft delete client
        await supabase.table("master_clients") \
            .update({"is_deleted": True}) \
            .eq("id", client_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
        
        # Also soft delete their future sessions
        now_date = datetime.utcnow().date().isoformat()
        try:
            await supabase.table("master_sessions") \
                .update({"is_deleted": True}) \
                .eq("client_id", client_id) \
                .eq("master_id", current_user.user_id) \
                .gte("session_date", now_date) \
                .execute()
        except Exception as session_err:
            print(f"Warning: Failed to delete sessions for client {client_id}: {session_err}")
            
        return {"status": "success"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

@router.post("/clients")
async def create_manual_client(
    data: ManualClientCreate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        # Check for existing using separate queries to avoid .or_ syntax issues
        existing_client = None
        if data.phone and data.phone.strip():
            res = await supabase.table("master_clients").select("id, name").eq("master_id", current_user.user_id).eq("is_deleted", False).eq("phone", data.phone.strip()).execute()
            if res.data: existing_client = res.data[0]
            
        if not existing_client and data.telegram and data.telegram.strip():
            res = await supabase.table("master_clients").select("id, name").eq("master_id", current_user.user_id).eq("is_deleted", False).eq("telegram", data.telegram.strip()).execute()
            if res.data: existing_client = res.data[0]
            
        if not existing_client and data.instagram and data.instagram.strip():
            res = await supabase.table("master_clients").select("id, name").eq("master_id", current_user.user_id).eq("is_deleted", False).eq("instagram", data.instagram.strip()).execute()
            if res.data: existing_client = res.data[0]
            
        if not existing_client and data.email and data.email.strip():
            res = await supabase.table("master_clients").select("id, name").eq("master_id", current_user.user_id).eq("is_deleted", False).eq("email", data.email.strip()).execute()
            if res.data: existing_client = res.data[0]

        if existing_client:
            raise HTTPException(status_code=409, detail={"error": "client_exists", "client": existing_client})

        # 1. Create client
        client_data = {
            "master_id": current_user.user_id,
            "name": data.name,
            "contact_info": data.contact_info,
            "phone": data.phone,
            "telegram": data.telegram,
            "instagram": data.instagram,
            "email": data.email,
            "notes": data.notes,
            "source": "manual",
            "kanban_status": "new"
        }
        res = await supabase.table("master_clients").insert(client_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create client")
            
        client = res.data[0]
        # 2. Return client
        return client
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/clients/{client_id}")
async def update_client(
    client_id: str,
    update_data: dict,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        # Validate that we only update allowed fields
        allowed_fields = {"name", "contact_info", "phone", "telegram", "instagram", "email", "notes", "kanban_status"}
        filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        if not filtered_data:
            return {"status": "success"}

        res = await supabase.table("master_clients") \
            .update(filtered_data) \
            .eq("id", client_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Client not found")
            
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions")
async def get_sessions(
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    """Get all non-deleted sessions for the master's kanban board."""
    try:
        res = await supabase.table("master_sessions") \
            .select("*, master_clients(*, leads(title, description, image_urls, client_priority))") \
            .eq("master_id", current_user.user_id) \
            .eq("is_deleted", False) \
            .order("created_at", desc=True) \
            .execute()
        
        # Filter out sessions where the linked client was soft deleted
        sessions = [s for s in (res.data or []) if s.get("master_clients") and not s["master_clients"].get("is_deleted")]
        return sessions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions")
async def create_session(
    data: SessionCreate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        # Verify client belongs to master
        client_res = await supabase.table("master_clients").select("id").eq("id", data.client_id).eq("master_id", current_user.user_id).execute()
        if not client_res.data:
            raise HTTPException(status_code=404, detail="Client not found or not owned by master")

        session_data = {
            "master_id": current_user.user_id,
            "client_id": data.client_id,
            "session_date": data.session_date,
            "start_time": data.start_time,
            "end_time": data.end_time,
            "price": data.price,
            "style": data.style,
            "body_place": data.body_place,
            "size": data.size,
            "reference_images": data.reference_images,
            "status": "booked"
        }
        res = await supabase.table("master_sessions").insert(session_data).execute()
        if not res.data:
            raise HTTPException(status_code=400, detail="Failed to create session")
        
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/sessions/{session_id}")
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
            
        res = await supabase.table("master_sessions") \
            .update(update_data) \
            .eq("id", session_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        print(f"Deleting session {session_id} for master {current_user.user_id}")
        await supabase.table("master_sessions") \
            .update({"is_deleted": True}) \
            .eq("id", session_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
        return {"status": "success"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Delete session failed: {str(e)}")

@router.post("/sessions/{session_id}/waiver")
async def sign_waiver(
    session_id: str,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        res = await supabase.table("master_sessions") \
            .update({
                "waiver_signed": True,
                "waiver_signed_at": datetime.utcnow().isoformat(),
                "status": "in_progress"
            }) \
            .eq("id", session_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found")
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/complete")
async def complete_session(
    session_id: str,
    data: CompleteSessionData,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        now_time = data.end_time if data.end_time else datetime.now().strftime("%H:%M")
        res = await supabase.table("master_sessions") \
            .update({
                "status": "completed",
                "result_image_urls": data.result_image_urls,
                "end_time": now_time
            }) \
            .eq("id", session_id) \
            .eq("master_id", current_user.user_id) \
            .select("*, master_clients(email, name)") \
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        session_data = res.data[0]
            
        # Add to portfolio if requested
        if data.publish_to_portfolio and (data.portfolio_media or data.result_image_urls):
            media = data.portfolio_media
            if not media and data.result_image_urls:
                media = [{"url": url, "type": "image"} for url in data.result_image_urls]
            
            await supabase.table("portfolio_posts").insert({
                "master_id": current_user.user_id,
                "media": media,
                "description": data.description or ""
            }).execute()
            
        # Send review request
        if data.send_review_request:
            client_info = session_data.get("master_clients", {})
            client_email = client_info.get("email")
            client_name = client_info.get("name") or "клиент"
            
            if client_email:
                master_res = await supabase.table("users").select("display_name, username").eq("id", current_user.user_id).single().execute()
                master_name = master_res.data.get("display_name") or master_res.data.get("username") or "вашего мастера"
                
                review_url = f"https://tattoo-hub.xyz/review/{session_id}"
                subject = f"Оставьте отзыв о сеансе у {master_name}"
                html = f'''
                <div style="font-family: sans-serif; max-w-[600px]; margin: 0 auto; color: #171717;">
                    <h2>Здравствуйте, {client_name}!</h2>
                    <p>Спасибо, что выбрали мастера <strong>{master_name}</strong> для вашей новой татуировки.</p>
                    <p>Будем очень благодарны, если вы найдете пару минут и оставите отзыв о сеансе. Ваш фидбек помогает мастерам становиться лучше, а другим клиентам — делать правильный выбор.</p>
                    <div style="margin: 30px 0;">
                        <a href="{review_url}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Оценить сеанс</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">Если вы не посещали сеанс, просто проигнорируйте это письмо.</p>
                </div>
                '''
                # Run in background
                asyncio.create_task(asyncio.to_thread(send_transactional_email, client_email, subject, html))
                
        return session_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/send-accept-email")
async def send_accept_email(
    session_id: str,
    data: SendAcceptEmailData,
    background_tasks: BackgroundTasks,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        # Fetch session and client to get email
        res = await supabase.table("master_sessions") \
            .select("*, master_clients(email)") \
            .eq("id", session_id) \
            .eq("master_id", current_user.user_id) \
            .execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found")
            
        session_data = res.data[0]
        client_email = session_data.get("master_clients", {}).get("email")
        
        if not client_email:
            # Client has no email, return special status
            return {"status": "no_email"}
            
        master_res = await supabase.table("users").select("display_name, username").eq("id", current_user.user_id).single().execute()
        master_name = master_res.data.get("display_name") or master_res.data.get("username") or "Мастер"
        
        price_text = f"{data.price} Kč" if data.price else "Стоимость обсудим индивидуально"
        time_text = f"{data.start_time or '...'} - {data.end_time or '...'}"
        date_text = data.date or session_data.get("session_date") or ""
        
        login_link = "https://tattoo-hub.xyz/login"
        try:
            res = await supabase.auth.admin.generate_link(
                {"type": "magiclink", "email": client_email.strip()}
            )
            if hasattr(res, 'properties') and res.properties.action_link:
                login_link = res.properties.action_link
        except Exception as e:
            print(f"Warning: Failed to generate magiclink for {client_email}: {e}")

        subject = f"Ваша заявка принята мастером {master_name}!"
        
        html = f'''
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #171717; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(to right, #10b981, #059669); padding: 30px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Ваша заявка принята! 🎉</h1>
            </div>
            
            <div style="padding: 30px;">
                <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Привет!</p>
                <p style="font-size: 16px; line-height: 1.6;">Отличные новости: мастер <strong>{master_name}</strong> рассмотрел вашу идею и готов взять её в работу!</p>
                
                <div style="background-color: #f3f4f6; border-left: 4px solid #10b981; padding: 20px; border-radius: 0 12px 12px 0; margin: 25px 0;">
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">Предварительные детали:</p>
                    <ul style="list-style: none; padding: 0; margin: 0; line-height: 1.8; color: #4b5563;">
                        <li>📅 <strong>Дата:</strong> {date_text}</li>
                        <li>⏰ <strong>Время:</strong> {time_text}</li>
                        <li>💰 <strong>Стоимость:</strong> {price_text}</li>
                    </ul>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; font-weight: bold; text-align: center; margin-bottom: 25px;">У мастера могут быть уточняющие вопросы.</p>
                
                <div style="text-align: center; margin: 35px 0;">
                    <a href="{login_link}" style="background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block;">Открыть чат с мастером</a>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    Если у вас не получается войти, просто ответьте на это письмо.
                </p>
            </div>
        </div>
        '''
        
        from app.services.mail import send_transactional_email
        import asyncio
        # Run send_transactional_email in background thread
        def send_email_sync():
            try:
                success = send_transactional_email(client_email, subject, html, from_name=f"Tattoo HUB - {master_name}")
                return success
            except Exception as e:
                print(f"Error sending email: {e}")
                return False
                
        # Send email in background so the UI doesn't hang
        background_tasks.add_task(send_email_sync)
        
        # Create chat auto-message if lead_id exists
        lead_id = session_data.get("master_clients", {}).get("lead_id")
        if lead_id:
            try:
                lead_res = await supabase.table("leads").select("client_token").eq("id", lead_id).execute()
                if lead_res.data:
                    client_token = lead_res.data[0].get("client_token")
                    chats_res = await supabase.table("lead_chats").select("id").eq("lead_id", lead_id).eq("master_id", current_user.user_id).execute()
                    
                    chat_id = None
                    if not chats_res.data:
                        new_chat = await supabase.table("lead_chats").insert({
                            "lead_id": lead_id,
                            "master_id": current_user.user_id,
                            "client_session_id": client_token
                        }).execute()
                        if new_chat.data:
                            chat_id = new_chat.data[0]["id"]
                    else:
                        chat_id = chats_res.data[0]["id"]
                        
                    if chat_id:
                        msg_text = f"Здравствуйте! Ваша заявка принята. Дата: {date_text}, время: {time_text}."
                        await supabase.table("chat_messages").insert({
                            "chat_id": chat_id,
                            "sender_type": "master",
                            "content": msg_text
                        }).execute()
            except Exception as e:
                print(f"Error creating chat auto-message: {e}")
        
        return {"status": "success", "email": client_email}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/days-off")
async def get_days_off(
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        res = await supabase.table("master_days_off") \
            .select("*") \
            .eq("master_id", current_user.user_id) \
            .execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/days-off")
async def toggle_day_off(
    data: DayOffUpdate,
    current_user: AuthUser = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_async_supabase_client)
):
    try:
        # Check if exists
        check = await supabase.table("master_days_off") \
            .select("*") \
            .eq("master_id", current_user.user_id) \
            .eq("date", data.date) \
            .execute()
            
        if check.data:
            if data.is_full_day and check.data[0].get("is_full_day", True):
                await supabase.table("master_days_off") \
                    .delete() \
                    .eq("id", check.data[0]["id"]) \
                    .execute()
                return {"status": "deleted"}
            else:
                upd = {
                    "is_full_day": data.is_full_day,
                    "start_time": data.start_time,
                    "end_time": data.end_time
                }
                res = await supabase.table("master_days_off") \
                    .update(upd) \
                    .eq("id", check.data[0]["id"]) \
                    .execute()
                return {"status": "updated", "data": res.data[0]}
        else:
            ins = {
                "master_id": current_user.user_id,
                "date": data.date,
                "is_full_day": data.is_full_day,
                "start_time": data.start_time,
                "end_time": data.end_time
            }
            res = await supabase.table("master_days_off").insert(ins).execute()
            return {"status": "created", "data": res.data[0]}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
