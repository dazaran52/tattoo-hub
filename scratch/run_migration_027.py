import os
import psycopg2
from dotenv import load_dotenv

load_dotenv("/home/dazaran/Загрузки/Tattoo HUB/backend/.env")

DB_URL = os.environ.get("POSTGRES_URL")

migration_file = "/home/dazaran/Загрузки/Tattoo HUB/backend/migrations/027_add_client_id_to_leads.sql"
with open(migration_file, "r") as f:
    sql = f.read()

conn = psycopg2.connect(DB_URL)
conn.autocommit = True
cur = conn.cursor()

print("Executing migration 027...")
cur.execute(sql)
print("Success!")
cur.close()
conn.close()
