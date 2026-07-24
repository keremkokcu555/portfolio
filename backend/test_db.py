import sqlite3
from services.db import DB_PATH

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Tüm tabloları listele
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = sorted([t[0] for t in cursor.fetchall()])

print("=== Veritabanı Durumu ===")
print(f"Dosya: {DB_PATH}\n")

for table in tables:
    cursor.execute(f'SELECT COUNT(*) FROM {table}')
    count = cursor.fetchone()[0]
    print(f"✓ {table}: {count} record(s)")

conn.close()
print("\n=== Test Tamamlandı ===")
