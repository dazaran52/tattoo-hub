import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("POSTGRES_URL"))
conn.autocommit = True
cur = conn.cursor()

try:
    # Delete all users from auth.users (cascades to public.users and everything else)
    cur.execute("DELETE FROM auth.users;")
    print("Deleted all users.")

    # Truncate tables that might not cascade from auth.users
    cur.execute("TRUNCATE TABLE leads CASCADE;")
    cur.execute("TRUNCATE TABLE email_lead_conversations CASCADE;")
    cur.execute("TRUNCATE TABLE subscription_plans CASCADE;")
    print("Truncated other tables.")

    # Do not truncate countries and cities
except Exception as e:
    print("Error:", e)
