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



import stripe
from app.config import get_settings

class StripeCheckoutRequest(BaseModel):
    package_id: str
    
PACKAGES = {
    "starter": {"name": "Starter Pack", "price_czk": 300, "credits": 300},
    "standard": {"name": "Standard Pack", "price_czk": 500, "credits": 500},
    "pro": {"name": "Pro Pack", "price_czk": 1000, "credits": 1000},
    "vip": {"name": "VIP Pack", "price_czk": 2000, "credits": 2000},
}

@router.post("/stripe/create-checkout-session")
async def create_stripe_checkout_session(
    req: StripeCheckoutRequest,
    current_user: AuthUser = Depends(get_current_user)
):
    settings = get_settings()
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe is not configured")
        
    stripe.api_key = settings.STRIPE_SECRET_KEY
    
    pkg = PACKAGES.get(req.package_id)
    if not pkg:
        raise HTTPException(status_code=400, detail="Invalid package ID")
        
    # Assuming frontend runs on same domain or we pass it via headers.
    # We can use a default or allow frontend to pass success_url, but for safety:
    # We will hardcode the redirect logic or get it from headers.
    success_url = "https://tattoo-hub.xyz/dashboard?payment_success=true"
    cancel_url = "https://tattoo-hub.xyz/top-up"
    
    # In development, we might want localhost. We can use request origin if possible.
    # But tattoo-hub.xyz is fine for production. Let's make it flexible.
    
    try:
        checkout_session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            submit_type='pay',
            custom_text={
                'submit': {'message': 'Спасибо, что выбираете Tattoo HUB! Средства будут зачислены мгновенно.'}
            },
            line_items=[
                {
                    'price_data': {
                        'currency': 'czk',
                        'unit_amount': pkg['price_czk'] * 100, # Stripe uses cents
                        'product_data': {
                            'name': pkg['name'],
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
                'credits': pkg['credits']
            }
        )
        return {"checkout_url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
