import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("POSTGRES_URL"))
cur = conn.cursor()

# List all tables in the public schema
cur.execute("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
""")
tables = cur.fetchall()
print("Tables in public schema:")
for t in tables:
    print(t[0])

# List all users
cur.execute("SELECT id, email FROM auth.users")
users = cur.fetchall()
print("\nUsers:")
for u in users:
    print(u)
