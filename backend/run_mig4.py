import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.config import get_settings
import psycopg2

def run_migration():
    settings = get_settings()
    conn_str = settings.postgres_url
    print(f"Connecting to {conn_str}...")
    
    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    cursor = conn.cursor()
    
    with open('migrations/065_create_ban_system.sql', 'r') as f:
        sql = f.read()
        
    cursor.execute(sql)
    cursor.close()
    conn.close()
    print("Migration executed successfully.")

if __name__ == '__main__':
    run_migration()
