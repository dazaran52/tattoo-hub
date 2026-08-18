import json
from pywebpush import webpush, WebPushException
from app.database import get_supabase_client
from app.config import get_settings

def send_push_notification(user_id: str, title: str, body: str, url: str = "/dashboard"):
    """Send a web push notification to all devices of a user."""
    supabase = get_supabase_client()
    
    # Get all subscriptions for this user
    res = supabase.table("push_subscriptions").select("*").eq("user_id", user_id).execute()
    
    if not res.data:
        return
        
    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url
    })
    
    for sub in res.data:
        try:
            subscription_info = {
                "endpoint": sub["endpoint"],
                "keys": {
                    "p256dh": sub["p256dh"],
                    "auth": sub["auth"]
                }
            }
            
            settings = get_settings()
            
            if not settings.VAPID_PRIVATE_KEY:
                print("Web push failed: VAPID_PRIVATE_KEY not configured")
                continue
                
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_SUBJECT}
            )
        except WebPushException as ex:
            print(f"Web push failed: {ex}")
            # If the subscription is expired or invalid, we should delete it
            if ex.response and ex.response.status_code in [404, 410]:
                supabase.table("push_subscriptions").delete().eq("id", sub["id"]).execute()
        except Exception as e:
            print(f"Error sending push: {e}")

def notify_admins(title: str, body: str, url: str = "/admin"):
    """Send a web push notification to all admins."""
    supabase = get_supabase_client()
    res = supabase.table("users").select("id").eq("is_admin", True).execute()
    if not res.data:
        return
    for admin in res.data:
        send_push_notification(admin["id"], title, body, url)
