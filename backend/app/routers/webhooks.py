from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from app.database import get_supabase_client
from supabase import Client
from app.config import get_settings
import re

router = APIRouter(prefix="/api", tags=["webhooks"])

class DonatelloWebhookPayload(BaseModel):
    pubId: str
    client: str
    message: str
    amount: str
    actualAmount: str


@router.post("/webhooks/donatello")
async def donatello_webhook(
    payload: DonatelloWebhookPayload,
    request: Request,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Process Donatello webhook to assign credits.
    """
    settings = get_settings()
    
    # Validate header
    req_key = request.headers.get("X-Key") or request.headers.get("x-key-header")
    if req_key != settings.DONATELLO_X_KEY:
        raise HTTPException(status_code=401, detail="Neplatný token X-Key. / Invalid webhook key.")

    if not payload.message:
        raise HTTPException(status_code=400, detail="Chybí zpráva pro parzování emailu. / Commentary is missing.")

    # Extract email using regex
    email_regex = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{1,}"
    match = re.search(email_regex, payload.message)
    
    if not match:
        raise HTTPException(status_code=400, detail="Zástupný komentář neobsahuje žádný platný E-mail.")

    matched_email = match.group(0).lower()
    
    # Find master
    user_res = supabase.table("users").select("*").eq("email", matched_email).execute()
    if not user_res.data or len(user_res.data) == 0:
        raise HTTPException(status_code=404, detail=f"Uživatel s emailem {matched_email} nebyl v databázi nalezen.")
        
    master = user_res.data[0]
    
    # Calculate credits (Rate: 40 UAH = 1 EUR = 10 Credits => 0.25 credits per 1 UAH)
    try:
        raw_amt = float(payload.actualAmount or payload.amount or "0")
        credits_to_deposit = round(raw_amt * 0.25)
    except ValueError:
        credits_to_deposit = 0

    current_balance = master.get("balance", 0) or 0
    current_credits = master.get("credits", 0) or 0
    
    new_balance = float(current_balance) + credits_to_deposit
    new_credits = int(current_credits) + credits_to_deposit
    
    # Update balance
    supabase.table("users").update({
        "balance": new_balance,
        "credits": new_credits
    }).eq("id", master["id"]).execute()
    
    # Create notification
    supabase.table("notifications").insert({
        "user_id": master["id"],
        "title": "Баланс пополнен",
        "message": f"Успешное пополнение через Donatello. Зачислено {credits_to_deposit} кредитов.",
        "type": "payment"
    }).execute()

    return {
        "success": True,
        "message": "Deposit successful",
        "email": matched_email,
        "creditsAdded": credits_to_deposit,
        "newBalance": new_balance
    }

import hmac
import hashlib
import json

@router.post("/webhooks/lemonsqueezy")
async def lemonsqueezy_webhook(
    request: Request,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Process Lemon Squeezy webhook to assign credits (CZK balance).
    """
    settings = get_settings()
    
    # 1. Read raw body and signature
    raw_body = await request.body()
    signature = request.headers.get("X-Signature")
    
    if not signature:
        raise HTTPException(status_code=401, detail="Missing X-Signature header.")
        
    if not settings.LEMON_SQUEEZY_WEBHOOK_SECRET:
        print("Warning: LEMON_SQUEEZY_WEBHOOK_SECRET is not set!")
    else:
        # 2. Verify signature
        digest = hmac.new(
            settings.LEMON_SQUEEZY_WEBHOOK_SECRET.encode(),
            raw_body,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(digest, signature):
            raise HTTPException(status_code=401, detail="Invalid signature.")
            
    # 3. Parse JSON
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")
        
    event_name = payload.get("meta", {}).get("event_name")
    
    if event_name != "order_created":
        return {"success": True, "message": f"Ignored event: {event_name}"}
        
    custom_data = payload.get("meta", {}).get("custom_data", {})
    user_id = custom_data.get("user_id")
    
    if not user_id:
        return {"success": True, "message": "Ignored: No user_id attached"}
        
    # 4. Determine credits amount
    attributes = payload.get("data", {}).get("attributes", {})
    subtotal_usd_cents = attributes.get("subtotal") 
    
    try:
        subtotal_cents = int(subtotal_usd_cents)
        credits_to_deposit = subtotal_cents // 100
    except (ValueError, TypeError):
        credits_to_deposit = 0
        
    if credits_to_deposit <= 0:
        return {"success": True, "message": "Ignored: Amount is 0 or invalid"}
        
    # 5. Find master and update balance
    user_res = supabase.table("users").select("*").eq("id", user_id).execute()
    if not user_res.data or len(user_res.data) == 0:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found.")
        
    master = user_res.data[0]
    
    current_balance = master.get("balance", 0) or 0
    current_credits = master.get("credits", 0) or 0
    
    new_balance = float(current_balance) + credits_to_deposit
    new_credits = int(current_credits) + credits_to_deposit
    
    supabase.table("users").update({
        "balance": new_balance,
        "credits": new_credits
    }).eq("id", user_id).execute()
    
    supabase.table("notifications").insert({
        "user_id": user_id,
        "title": "Баланс успешно пополнен",
        "message": f"Ваш счет пополнен на {credits_to_deposit} CZK. Успешных сделок!",
        "type": "payment"
    }).execute()
    
    # Insert transaction history
    supabase.table("transactions").insert({
        "user_id": user_id,
        "amount": subtotal_cents / 100,
        "currency": attributes.get("currency", "CZK"),
        "credits_added": credits_to_deposit,
        "provider": "lemonsqueezy",
        "provider_tx_id": payload.get("data", {}).get("id", ""),
        "status": "completed"
    }).execute()
    
    return {
        "success": True,
        "message": "Top-up successful",
        "user_id": user_id,
        "added": credits_to_deposit,
        "new_balance": new_balance
    }
