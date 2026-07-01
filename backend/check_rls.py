import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("POSTGRES_URL"))
cur = conn.cursor()

cur.execute("""
    SELECT polname, polcmd, polroles, polqual, polwithcheck 
    FROM pg_policy 
    WHERE polrelid = 'public.users'::regclass;
""")
policies = cur.fetchall()
print("Policies on users table:")
for p in policies:
    print(p)
