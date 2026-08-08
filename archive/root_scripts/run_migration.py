import psycopg2
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
db_url = os.environ.get("POSTGRES_URL")

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    with open("backend/migrations/064_drop_legacy_credits_column.sql", "r") as f:
        sql = f.read()
    cursor.execute(sql)
    print("Migration executed successfully")
except Exception as e:
    print(f"Failed to execute migration: {e}")
finally:
    if 'cursor' in locals():
        cursor.close()
    if 'conn' in locals():
        conn.close()
