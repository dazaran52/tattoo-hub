import os
import psycopg2
from dotenv import load_dotenv
import sys

load_dotenv()

DB_URL = os.environ.get("POSTGRES_URL")

if len(sys.argv) < 2:
    print("Usage: python run_migration.py <file>")
    sys.exit(1)

migration_file = sys.argv[1]
with open(migration_file, "r") as f:
    sql = f.read()

conn = psycopg2.connect(DB_URL)
conn.autocommit = True
cur = conn.cursor()

print(f"Executing migration {migration_file}...")
cur.execute(sql)
print("Success!")
cur.close()
conn.close()
