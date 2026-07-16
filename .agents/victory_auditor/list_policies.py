import psycopg2
import os
from dotenv import load_dotenv

# Load env from backend/.env
load_dotenv("/home/dazaran/Загрузки/Tattoo HUB/backend/.env")

url = os.getenv("POSTGRES_URL")
print(f"Connecting to: {url[:30]}...")
conn = psycopg2.connect(url)
cur = conn.cursor()

cur.execute("""
    SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
    FROM pg_policies
    ORDER BY schemaname, tablename, policyname;
""")

policies = cur.fetchall()
print(f"Found {len(policies)} policies:")
for p in policies:
    print(f"Table: {p[0]}.{p[1]} | Policy: {p[2]} | Permissive: {p[3]} | Roles: {p[4]} | Cmd: {p[5]}")
    print(f"  USING: {p[6]}")
    print(f"  WITH CHECK: {p[7]}")
    print("-" * 50)

cur.close()
conn.close()
