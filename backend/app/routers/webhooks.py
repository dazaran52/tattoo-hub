import stripe
from fastapi import APIRouter, Request, HTTPException, Depends, Header
from app.database import get_supabase_client
from supabase import Client
from app.config import get_settings

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    supabase: Client = Depends(get_supabase_client)
):
    settings = get_settings()
    
    if not settings.STRIPE_WEBHOOK_SECRET:
        print("Warning: STRIPE_WEBHOOK_SECRET is not set!")
        return {"status": "ignored", "reason": "No webhook secret configured"}
        
    payload = await request.body()
    
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Fulfill the purchase
        user_id = session.get('client_reference_id')
        
        if not user_id:
            return {"status": "ignored", "reason": "No client_reference_id found"}
            
        # Get custom metadata
        metadata = session.get('metadata', {})
        credits_to_add = int(metadata.get('credits', 0))
        
        if credits_to_add <= 0:
            return {"status": "ignored", "reason": "Invalid credits amount in metadata"}
            
        # Check if transaction was already processed
        session_id = session.get('id')
        existing = supabase.table("transactions").select("id").eq("provider_tx_id", f"stripe_{session_id}").execute()
        if existing.data and len(existing.data) > 0:
            return {"status": "already processed"}

        # Add credits
        user_res = supabase.table("users").select("credits").eq("id", user_id).execute()
        if not user_res.data:
            return {"status": "failed", "reason": "User not found"}
            
        current_credits = user_res.data[0].get("credits", 0)
        
        amount_paid = session.get('amount_total', 0) / 100.0
        currency = session.get('currency', 'czk').upper()
        
        supabase.table("transactions").insert({
            "user_id": user_id,
            "amount": amount_paid,
            "currency": currency,
            "credits_added": credits_to_add,
            "provider": "stripe",
            "provider_tx_id": f"stripe_{session_id}",
            "status": "completed"
        }).execute()
        
        supabase.table("users").update({
            "credits": current_credits + credits_to_add
        }).eq("id", user_id).execute()
        
        # Add notification
        supabase.table("notifications").insert({
            "user_id": user_id,
            "title": "Баланс пополнен",
            "message": f"Ваш баланс успешно пополнен на {credits_to_add} кредитов через Stripe.",
            "type": "payment"
        }).execute()
        
    return {"status": "success"}


