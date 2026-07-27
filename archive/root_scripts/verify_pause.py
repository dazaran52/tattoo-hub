import asyncio
import os
import sys

from app.services.email_lead_agent import process_lead_email
from app.database import get_supabase_client

async def main():
    print("Testing pause logic...")

if __name__ == "__main__":
    asyncio.run(main())
