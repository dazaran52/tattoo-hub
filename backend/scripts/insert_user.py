import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("POSTGRES_URL"))
conn.autocommit = True
cur = conn.cursor()

try:
    cur.execute("SELECT id, email FROM auth.users")
    user = cur.fetchone()
    print("User from auth:", user)
    if user:
        cur.execute("INSERT INTO public.users (id, email, role, is_admin, status, username) VALUES (%s, %s, %s, %s, %s, %s)",
                    (user[0], user[1], "admin", True, "approved", "admin"))
        print("Inserted manually into public.users")
except Exception as e:
    print("Error:", e)
