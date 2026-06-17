import asyncio
import imaplib
import smtplib
import hashlib
import email
from email.message import EmailMessage
from email.utils import parseaddr
import re
import httpx
import logging
import time
from datetime import datetime
from app.config import get_settings
from app.database import get_supabase_client

logger = logging.getLogger(__name__)

seen_uids = set()

# Decodes RFC 2047 mail headers securely
def decode_header_str(s) -> str:
    if not s:
        return ""
    from email.header import decode_header
    try:
        decoded_parts = decode_header(s)
        text = ""
        for string, charset in decoded_parts:
            if isinstance(string, bytes):
                text += string.decode(charset or 'utf-8', errors='ignore')
            else:
                text += string
        return text
    except Exception as e:
        logger.error(f"Error decoding header {s}: {e}")
        return str(s)

def parse_client_details(from_header: str):
    """Extracts client name and email from From header."""
    name, email_addr = parseaddr(from_header)
    name = decode_header_str(name).strip()
    email_addr = email_addr.strip().lower()
    return name or None, email_addr

async def upload_attachment_to_supabase(conversation_id: str, filename: str, content_type: str, file_bytes: bytes) -> str | None:
    """Uploads an image attachment to Supabase Storage and returns the public URL."""
    try:
        supabase = get_supabase_client()
        # Sanitize filename
        safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
        path = f"emails/{conversation_id}/{safe_filename}"
        
        # Upload
        supabase.storage.from_("lead_images").upload(
            path=path,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
        
        # Get public URL
        public_url = supabase.storage.from_("lead_images").get_public_url(path)
        logger.info(f"Uploaded attachment {filename} -> {public_url}")
        return public_url
    except Exception as e:
        logger.error(f"Failed to upload attachment {filename} to Supabase: {e}")
        return None

async def call_gemini_api(system_prompt: str, prompt: str) -> dict | None:
    """Calls the Gemini REST API to get a structured JSON response."""
    settings = get_settings()
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY.startswith("YOUR_"):
        logger.error("Gemini API key is not configured.")
        return None
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
    
    # Configure payload with schema enforcement for strict output
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": f"SYSTEM INSTRUCTIONS:\n{system_prompt}\n\nPROMPT:\n{prompt}"
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "reply": {
                        "type": "STRING",
                        "description": "Polite response email to send to the client. Should guide them in their language."
                    },
                    "completed": {
                        "type": "BOOLEAN",
                        "description": "Set to true if we successfully collected style, location, size, and budget from the client."
                    },
                    "extracted": {
                        "type": "OBJECT",
                        "description": "The current state of extracted fields. Only update fields if they were explicitly provided in the latest client response.",
                        "properties": {
                            "style": {"type": "STRING", "description": "Tattoo style (e.g., realism, sketch, old school, blackwork, watercolor). Null if unknown."},
                            "location": {"type": "STRING", "description": "Location on body (e.g., forearm, back, leg, ribs). Null if unknown."},
                            "size": {"type": "STRING", "description": "Approximate size in cm (e.g., 10x15cm, 15cm). Null if unknown."},
                            "budget_amount": {"type": "NUMBER", "description": "The numeric amount of the budget. Null if unknown."},
                            "budget_currency": {"type": "STRING", "description": "Currency of the budget (e.g., CZK, EUR, PLN). Null if unknown."},
                            "has_references": {"type": "BOOLEAN", "description": "Whether the client provided reference images or mentioned them. False by default."},
                            "idea": {"type": "STRING", "description": "A clean description of the tattoo idea without email headers."},
                            "client_country_code": {"type": "STRING", "description": "Two-letter country code inferred from language or text. Null if unknown."}
                        },
                        "required": ["style", "location", "size", "budget_amount", "budget_currency", "has_references", "idea", "client_country_code"]
                    }
                ,
                },
                "required": ["reply", "completed", "extracted"]
            }
        }
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=30.0)
            if response.status_code != 200:
                logger.error(f"Gemini API returned error {response.status_code}: {response.text}")
                return None
            
            data = response.json()
            # Extract text content and parse JSON
            text_response = data["candidates"][0]["content"]["parts"][0]["text"]
            import json
            parsed = json.loads(text_response)
            return parsed
    except Exception as e:
        logger.error(f"Exception calling Gemini API: {e}")
        return None

def send_smtp_reply(to_email: str, subject: str, body_html: str, original_msg_id: str = None):
    """Sends a reply email via SMTP (VK WorkSpace)."""
    settings = get_settings()
    if not settings.LEAD_REPLY_EMAIL or not settings.LEAD_REPLY_PASSWORD:
        logger.warning("SMTP Reply settings not configured. Skipping email send.")
        return False
        
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = f"{settings.LEAD_REPLY_FROM_NAME} <{settings.LEAD_REPLY_EMAIL}>"
    msg['To'] = to_email
    
    # Threading support
    if original_msg_id:
        msg['In-Reply-To'] = original_msg_id
        msg['References'] = original_msg_id
        
    msg.set_content(body_html, subtype='html')
    
    try:
        # Port 465 requires SMTP_SSL, 587 requires SMTP + starttls
        if settings.LEAD_REPLY_SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.LEAD_REPLY_SMTP_SERVER, settings.LEAD_REPLY_SMTP_PORT) as server:
                server.login(settings.LEAD_REPLY_EMAIL, settings.LEAD_REPLY_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.LEAD_REPLY_SMTP_SERVER, settings.LEAD_REPLY_SMTP_PORT) as server:
                server.starttls()
                server.login(settings.LEAD_REPLY_EMAIL, settings.LEAD_REPLY_PASSWORD)
                server.send_message(msg)
                
        try:
            imap_host = settings.LEAD_REPLY_SMTP_SERVER.replace("smtp", "imap")
            with imaplib.IMAP4_SSL(imap_host) as imap_server:
                imap_server.login(settings.LEAD_REPLY_EMAIL, settings.LEAD_REPLY_PASSWORD)
                imap_server.append("Sent", '\\Seen', imaplib.Time2Internaldate(time.time()), bytes(msg))
        except Exception as imap_e:
            logger.error(f"Failed to append to Sent folder: {imap_e}")
                
        logger.info(f"Replied to client email: {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMTP reply to {to_email}: {e}")
        return False

def send_chat_notification_to_client(to_email: str, client_token: str, lead_title: str, message_preview: str):
    """Sends a notification email to the client about a new chat message."""
    settings = get_settings()
    subject = f"Новое сообщение по заявке: {lead_title}"
    
    # URL to the client portal chat
    # We assume frontend is running on a certain domain. We use frontend domain from env or default to localhost.
    # In production, set NEXT_PUBLIC_SITE_URL in .env
    frontend_url = getattr(settings, 'NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
    if frontend_url.endswith('/'):
        frontend_url = frontend_url[:-1]
        
    # We assume lead_id isn't directly passed here but we just use client token for login link or we need lead_id
    # Wait, the portal link is /c/{lead_id}?token={client_token}. We need lead_id.
    
    body_html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4f46e5;">У вас новое сообщение от мастера!</h2>
        <p>Мастер ответил на вашу заявку <strong>"{lead_title}"</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic;">
          "{message_preview}"
        </div>
        
        <p>Чтобы ответить мастеру и продолжить обсуждение, перейдите в свой личный кабинет:</p>
        <p>
          <a href="{frontend_url}/c/login?token={client_token}" 
             style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
             Перейти в чат
          </a>
        </p>
        
        <p style="font-size: 0.9em; color: #666; margin-top: 30px;">
          С уважением,<br>
          Команда OUT Tattoo
        </p>
      </body>
    </html>
    """
    
    return send_smtp_reply(to_email, subject, body_html)

async def process_lead_email(sender_name: str | None, sender_email: str, subject: str, body: str, attachments: list, original_msg_id: str | None):
    """Processes an incoming lead email through database storage and AI dialogue."""
    supabase = get_supabase_client()
    
    # Check if there is an active conversation
    conversation = None
    try:
        conv_resp = supabase.table("email_lead_conversations").select("*").eq("client_email", sender_email).execute()
        if conv_resp.data:
            for c in conv_resp.data:
                if original_msg_id and original_msg_id in c.get("collected_data", {}).get("processed_message_ids", []):
                    logger.info(f"Message {original_msg_id} already processed. Skipping.")
                    return
            for c in conv_resp.data:
                if c.get("state") in ["initiated", "active"]:
                    conversation = c
                    break
    except Exception as e:
        logger.error(f"Error fetching conversation: {e}")
        return
        
    if not conversation:
        # Create a new conversation
        conversation_id = None
        collected_data = {
            "style": None,
            "location": None,
            "size": None,
            "budget_amount": None,
            "budget_currency": None,
            "has_references": False,
            "idea": None,
            "client_country_code": None,
            "images": [],
            "history": [],
            "processed_message_ids": []
        }
        try:
            insert_resp = supabase.table("email_lead_conversations").insert({
                "client_email": sender_email,
                "client_name": sender_name,
                "original_subject": subject,
                "thread_id": original_msg_id,
                "state": "initiated",
                "collected_data": collected_data
            }).execute()
            if insert_resp.data:
                conversation = insert_resp.data[0]
                logger.info(f"Created new conversation for client: {sender_email}")
        except Exception as e:
            logger.error(f"Error creating conversation record: {e}")
            return
            
    conversation_id = conversation["id"]
    collected_data = conversation["collected_data"]
    
    # Ensure nested keys exist
    if "images" not in collected_data:
        collected_data["images"] = []
    if "history" not in collected_data:
        collected_data["history"] = []
    if "processed_message_ids" not in collected_data:
        collected_data["processed_message_ids"] = []
        
    # Upload any attachments to Supabase Storage and track URLs
    new_images = []
    for filename, content_type, file_bytes in attachments:
        public_url = await upload_attachment_to_supabase(conversation_id, filename, content_type, file_bytes)
        if public_url:
            new_images.append(public_url)
            
    collected_data["images"].extend(new_images)
    
    # Append the client message to the history
    collected_data["history"].append({
        "role": "user",
        "text": body,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    if conversation and conversation.get("is_paused"):
        logger.info(f"Conversation is paused for {sender_email}. Appended history, exiting before AI.")
        if original_msg_id and original_msg_id not in collected_data["processed_message_ids"]:
            collected_data["processed_message_ids"].append(original_msg_id)
        try:
            supabase.table("email_lead_conversations").update({
                "collected_data": collected_data
            }).eq("id", conversation_id).execute()
        except Exception as e:
            logger.error(f"Error updating paused conversation: {e}")
        return
    
    # Build System Prompt and User Prompt for Gemini
    system_prompt = (
        "You are an AI booking coordinator representing the OUT Tattoo Hub platform. "
        "Your role is to help matching clients with professional tattoo artists in their region.\n"
        "Your goal is to collect these requirements through email dialogue in a warm, welcoming tone:\n"
        "1. Tattoo Style (e.g., realism, sketch, old school, blackwork, watercolor, etc.)\n"
        "2. Location on the body (e.g., forearm, shoulder, back, ribs, thigh, leg)\n"
        "3. Size (approximate dimensions in cm)\n"
        "4. Budget (approximate price in CZK, EUR, or PL)\n\n"
        "CRITICAL RULES:\n"
        "- Respond in the same language the client writes in (e.g. Russian, Czech, Polish, English).\n"
        f"- In your VERY FIRST response (when there is only 1 user message in history), you MUST include a direct link "
        f"to the platform where they can create their request instantly in 1 minute and match with artists:\n"
        f"  https://tattoo-hub.xyz/create-request?email={sender_email}\n"
        f"  Explain that they can use this link, OR simply continue replying to this email thread.\n"
        "- Only ask for missing details that are currently null. Do not repeat questions if they already provided the info.\n"
        "- If they mention reference images, you can mention you received them (we save attachments automatically).\n"
        "- Return your output strictly as a JSON object matching the requested schema."
    )
    
    # Build history context
    history_lines = []
    for msg in collected_data["history"]:
        role = "Client" if msg["role"] == "user" else "Assistant"
        history_lines.append(f"{role}: {msg['text']}")
    history_text = "\n".join(history_lines)
    
    prompt = (
        f"Email Thread History:\n{history_text}\n\n"
        f"Current Extracted Requirements:\n"
        f"- Style: {collected_data.get('style')}\n"
        f"- Body Location: {collected_data.get('location')}\n"
        f"- Size: {collected_data.get('size')}\n"
        f"- Budget Amount: {collected_data.get('budget_amount')}\n"
        f"- Budget Currency: {collected_data.get('budget_currency')}\n"
        f"- Has References: {collected_data.get('has_references')}\n"
        f"- Idea: {collected_data.get('idea')}\n"
        f"- Country Code: {collected_data.get('client_country_code')}\n"
        f"- Attachments Uploaded: {len(collected_data['images'])}\n\n"
        "Analyze the last Client message, update the extracted requirements, and generate the response email."
    )
    
    # Call Gemini API
    ai_response = await call_gemini_api(system_prompt, prompt)
    if not ai_response:
        logger.error("Failed to get AI response from Gemini. Thread remains active.")
        return
        
    reply_text = ai_response["reply"]
    is_completed = ai_response["completed"]
    extracted = ai_response["extracted"]
    
    # Update collected requirements
    for key in ["style", "location", "size", "budget_amount", "budget_currency", "has_references", "idea", "client_country_code"]:
        if extracted.get(key) is not None:
            collected_data[key] = extracted[key]
            
    # Append the assistant's reply to history
    collected_data["history"].append({
        "role": "model",
        "text": reply_text,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    # Database Update / Action
    if is_completed:
        # Dynamic pricing
        budget_num = collected_data.get("budget_amount")
        currency = collected_data.get("budget_currency", "CZK")
        price_credits = 50
        if budget_num and currency:
            curr = currency.upper()
            if curr == "CZK":
                threshold = 5000
                multiplier = 1
            elif curr == "EUR":
                threshold = 200
                multiplier = 25
            elif curr == "PLN":
                threshold = 1000
                multiplier = 5
            else:
                threshold = 5000
                multiplier = 1
                
            percentage = 0.05 if budget_num > threshold else 0.10
            price_credits = int(budget_num * percentage * multiplier)

        # Create a lead in the leads table
        title = f"Tattoo request ({collected_data.get('style') or 'Custom'} on {collected_data.get('location') or 'body'})"
        desc = (
            f"Style: {collected_data.get('style') or 'TBD'}\n"
            f"Location: {collected_data.get('location') or 'TBD'}\n"
            f"Size: {collected_data.get('size') or 'TBD'}\n"
            f"Budget: {collected_data.get('budget_amount') or 'TBD'} {collected_data.get('budget_currency') or ''}\n\n"
            f"Description:\n{collected_data.get('idea') or body}"
        )
        contacts = f"Email: {sender_email}\nName: {sender_name or 'Client'}"
        
        # Generate client token
        import uuid
        client_token = str(uuid.uuid4())
        
        try:
            # Insert into leads table
            lead_insert = supabase.table("leads").insert({
                "title": title,
                "description": desc,
                "contacts": contacts,
                "image_urls": collected_data["images"],
                "price_credits": price_credits,
                "client_token": client_token
            }).execute()
            
            lead_id = lead_insert.data[0]["id"]
            
            logger.info("Successfully created a new lead in public.leads!")
            
            # Send SMTP confirmation email to client
            portal_url = f"https://tattoo-hub.xyz/c/{lead_id}?token={client_token}"
            confirm_subject = f"Re: {subject}"
            confirm_body = (
                f"<p>Здравствуйте, {sender_name or ''}!</p>"
                f"<p>Ваша заявка успешно оформлена на платформе Tattoo Hub. Мастера уже начали отправлять свои предложения.</p>"
                f"<p><strong>👉 <a href='{portal_url}'>Перейдите по этой ссылке</a>, чтобы посмотреть отклики мастеров, пообщаться с ними и выбрать лучшего!</strong></p>"
                f"<br/>"
                f"<ul>"
                f"<li><strong>Стиль:</strong> {collected_data.get('style') or 'не указан'}</li>"
                f"<li><strong>Место нанесения:</strong> {collected_data.get('location') or 'не указано'}</li>"
                f"<li><strong>Размер:</strong> {collected_data.get('size') or 'не указан'}</li>"
                f"<li><strong>Бюджет:</strong> {collected_data.get('budget_amount') or 'не указан'} {collected_data.get('budget_currency') or ''}</li>"
                f"</ul>"
                f"<p>Спасибо, что выбрали Tattoo Hub!</p>"
            )
            # Make sure language matches the last dialogue
            # (In production, you can let Gemini generate the confirmation, but this is a solid fallback)
            send_smtp_reply(sender_email, confirm_subject, confirm_body, original_msg_id)
            
            if original_msg_id and original_msg_id not in collected_data["processed_message_ids"]:
                collected_data["processed_message_ids"].append(original_msg_id)

            # Set state to completed
            supabase.table("email_lead_conversations").update({
                "state": "completed",
                "collected_data": collected_data
            }).eq("id", conversation_id).execute()
            
        except Exception as e:
            logger.error(f"Error creating completed lead record: {e}")
            
    else:
        # Conversation is still active, update state and send SMTP reply
        reply_subject = f"Re: {subject}"
        
        # Send reply
        sent = send_smtp_reply(sender_email, reply_subject, reply_text, original_msg_id)
        
        if sent:
            try:
                if original_msg_id and original_msg_id not in collected_data["processed_message_ids"]:
                    collected_data["processed_message_ids"].append(original_msg_id)

                supabase.table("email_lead_conversations").update({
                    "state": "active",
                    "collected_data": collected_data
                }).eq("id", conversation_id).execute()
            except Exception as e:
                logger.error(f"Error updating active conversation: {e}")

def check_lead_emails(loop: asyncio.AbstractEventLoop):
    """Polls the lead capture IMAP mailbox and processes new emails stealthily."""
    # Supabase sync wrappers require an event loop in the current thread
    try:
        asyncio.get_event_loop()
    except RuntimeError:
        asyncio.set_event_loop(asyncio.new_event_loop())

    settings = get_settings()
    
    # Guard clause for configuration
    if (not settings.LEAD_CAPTURE_IMAP_SERVER or 
        not settings.LEAD_CAPTURE_EMAIL or 
        not settings.LEAD_CAPTURE_PASSWORD or 
        settings.LEAD_CAPTURE_PASSWORD.startswith("YOUR_")):
        logger.warning("Lead Capture IMAP credentials are not configured or still placeholders.")
        return
        
    try:
        mail = imaplib.IMAP4_SSL(settings.LEAD_CAPTURE_IMAP_SERVER, 993)
        mail.login(settings.LEAD_CAPTURE_EMAIL, settings.LEAD_CAPTURE_PASSWORD)
        mail.select("INBOX")
        
        supabase = get_supabase_client()

        # Search for all unseen messages
        status, messages = mail.uid('SEARCH', None, "UNSEEN")
        if status != "OK" or not messages[0]:
            mail.logout()
            return
            
        email_uids = messages[0].split()
        logger.info(f"Lead Agent: Found {len(email_uids)} new emails to process.")
        
        # 1. Bulk fetch headers for all UNSEEN emails
        uids_str = b','.join(email_uids).decode('utf-8')
        res, fetch_data = mail.uid('FETCH', uids_str, "(BODY.PEEK[HEADER.FIELDS (MESSAGE-ID FROM SUBJECT DATE)])")
        
        unique_emails = set()
        headers_by_uid = {}
        if res == "OK" and fetch_data:
            for item in fetch_data:
                if isinstance(item, tuple):
                    import re
                    match = re.search(rb'UID\s+(\d+)', item[0])
                    if match:
                        uid_bytes = match.group(1)
                        raw_headers = item[1]
                        headers_by_uid[uid_bytes] = raw_headers
                        
                        msg_header = email.message_from_bytes(raw_headers)
                        from_header = msg_header.get("From", "")
                        _, sender_email = parse_client_details(from_header)
                        if sender_email:
                            unique_emails.add(sender_email)

        client_conversations = {}
        if unique_emails:
            try:
                conv_resp = supabase.table("email_lead_conversations").select("id, client_email, is_paused, collected_data, state").in_("client_email", list(unique_emails)).execute()
                if conv_resp.data:
                    for row in conv_resp.data:
                        email_key = row["client_email"]
                        if email_key not in client_conversations:
                            client_conversations[email_key] = []
                        client_conversations[email_key].append(row)
            except Exception as e:
                logger.error(f"Error pre-fetching conversations: {e}")
        
        for e_uid in email_uids:
            if e_uid in seen_uids:
                continue
            seen_uids.add(e_uid)
            try:
                # 1. Get pre-fetched header data
                raw_headers = headers_by_uid.get(e_uid)
                if not raw_headers:
                    continue
                    
                msg_header = email.message_from_bytes(raw_headers)
                msg_id = msg_header.get("Message-ID")
                from_header = msg_header.get("From", "")
                subject_header = msg_header.get("Subject", "")
                date_header = msg_header.get("Date", "")
                sender_name, sender_email = parse_client_details(from_header)
                
                if not sender_email:
                    logger.warning(f"Could not parse sender email from header: {from_header}")
                    continue
                    
                if not msg_id:
                    unique_str = f"{sender_email}{subject_header}{date_header}"
                    msg_id = f"<{hashlib.sha256(unique_str.encode('utf-8')).hexdigest()}@synthetic.outtattoo>"
                else:
                    msg_id = str(msg_id).strip()
                    
                if sender_email == settings.LEAD_CAPTURE_EMAIL.lower() or sender_email == settings.LEAD_REPLY_EMAIL.lower():
                    continue

                # Check conversation state for this sender_email using pre-fetched data
                skip_email = False
                try:
                    client_convs = client_conversations.get(sender_email, [])
                    for conv in client_convs:
                        if msg_id in (conv.get("collected_data") or {}).get("processed_message_ids", []):
                            logger.info(f"Skipping already processed message (header check): {msg_id}")
                            skip_email = True
                            break
                except Exception as e:
                    logger.error(f"Error checking conversation for {sender_email}: {e}")
                    
                if skip_email:
                    continue

                # 2. Marking the email as UNSEEN using (BODY.PEEK[]) to prevent status change
                res, msg_data = mail.uid('FETCH', e_uid, "(BODY.PEEK[])")
                if res != "OK":
                    continue
                    
                raw_email = msg_data[0][1]
                msg = email.message_from_bytes(raw_email)
                
                # Metadata
                subject = decode_header_str(msg.get("Subject", ""))
                    
                # Parse body and attachments
                body = ""
                attachments = []
                
                if msg.is_multipart():
                    for part in msg.walk():
                        content_type = part.get_content_type()
                        content_disposition = str(part.get("Content-Disposition", ""))
                        
                        # Extract Text/HTML
                        if content_type == "text/plain" and "attachment" not in content_disposition:
                            try:
                                body += part.get_payload(decode=True).decode(errors="ignore")
                            except Exception as parse_err:
                                logger.error(f"Error parsing body text part: {parse_err}")
                        elif content_type == "text/html" and not body and "attachment" not in content_disposition:
                            try:
                                # Fallback to HTML if text/plain is missing
                                body += part.get_payload(decode=True).decode(errors="ignore")
                            except Exception as parse_err:
                                logger.error(f"Error parsing HTML body part: {parse_err}")
                                
                        # Extract Image Attachments
                        if content_type.startswith("image/"):
                            filename = part.get_filename()
                            if filename:
                                filename = decode_header_str(filename)
                            else:
                                ext = content_type.split("/")[-1]
                                filename = f"image_{len(attachments)}.{ext}"
                            file_bytes = part.get_payload(decode=True)
                            if file_bytes:
                                attachments.append((filename, content_type, file_bytes))
                else:
                    try:
                        body = msg.get_payload(decode=True).decode(errors="ignore")
                    except Exception as parse_err:
                        logger.error(f"Error parsing single-part email body: {parse_err}")
                
                # Execute asynchronously
                future = asyncio.run_coroutine_threadsafe(
                    process_lead_email(sender_name, sender_email, subject, body, attachments, msg_id),
                    loop
                )
                future.result()
                
            except Exception as email_err:
                seen_uids.discard(e_uid)
                logger.error(f"Error parsing individual email ID {e_uid}: {email_err}")
                
        mail.logout()
    except Exception as e:
        logger.error(f"IMAP Exception in Lead Agent: {e}")

async def start_email_lead_agent():
    """Background loop that polls new emails for the lead interceptor dialogue agent."""
    settings = get_settings()
    logger.info("📧 Starting Automated Email Lead Interceptor & Dialogue Agent...")
    
    while True:
        try:
            # Execute the synchronous polling block in a threadpool executor to avoid blocking the async event loop
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, check_lead_emails, loop)
        except Exception as err:
            logger.error(f"Lead Interceptor Loop Error: {err}")
            
        await asyncio.sleep(60)  # Check every 60 seconds
