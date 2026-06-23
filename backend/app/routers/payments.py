import hmac
import hashlib
import json
import httpx
from fastapi import APIRouter, Header, Request, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.database import get_supabase_client
from app.middleware.auth import get_current_user, AuthUser
import uuid

router = APIRouter(prefix="/api/payments", tags=["payments"])

DONATELLO_KEY = "ab774ddd23b0b40c0d6ad0fca52d87c5"
CRYPTO_BOT_TOKEN = "587449:AA9ZiVFhMMARXB25yAz3OqVsAkGp6muHITR"

# Constants
CREDITS_PER_USDT = 10
CREDITS_PER_UAH = 0.25
CREDITS_PER_EUR = 10

class CryptoInvoiceRequest(BaseModel):
    user_id: str
    amount_usdt: float

@router.post("/crypto/invoice")
async def create_crypto_invoice(req: CryptoInvoiceRequest):
    """Generate a CryptoBot invoice for the user."""
    url = "https://pay.crypt.bot/api/createInvoice"
    headers = {"Crypto-Pay-API-Token": CRYPTO_BOT_TOKEN}
    
    # We pass user_id in payload to identify them in the webhook
    payload_data = {"user_id": req.user_id}
    
    data = {
        "asset": "USDT",
        "amount": str(req.amount_usdt),
        "description": f"Пополнение баланса Tattoo Hub",
        "payload": json.dumps(payload_data)
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, data=data)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to create CryptoBot invoice")
            
        result = response.json()
        if not result.get("ok"):
            raise HTTPException(status_code=400, detail=result.get("error", {}).get("name", "Unknown error"))
            
        return {"pay_url": result["result"]["pay_url"]}

@router.post("/webhooks/cryptobot")
async def cryptobot_webhook(request: Request, crypto_pay_api_signature: str = Header(None)):
    """Webhook for CryptoBot payments."""
    if not crypto_pay_api_signature:
        raise HTTPException(status_code=400, detail="Missing signature")
        
    body = await request.body()
    
    # Verify signature
    secret = hashlib.sha256(CRYPTO_BOT_TOKEN.encode('utf-8')).digest()
    check_sig = hmac.new(secret, body, hashlib.sha256).hexdigest()
    
    if check_sig != crypto_pay_api_signature:
        raise HTTPException(status_code=403, detail="Invalid signature")
        
    data = json.loads(body)
    
    # We only care about paid invoices
    if data.get("update_type") != "invoice_paid":
        return {"status": "ignored"}
        
    invoice = data.get("payload", {})
    invoice_id = str(invoice.get("invoice_id"))
    asset = invoice.get("asset")
    amount = float(invoice.get("amount", 0))
    
    # Extract user_id from the payload we sent during creation
    custom_payload = invoice.get("payload", "{}")
    try:
        parsed_payload = json.loads(custom_payload)
        user_id = parsed_payload.get("user_id")
    except:
        user_id = None
        
    if not user_id:
        return {"status": "no user_id found in payload"}
        
    supabase = get_supabase_client()
    
    # Check if transaction already processed
    existing = supabase.table("transactions").select("id").eq("provider_tx_id", f"crypto_{invoice_id}").execute()
    if existing.data and len(existing.data) > 0:
        return {"status": "already processed"}
        
    # Calculate credits
    credits_to_add = int(amount * CREDITS_PER_USDT) if asset == "USDT" else int(amount * 10)
    
    # Save transaction
    supabase.table("transactions").insert({
        "user_id": user_id,
        "amount": amount,
        "currency": asset,
        "credits_added": credits_to_add,
        "provider": "cryptobot",
        "provider_tx_id": f"crypto_{invoice_id}"
    }).execute()
    
    # Add credits to user
    user_data = supabase.table("users").select("credits").eq("id", user_id).single().execute()
    if user_data.data:
        current_credits = user_data.data.get("credits", 0)
        supabase.table("users").update({"credits": current_credits + credits_to_add}).eq("id", user_id).execute()
        
    return {"status": "success"}

@router.post("/webhooks/donatello")
async def donatello_webhook(request: Request, x_key: str = Header(None, alias="X-Key")):
    """Webhook for Donatello payments."""
    if x_key != DONATELLO_KEY:
        raise HTTPException(status_code=403, detail="Invalid X-Key")
        
    data = await request.json()
    
    pub_id = data.get("pubId")
    message = data.get("message", "")
    amount = float(data.get("amount", 0))
    currency = data.get("currency", "UAH")
    
    if not message:
        return {"status": "ignored", "reason": "No email in message"}
        
    supabase = get_supabase_client()
    
    # Check if transaction already processed
    existing = supabase.table("transactions").select("id").eq("provider_tx_id", f"donatello_{pub_id}").execute()
    if existing.data and len(existing.data) > 0:
        return {"status": "already processed"}
        
    # Find user by email in the message
    # The user might write "email: test@test.com" or just "test@test.com"
    # For simplicity, we search if any user's email is in the message string
    users_resp = supabase.table("users").select("id, email, credits").execute()
    target_user = None
    for u in users_resp.data:
        if u.get("email", "").lower() in message.lower():
            target_user = u
            break
            
    if not target_user:
        return {"status": "ignored", "reason": "User email not found in message"}
        
    user_id = target_user["id"]
    current_credits = target_user.get("credits", 0)
    
    # Calculate credits based on currency
    if currency == "UAH":
        credits_to_add = int(amount * CREDITS_PER_UAH)
    elif currency == "EUR":
        credits_to_add = int(amount * CREDITS_PER_EUR)
    elif currency == "USD":
        credits_to_add = int(amount * CREDITS_PER_USDT)
    else:
        credits_to_add = int(amount) # fallback
        
    # Save transaction
    supabase.table("transactions").insert({
        "user_id": user_id,
        "amount": amount,
        "currency": currency,
        "credits_added": credits_to_add,
        "provider": "donatello",
        "provider_tx_id": f"donatello_{pub_id}"
    }).execute()
    
    # Update credits
    supabase.table("users").update({"credits": current_credits + credits_to_add}).eq("id", user_id).execute()
    
    return {"status": "success"}
class WithdrawRequest(BaseModel):
    amount: int
    payment_details: str

@router.post("/withdraw")
async def request_withdrawal(
    req: WithdrawRequest,
    current_user: AuthUser = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Request withdrawal of earned credits."""
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
        
    user_res = supabase.table("users").select("credits, withdrawable_credits").eq("id", current_user.user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_data = user_res.data[0]
    withdrawable = user_data.get("withdrawable_credits", 0)
    credits = user_data.get("credits", 0)
    
    if req.amount > withdrawable:
        raise HTTPException(status_code=400, detail="Not enough withdrawable credits")
    if req.amount > credits:
        raise HTTPException(status_code=400, detail="Not enough total credits")
        
    # Deduct credits
    supabase.table("users").update({
        "credits": credits - req.amount,
        "withdrawable_credits": withdrawable - req.amount
    }).eq("id", current_user.user_id).execute()
    
    # Create request
    supabase.table("withdrawal_requests").insert({
        "user_id": current_user.user_id,
        "amount": req.amount,
        "payment_details": req.payment_details
    }).execute()
    
    return {"success": True}

class CheckoutConfirmRequest(BaseModel):
    amount_credits: int
    payment_method: str

@router.post("/checkout/confirm")
async def checkout_confirm(
    req: CheckoutConfirmRequest,
    current_user: AuthUser = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Confirm a mock Stripe/sandbox payment and award credits."""
    user_res = supabase.table("users").select("credits").eq("id", current_user.user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    current_credits = user_res.data[0].get("credits", 0)
    tx_id = f"mock_{uuid.uuid4().hex[:12]}"
    
    # Save transaction record
    supabase.table("transactions").insert({
        "user_id": current_user.user_id,
        "amount": req.amount_credits * 2.5 if req.payment_method == 'revolut' else req.amount_credits * 4,
        "currency": "CZK" if req.payment_method == 'revolut' else "UAH",
        "credits_added": req.amount_credits,
        "provider": req.payment_method,
        "provider_tx_id": tx_id
    }).execute()
    
    # Update user balance
    new_credits = current_credits + req.amount_credits
    supabase.table("users").update({"credits": new_credits}).eq("id", current_user.user_id).execute()
    
    return {"success": True, "credits": new_credits}

