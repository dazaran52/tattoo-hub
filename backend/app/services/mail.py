import smtplib
from email.message import EmailMessage
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

def send_transactional_email(to_email: str, subject: str, html_content: str):
    settings = get_settings()
    
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.warning(f"SMTP not configured. Skipping email to {to_email}")
        return False
        
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = f"Tattoo Hub <{settings.SMTP_FROM_EMAIL}>"
    msg['To'] = to_email
    msg.set_content(html_content, subtype='html')
    
    try:
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
