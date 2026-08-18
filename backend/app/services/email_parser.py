import asyncio
import imaplib
import email
import re
import traceback
from email.header import decode_header
from app.config import get_settings
from app.database import get_supabase_client
from app.services.mail import send_transactional_email

# Conversions to credits (example)
CREDITS_PER_UAH = 1.0 / 4.0  # 4 UAH = 1 credit
CREDITS_PER_EUR = 10.0       # 0.1 EUR = 1 credit

def decode_str(s) -> str:
    if not s:
        return ""
    decoded_parts = decode_header(s)
    text = ""
    for string, charset in decoded_parts:
        if isinstance(string, bytes):
            try:
                text += string.decode(charset or 'utf-8')
            except:
                text += string.decode('utf-8', errors='ignore')
        else:
            text += string
    return text

def parse_revolut_email(body: str):
    """
    Parses Revolut email body to find amount and the payment reference (note).
    Revolut emails can vary, but typically contain:
    - An amount like "€50.00" or "50 UAH"
    - A note like "Note: john@example.com" or "Reference: john@example.com"
    """
    # Try to extract the note
    # Looking for 'Note: <text>' or 'Reference: <text>' or similar
    note = ""
    note_match = re.search(r'(?:Note|Reference|Сообщение|Примітка):\s*(.+)', body, re.IGNORECASE)
    if note_match:
        note = note_match.group(1).strip()
    
    # Try to extract the amount
    # e.g., "€50.00", "50 UAH", "€ 50"
    amount = 0.0
    currency = "EUR"
    
    # Simple regex for amount + currency
    # This will need to be refined based on actual Revolut email formats
    amount_match = re.search(r'(€|EUR|UAH|₴)\s*([0-9.,]+)|([0-9.,]+)\s*(€|EUR|UAH|₴)', body, re.IGNORECASE)
    if amount_match:
        if amount_match.group(1):
            curr_str = amount_match.group(1).upper()
            amt_str = amount_match.group(2).replace(',', '.').rstrip('.')
        else:
            amt_str = amount_match.group(3).replace(',', '.').rstrip('.')
            curr_str = amount_match.group(4).upper()
            
        try:
            amount = float(amt_str)
            if curr_str in ['€', 'EUR']:
                currency = 'EUR'
            elif curr_str in ['₴', 'UAH']:
                currency = 'UAH'
        except:
            pass

    return amount, currency, note


async def check_emails():
    settings = get_settings()
    if not settings.EMAIL_IMAP_SERVER or not settings.EMAIL_ACCOUNT or not settings.EMAIL_PASSWORD:
        return

    try:
        # Run blocking IMAP operations in executor
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _sync_check_emails, settings)
    except Exception as e:
        print(f"📧 Email parser error: {e}")
        traceback.print_exc()

def _sync_check_emails(settings):
    supabase = get_supabase_client()
    
    # Connect to IMAP
    mail = imaplib.IMAP4_SSL(settings.EMAIL_IMAP_SERVER)
    mail.login(settings.EMAIL_ACCOUNT, settings.EMAIL_PASSWORD)
    mail.select("INBOX")
    
    # Search for unseen emails from Revolut
    # Revolut typically sends from no-reply@revolut.com
    status, messages = mail.search(None, '(UNSEEN FROM "revolut.com")')
    if status != 'OK' or not messages[0]:
        mail.logout()
        return
        
    email_ids = messages[0].split()
    print(f"📧 Found {len(email_ids)} new Revolut emails")
    
    for e_id in email_ids:
        try:
            res, msg_data = mail.fetch(e_id, '(RFC822)')
            if res != 'OK':
                continue
                
            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)
            
            subject = decode_str(msg.get("Subject", ""))
            
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    content_type = part.get_content_type()
                    if content_type in ("text/plain", "text/html"):
                        try:
                            body += part.get_payload(decode=True).decode()
                        except:
                            pass
            else:
                try:
                    body = msg.get_payload(decode=True).decode()
                except:
                    pass
            
            # Extract data
            amount, currency, note = parse_revolut_email(body)
            # Fallback to subject if needed
            if not note:
                amount_sub, currency_sub, note_sub = parse_revolut_email(subject)
                if note_sub: note = note_sub
                if amount == 0 and amount_sub > 0:
                    amount = amount_sub
                    currency = currency_sub

            print(f"📧 Parsed: amount={amount} {currency}, note='{note}'")
            
            if amount > 0 and note:
                # Find user by note (checking if note contains user's email)
                users_resp = supabase.table("users").select("id, email, credits").execute()
                target_user = None
                for u in users_resp.data:
                    u_email = u.get("email", "").lower()
                    if u_email and u_email in note.lower():
                        target_user = u
                        break
                
                if target_user:
                    user_id = target_user["id"]
                    current_credits = target_user.get("credits", 0)
                    
                    # Calculate credits
                    if currency == "UAH":
                        credits_to_add = int(amount * CREDITS_PER_UAH)
                    else: # EUR
                        credits_to_add = int(amount * CREDITS_PER_EUR)
                        
                    # Add transaction
                    tx_id = f"revolut_auto_{e_id.decode()}_{int(amount)}"
                    
                    # Check if already processed
                    existing = supabase.table("transactions").select("id").eq("provider_tx_id", tx_id).execute()
                    if not existing.data:
                        # 1. Add transaction
                        supabase.table("transactions").insert({
                            "user_id": user_id,
                            "amount": amount,
                            "currency": currency,
                            "credits_added": credits_to_add,
                            "provider": "revolut_auto",
                            "provider_tx_id": tx_id
                        }).execute()
                        
                        # 2. Add credits
                        supabase.table("users").update({
                            "credits": current_credits + credits_to_add
                        }).eq("id", user_id).execute()
                        
                        print(f"✅ Successfully processed automated payment for {target_user['email']}")
                        
                        # 3. Send Email
                        if target_user.get("email"):
                            from app.services.i18n import get_text
                            send_transactional_email(
                                to_email=target_user["email"],
                                subject=get_text("ru", "email.balance_updated.subject"),
                                html_content=get_text("ru", "email.balance_updated.body", amount=amount, currency=currency, credits=credits_to_add)
                            )
                else:
                    print(f"⚠️ Could not find user for note: {note}")
        except Exception as e:
            print(f"❌ Error processing email {e_id}: {e}")
            traceback.print_exc()
        finally:
            # Mark as SEEN
            # Note: IMAP standard requires explicitly setting the \Seen flag
            # Wait, mail.fetch(e_id, '(RFC822)') already sets the SEEN flag automatically!
            pass

    mail.logout()

async def start_email_parser():
    """Background task to poll emails."""
    settings = get_settings()
    if not settings.EMAIL_IMAP_SERVER:
        print("📧 Email parser disabled (no EMAIL_IMAP_SERVER)")
        return
        
    print("📧 Starting Revolut email parser loop...")
    while True:
        await check_emails()
        await asyncio.sleep(60) # Poll every 60 seconds
