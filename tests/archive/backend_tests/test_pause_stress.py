import asyncio
import time
from unittest.mock import patch, MagicMock
from app.services.email_lead_agent import process_lead_email

fake_db = {
    "1": {
        "id": "1",
        "client_email": "race@test.com",
        "state": "active",
        "is_paused": False,
        "collected_data": {
            "history": [],
            "processed_message_ids": [],
            "images": []
        }
    }
}

class FakeQuery:
    def __init__(self, data):
        self.data = data
    def execute(self):
        return self

class FakeTable:
    def __init__(self, table_name):
        self.table_name = table_name

    def select(self, *args, **kwargs):
        class SelectQuery:
            def eq(self, key, val):
                return FakeQuery([fake_db["1"]] if val == "race@test.com" else [])
        return SelectQuery()

    def update(self, update_dict):
        class UpdateQuery:
            def eq(self, key, val):
                def execute():
                    fake_db[val].update(update_dict)
                    return FakeQuery([fake_db[val]])
                return MagicMock(execute=execute)
        return UpdateQuery()

class FakeSupabase:
    def table(self, name):
        return FakeTable(name)

async def delayed_gemini(*args, **kwargs):
    print("Gemini processing...")
    await asyncio.sleep(2)
    return {
        "reply": "Hello from Gemini",
        "completed": False,
        "extracted": {
            "style": None, "location": None, "size": None, 
            "budget_amount": None, "budget_currency": None, 
            "has_references": False, "idea": None, "client_country_code": None
        }
    }

async def run_race_condition_test():
    with patch("app.services.email_lead_agent.get_supabase_client", return_value=FakeSupabase()), \
         patch("app.services.email_lead_agent.call_gemini_api", side_effect=delayed_gemini), \
         patch("app.services.email_lead_agent.send_smtp_reply", return_value=True):
        
        print("Initial DB:", fake_db["1"]["collected_data"]["history"])
        
        # 1. Fire off the email processing which will take 2 seconds
        task = asyncio.create_task(process_lead_email("Client", "race@test.com", "Subject", "Hello", [], "<msg-1>"))
        
        # 2. Yield to let it fetch from DB and enter Gemini delay
        await asyncio.sleep(0.5)
        
        # 3. Simulate ADMIN PAUSING the conversation and sending a manual message
        print("Admin pauses and adds message...")
        fake_db["1"]["is_paused"] = True
        fake_db["1"]["collected_data"]["history"].append({"role": "admin", "text": "MANUAL REPLY", "timestamp": "now"})
        
        print("DB before Gemini finishes:", fake_db["1"]["collected_data"]["history"])
        
        # 4. Wait for Gemini to finish
        await task
        
        print("DB after Gemini finishes:", fake_db["1"]["collected_data"]["history"])
        
        has_admin_message = any(m["role"] == "admin" for m in fake_db["1"]["collected_data"]["history"])
        if not has_admin_message:
            print("FAIL: Race condition verified! Admin message was overwritten.")
        else:
            print("PASS: Admin message was preserved.")

if __name__ == "__main__":
    asyncio.run(run_race_condition_test())
