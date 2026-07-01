import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("POSTGRES_URL"))
cur = conn.cursor()

cur.execute("SELECT count(*) FROM countries")
print("Countries count:", cur.fetchone()[0])
cur.execute("SELECT count(*) FROM cities")
print("Cities count:", cur.fetchone()[0])
