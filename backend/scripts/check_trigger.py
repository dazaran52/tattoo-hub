import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("POSTGRES_URL"))
cur = conn.cursor()

cur.execute("SELECT trigger_name, event_manipulation, event_object_table FROM information_schema.triggers;")
triggers = cur.fetchall()
print("Triggers:")
for t in triggers:
    print(t)
