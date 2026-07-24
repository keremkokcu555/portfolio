import os
import sqlite3
from dotenv import load_dotenv
from argon2 import PasswordHasher

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
load_dotenv(env_path)

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'cv.db'))

def migrate():
    admin_user = os.environ.get('ADMIN_USERNAME', 'admin')
    admin_pass = os.environ.get('ADMIN_PASSWORD_HASH') # This holds the plain password right now in .env, despite the name
    
    if not admin_pass:
        print("No password found in .env. Using 'admin123' as default.")
        admin_pass = 'admin123'

    ph = PasswordHasher()
    hashed = ph.hash(admin_pass)
    
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Create table just in case ensure_database wasn't called yet
    c.execute('''
    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
    ''')
    
    c.execute('SELECT COUNT(*) FROM admins WHERE username = ?', (admin_user,))
    if c.fetchone()[0] == 0:
        c.execute('INSERT INTO admins (username, password_hash) VALUES (?, ?)', (admin_user, hashed))
        print(f"Admin '{admin_user}' inserted into db with Argon2 hash.")
    else:
        print(f"Admin '{admin_user}' already exists in db. Updating hash.")
        c.execute('UPDATE admins SET password_hash = ? WHERE username = ?', (hashed, admin_user))
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrate()
