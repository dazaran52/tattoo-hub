import hmac
import hashlib
import json
import httpx
from fastapi import APIRouter, Header, Request, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.database import get_supabase_client, get_async_supabase_client
from app.middleware.auth import get_current_user, AuthUser
import uuid

router = APIRouter(prefix="/api/payments", tags=["payments"])



import stripe
from app.config import get_settings

class StripeCheckoutRequest(BaseModel):
    package_id: str
    custom_amount: Optional[float] = None
    
PACKAGES = {
    "starter": {
        "name": "Starter Balance",
        "amounts": {"CZK": 300, "EUR": 12, "USD": 13},
        "credit_amounts": {"CZK": 300, "EUR": 12, "USD": 13},
    },
    "standard": {
        "name": "Standard Balance (+10% Bonus)",
        "amounts": {"CZK": 500, "EUR": 20, "USD": 22},
        "credit_amounts": {"CZK": 550, "EUR": 22, "USD": 24.2},
    },
    "pro": {
        "name": "Pro Balance (+15% Bonus)",
        "amounts": {"CZK": 1000, "EUR": 40, "USD": 44},
        "credit_amounts": {"CZK": 1150, "EUR": 46, "USD": 50.6},
    },
    "vip": {
        "name": "VIP Balance (+20% Bonus)",
        "amounts": {"CZK": 2000, "EUR": 80, "USD": 88},
        "credit_amounts": {"CZK": 2400, "EUR": 96, "USD": 105.6},
    },
}

@router.post("/stripe/create-checkout-session")
async def create_stripe_checkout_session(
    req: StripeCheckoutRequest,
    current_user: AuthUser = Depends(get_current_user),
    supabase = Depends(get_supabase_client),
):
    settings = get_settings()
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured")
        
    stripe.api_key = settings.STRIPE_SECRET_KEY

    user_res = supabase.table("users").select("currency").eq("id", current_user.user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="USER_NOT_FOUND")
    currency = (user_res.data[0].get("currency") or "CZK").upper()

    min_custom_amounts = {"CZK": 3000, "EUR": 120, "USD": 132}

    if req.package_id == "custom":
        if not req.custom_amount or req.custom_amount < min_custom_amounts.get(currency, 3000):
            raise HTTPException(
                status_code=400, 
                detail=f"Custom amount must be at least {min_custom_amounts.get(currency, 3000)} {currency}"
            )
        amount_to_charge = float(req.custom_amount)
        credit_amount = round(amount_to_charge * 1.30, 2) # +30% Custom Bonus
        product_name = f"Custom VIP Balance ({amount_to_charge} {currency} + 30% Bonus)"
    else:
        pkg = PACKAGES.get(req.package_id)
        if not pkg:
            raise HTTPException(status_code=400, detail="Invalid package ID")
        amount_to_charge = pkg["amounts"].get(currency)
        credit_amount = pkg["credit_amounts"].get(currency)
        product_name = pkg["name"]
        if amount_to_charge is None or credit_amount is None:
            raise HTTPException(status_code=400, detail="UNSUPPORTED_WALLET_CURRENCY")
        
    success_url = "https://tattoo-hub.xyz/dashboard?payment_success=true"
    cancel_url = "https://tattoo-hub.xyz/top-up"
    
    try:
        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            submit_type='pay',
            custom_text={
                'submit': {'message': f'Зачисление {credit_amount} {currency} на баланс Tattoo HUB!'}
            },
            line_items=[
                {
                    'price_data': {
                        'currency': currency.lower(),
                        'unit_amount': int(round(amount_to_charge * 100)),
                        'product_data': {
                            'name': product_name,
                        },
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=current_user.user_id,
            metadata={
                'wallet_currency': currency,
                'package_id': req.package_id,
                'credit_amount': str(credit_amount),
            }
        )
        return {"checkout_url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extend-vip")
async def extend_vip_status(
    current_user: AuthUser = Depends(get_current_user),
    supabase = Depends(get_async_supabase_client)
):
    """Extend VIP status for 30 days using existing wallet balance atomically."""
    res = await supabase.rpc("extend_vip_status_from_balance", {
        "p_user_id": current_user.user_id
    }).execute()
    
    result = res.data or {}
    if not result.get("success"):
        err = result.get("error")
        if err == "INSUFFICIENT_BALANCE":
            required = result.get("required")
            curr = result.get("currency")
            raise HTTPException(
                status_code=400, 
                detail=f"INSUFFICIENT_BALANCE: Необходим баланс от {required} {curr}"
            )
        raise HTTPException(status_code=400, detail=err or "Failed to extend VIP status")
        
    return result
