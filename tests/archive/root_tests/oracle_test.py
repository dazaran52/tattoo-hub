import asyncio
import os
import sys

from app.database import get_supabase_client
from app.services.email_lead_agent import process_lead_email

async def main():
    supabase = get_supabase_client()
    sender_email = "test_pause_flaw@example.com"
    
    # Clean up previous tests
    supabase.table("email_lead_conversations").delete().eq("client_email", sender_email).execute()

    # 1. Create a "completed" conversation that is PAUSED
    collected_data = {
        "style": "realism",
        "location": "back",
        "size": "large",
        "budget_amount": 500,
        "budget_currency": "EUR",
        "has_references": True,
        "idea": "test",
        "client_country_code": "DE",
        "images": [],
        "history": [],
        "processed_message_ids": ["<old-msg-1>"]
    }
    supabase.table("email_lead_conversations").insert({
        "client_email": sender_email,
        "client_name": "Test Client",
        "original_subject": "Test",
        "state": "completed",
        "is_paused": True,
        "collected_data": collected_data
    }).execute()

    print("[*] Created completed and paused conversation.")

    # 2. Simulate new email from the same client
    print("[*] Processing new email from paused client...")
    await process_lead_email(
        "Test Client", 
        sender_email, 
        "New Request", 
        "I want another tattoo", 
        [], 
        "<new-msg-1>"
    )

    # 3. Check what happened
    convs = supabase.table("email_lead_conversations").select("*").eq("client_email", sender_email).execute()
    active_convs = [c for c in convs.data if c["state"] == "initiated" or c["state"] == "active"]
    
    if len(active_convs) > 0:
        new_conv = active_convs[0]
        if not new_conv["is_paused"]:
            print("FAIL: A new unpaused conversation was created for a paused client!")
        else:
            print("PASS: New conversation is paused.")
    else:
        # Was it ignored?
        print("PASS: No new conversation created. Email ignored or appended to old conversation.")

if __name__ == "__main__":
    asyncio.run(main())
