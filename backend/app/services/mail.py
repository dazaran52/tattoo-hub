import smtplib
from email.message import EmailMessage
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

def send_transactional_email(to_email: str, subject: str, html_content: str, from_name: str = "Tattoo Hub"):
    import requests
    try:
        api_key = get_settings().RESEND_API_KEY
        if not api_key:
            logger.error("RESEND_API_KEY is not configured; email was not sent")
            return False
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "from": f"{from_name} <info@tattoo-hub.xyz>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        resp = requests.post("https://api.resend.com/emails", headers=headers, json=data, timeout=10)
        if not resp.ok:
            logger.error(f"Resend API failed: {resp.text}")
            return False
            
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
