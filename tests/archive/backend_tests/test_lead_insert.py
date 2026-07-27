import asyncio
import uuid
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.routers.leads import create_client_lead, ClientLeadCreate
from app.database import get_async_supabase_client
from fastapi import BackgroundTasks

async def test():
    supabase = get_async_supabase_client()
    lead = ClientLeadCreate(
        description="Test Lead",
        style="Traditional",
        size="Small",
        budget="5000 CZK",
        budget_val=5000,
        budget_currency="CZK",
        client_priority="quality",
        city="Prague",
        name="Test Client",
        email="test@example.com",
        contact="test@example.com",
        is_personal=False
    )
    try:
        res = await create_client_lead(lead, BackgroundTasks(), None, supabase)
        print("Success:", res)
    except Exception as e:
        print("Error:", e)

asyncio.run(test())
