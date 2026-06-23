import asyncio
import imaplib
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
import os

# Load .env file
load_dotenv()

from app.config import get_settings
from app.services.email_lead_agent import call_gemini_api

def test_imap_connection():
    settings = get_settings()
    print("\n--- Testing IMAP Connection ---")
    print(f"Connecting to: {settings.LEAD_CAPTURE_IMAP_SERVER}")
    print(f"User: {settings.LEAD_CAPTURE_EMAIL}")
    
    try:
        mail = imaplib.IMAP4_SSL(settings.LEAD_CAPTURE_IMAP_SERVER, 993)
        mail.login(settings.LEAD_CAPTURE_EMAIL, settings.LEAD_CAPTURE_PASSWORD)
        print("✅ IMAP Connection and Login successful!")
        
        status, response = mail.select("INBOX")
        print(f"✅ Selected INBOX (Status: {status}, Emails: {response[0].decode()})")
        
        mail.logout()
    except Exception as e:
        print(f"❌ IMAP Test Failed: {e}")

def test_smtp_connection():
    settings = get_settings()
    print("\n--- Testing SMTP Connection ---")
    print(f"Connecting to: {settings.LEAD_REPLY_SMTP_SERVER}:{settings.LEAD_REPLY_SMTP_PORT}")
    print(f"User: {settings.LEAD_REPLY_EMAIL}")
    
    try:
        if settings.LEAD_REPLY_SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.LEAD_REPLY_SMTP_SERVER, settings.LEAD_REPLY_SMTP_PORT)
        else:
            server = smtplib.SMTP(settings.LEAD_REPLY_SMTP_SERVER, settings.LEAD_REPLY_SMTP_PORT)
            server.starttls()
            
        server.login(settings.LEAD_REPLY_EMAIL, settings.LEAD_REPLY_PASSWORD)
        print("✅ SMTP Connection and Login successful!")
        
        # Optionally send a test email to the user themselves
        msg = EmailMessage()
        msg['Subject'] = "Tattoo Hub - SMTP Connection Test"
        msg['From'] = f"{settings.LEAD_REPLY_FROM_NAME} <{settings.LEAD_REPLY_EMAIL}>"
        msg['To'] = settings.LEAD_REPLY_EMAIL # send to self
        msg.set_content("<h1>Connection Test</h1><p>If you see this email, SMTP sending works correctly!</p>", subtype='html')
        
        server.send_message(msg)
        print(f"✅ Sent test email to self ({settings.LEAD_REPLY_EMAIL})")
        server.quit()
    except Exception as e:
        print(f"❌ SMTP Test Failed: {e}")

async def test_gemini_api():
    print("\n--- Testing Gemini API Connection ---")
    system_prompt = "You are a helpful test bot. Output a JSON object with a single 'status' field set to 'success'."
    prompt = "Say hello and return the JSON."
    
    try:
        result = await call_gemini_api(system_prompt, prompt)
        if result:
            print("✅ Gemini API responded successfully!")
            print(f"Parsed response: {result}")
        else:
            print("❌ Gemini API returned None.")
    except Exception as e:
        print(f"❌ Gemini API Test Failed: {e}")

async def main():
    test_imap_connection()
    test_smtp_connection()
    await test_gemini_api()

if __name__ == "__main__":
    asyncio.run(main())
