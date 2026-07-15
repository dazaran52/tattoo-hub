import smtplib
from email.message import EmailMessage
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

def send_transactional_email(to_email: str, subject: str, html_content: str, from_name: str = "Tattoo Hub"):
    import requests
    try:
        headers = {
            "Authorization": f"Bearer re_9Sx8dLPC_Pn5XoLLKAz3wnrpYnvr6ThLh",
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
