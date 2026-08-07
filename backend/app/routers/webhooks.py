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

        meta = session.get('metadata') or {}
        meta_credit = meta.get('credit_amount')
        
        if meta_credit:
            credit_amount = Decimal(meta_credit)
        else:
            credit_amount = Decimal(amount_total) / Decimal(100)

        currency = session.get('currency', 'czk').upper()
        fulfillment = supabase.rpc("credit_stripe_balance", {
            "p_user_id": user_id,
            "p_amount": format(credit_amount, 'f'),
            "p_currency": currency,
            "p_provider_tx_id": f"stripe_{session_id}",
        }).execute()
        pkg_id = meta.get('package_id')
        if pkg_id in ('pro', 'vip', 'custom', 'vip_direct'):
            badge_tier = 'vip' if pkg_id in ('vip', 'custom', 'vip_direct') else 'pro'
            now_dt = datetime.datetime.now(datetime.timezone.utc)
            
            user_res = supabase.table("users").select("badge_expires_at").eq("id", user_id).single().execute()
            current_expires_at = user_res.data.get("badge_expires_at") if user_res.data else None
            
            base_dt = now_dt
            if current_expires_at:
                try:
                    exp_dt = datetime.datetime.fromisoformat(current_expires_at.replace("Z", "+00:00"))
                    if exp_dt > now_dt:
                        base_dt = exp_dt
                except Exception:
                    pass

            expires_at = (base_dt + datetime.timedelta(days=30)).isoformat()
            
            supabase.table("users").update({
                "badge_tier": badge_tier,
                "badge_expires_at": expires_at
            }).eq("id", user_id).execute()

        # Add notification
        supabase.table("notifications").insert({
            "user_id": user_id,
            "title": "Успешная оплата 💎" if pkg_id == "vip_direct" else "Баланс пополнен 💎",
            "message": f"Активирован статус {badge_tier.upper()} на 30 дней!" if pkg_id == "vip_direct" else f"Ваш баланс пополнен на {credit_amount} {currency}. {f'Активирован статус {badge_tier.upper()} на 30 дней!' if pkg_id in ('pro', 'vip', 'custom') else ''}",
            "type": "payment"
        }).execute()
        
    return {"status": "success"}


