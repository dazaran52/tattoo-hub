import asyncio
from supabase import create_client
import os
import requests
from dotenv import load_dotenv
load_dotenv()

# We can query postgres using the rest api or we can just create a migration file and run it
