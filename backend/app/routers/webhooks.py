import stripe
from decimal import Decimal
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
            
        session_id = session.get('id')
        amount_total = session.get('amount_total')
        if not session_id or not isinstance(amount_total, int) or amount_total <= 0:
            return {"status": "ignored", "reason": "Invalid Stripe session amount"}
        if session.get('payment_status') != 'paid':
            return {"status": "ignored", "reason": "Payment is not paid"}

        amount_paid = Decimal(amount_total) / Decimal(100)
        currency = session.get('currency', 'czk').upper()
        fulfillment = supabase.rpc("credit_stripe_balance", {
            "p_user_id": user_id,
            "p_amount": format(amount_paid, 'f'),
            "p_currency": currency,
            "p_provider_tx_id": f"stripe_{session_id}",
        }).execute()
        result = fulfillment.data or {}
        if not result.get("processed"):
            return {"status": "already processed"}

        # Add notification
        supabase.table("notifications").insert({
            "user_id": user_id,
            "title": "Баланс пополнен",
            "message": f"Ваш баланс успешно пополнен на {amount_paid} {currency} через Stripe.",
            "type": "payment"
        }).execute()
        
    return {"status": "success"}


