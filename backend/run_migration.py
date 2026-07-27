import hashlib
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
        cur.execute("SELECT pg_advisory_xact_lock(hashtext('tattoo_hub_migrations'))")
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS public.schema_migrations (
                name TEXT PRIMARY KEY,
                checksum TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
            REVOKE ALL ON TABLE public.schema_migrations FROM PUBLIC, anon, authenticated;
            GRANT ALL ON TABLE public.schema_migrations TO service_role
            """
        )

        for migration_arg in sys.argv[1:]:
            migration_file = Path(migration_arg)
            sql = migration_file.read_text(encoding="utf-8")
            checksum = hashlib.sha256(sql.encode("utf-8")).hexdigest()
            name = migration_file.name

            cur.execute(
                "SELECT checksum FROM public.schema_migrations WHERE name = %s",
                (name,),
            )
            row = cur.fetchone()
            if row:
                if row[0] != checksum:
                    raise RuntimeError(
                        f"Migration checksum mismatch for {name}; refusing to rewrite history"
                    )
                print(f"Skipping already applied migration {name}.")
                continue

            print(f"Executing migration {name}...")
            cur.execute(sql)
            cur.execute(
                "INSERT INTO public.schema_migrations (name, checksum) VALUES (%s, %s)",
                (name, checksum),
            )

    conn.commit()
    print("All pending migrations committed successfully.")
except Exception:
    conn.rollback()
    raise
finally:
    conn.close()
