import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if load_dotenv:
    load_dotenv()

DB_URL = os.environ.get("POSTGRES_URL")

if len(sys.argv) < 2:
    print("Usage: python run_migration.py <file> [<file> ...]")
    sys.exit(1)

if not DB_URL:
    print("POSTGRES_URL is required; refusing to deploy code without migrations")
    sys.exit(1)

import psycopg2

conn = psycopg2.connect(DB_URL)
try:
    with conn.cursor() as cur:
        for migration_file in sys.argv[1:]:
            print(f"Executing migration {migration_file}...")
            cur.execute(Path(migration_file).read_text())
    conn.commit()
    print("All migrations committed successfully.")
except Exception:
    conn.rollback()
    raise
finally:
    conn.close()
