import psycopg2
import os

url = "postgresql://postgres.swprcstdyskalatuvbqh:DaZaRaN52521@aws-1-eu-west-2.pooler.supabase.com:5432/postgres"

def run_migration():
    with open("backend/migrations/040_create_reviews.sql", "r") as f:
        sql = f.read()

    conn = psycopg2.connect(url)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            print("Migration executed successfully.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
