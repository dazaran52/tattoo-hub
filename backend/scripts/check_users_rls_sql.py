import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("POSTGRES_URL"))
cur = conn.cursor()

cur.execute("""
    SELECT polname, pg_get_expr(polqual, polrelid) as polqual, pg_get_expr(polwithcheck, polrelid) as polwithcheck, polroles, polcmd
    FROM pg_policy 
    WHERE polrelid = 'public.users'::regclass;
""")
policies = cur.fetchall()
for p in policies:
    print(p)
