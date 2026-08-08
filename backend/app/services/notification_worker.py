import asyncio
import logging
from datetime import datetime, timezone
from app.database import get_supabase_client
from app.services.mail import send_transactional_email

logger = logging.getLogger(__name__)

async def process_notification_queue():
    """Polls the notification queue and sends pending notifications."""
    try:
        supabase = get_supabase_client()
        
        # Get pending notifications where send_at is in the past or now
        current_time = datetime.now(timezone.utc).isoformat()
        
        response = supabase.table("notification_queue") \
            .select("*") \
            .eq("status", "pending") \
            .lte("send_at", current_time) \
            .limit(50) \
            .execute()
            
        notifications = response.data
        if not notifications:
            return
            
        logger.info(f"Processing {len(notifications)} notifications from queue.")
        
        for notif in notifications:
            try:
                # Depending on event_type, we decide how to send
                event_type = notif.get("event_type")
                payload = notif.get("payload", {})
                user_id = notif.get("user_id")
                
                # Default to email via Resend
                to_email = payload.get("email")
                subject = payload.get("subject", "Tattoo HUB Notification")
                html_content = payload.get("html", "")
                
                push_data = payload.get("push")
                
                success = False
                
                if to_email and html_content:
                    success = send_transactional_email(to_email, subject, html_content)
                elif push_data and user_id:
                    from app.services.notifications import send_push_notification
                    # send_push_notification doesn't return success status currently, we assume True if no exception
                    send_push_notification(
                        user_id=user_id,
                        title=push_data.get("title", "Tattoo HUB"),
                        body=push_data.get("body", ""),
                        url=push_data.get("url", "/dashboard")
                    )
                    success = True
                else:
                    logger.error(f"Notification {notif['id']} missing valid email or push payload")
                    
                if success:
                    supabase.table("notification_queue").update({"status": "sent"}).eq("id", notif["id"]).execute()
                else:
                    supabase.table("notification_queue").update({"status": "failed"}).eq("id", notif["id"]).execute()
                    
            except Exception as e:
                logger.error(f"Error processing notification {notif['id']}: {str(e)}")
                supabase.table("notification_queue").update({"status": "failed"}).eq("id", notif["id"]).execute()
                
    except Exception as e:
        logger.error(f"Error polling notification queue: {str(e)}")


async def run_notification_worker():
    """Background worker that runs every minute."""
    logger.info("Starting background notification worker...")
    while True:
        await process_notification_queue()
        await asyncio.sleep(60) # Poll every 60 seconds
