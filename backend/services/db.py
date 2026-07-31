import os
import sqlite3
from flask import g
from models.schemas import PROFILE_FIELDS, SCHEMA_SQL

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', 'data')
DB_PATH = os.path.abspath(os.path.join(DATA_DIR, 'cv.db'))


def ensure_database():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA_SQL)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM profile')
    count = cursor.fetchone()[0]
    if count == 0:
        cursor.execute(
            '''INSERT INTO profile (
               id, name, title, summary, profile_photo, email, phone, city, address,
               github, linkedin, website, instagram, x, youtube, cv_pdf, last_updated
             ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now", "localtime"))''',
            tuple('' for _ in PROFILE_FIELDS)
        )
    else:
        # Check if cv_pdf column exists and add it if not
        try:
            cursor.execute("PRAGMA table_info(profile)")
            cols = [row[1] for row in cursor.fetchall()]
            if 'cv_pdf' not in cols:
                cursor.execute("ALTER TABLE profile ADD COLUMN cv_pdf TEXT")
        except Exception:
            pass
    # Ensure ip_address column exists in visitor_analytics (migration for existing DBs)
    try:
        cursor.execute("PRAGMA table_info(visitor_analytics)")
        cols = [row[1] for row in cursor.fetchall()]
        # All columns that may be missing in older production databases
        analytics_migrations = [
            ('ip_address',  'TEXT'),
            ('country',     'TEXT'),
            ('region',      'TEXT'),
            ('city',        'TEXT'),
            ('loc',         'TEXT'),
            ('org',         'TEXT'),
            ('timezone',    'TEXT'),
            ('postal',      'TEXT'),
            ('network_type','TEXT DEFAULT \'Unknown\''),
        ]
        for col_name, col_def in analytics_migrations:
            if col_name not in cols:
                cursor.execute(f"ALTER TABLE visitor_analytics ADD COLUMN {col_name} {col_def}")
    except Exception:
        pass

    tables_with_timestamps = [
        'education', 'courses', 'certificates',
        'experiences', 'projects', 'skills', 'languages'
    ]
    for table in tables_with_timestamps:
        try:
            cursor.execute(f"PRAGMA table_info({table})")
            cols = [row[1] for row in cursor.fetchall()]
            if 'created_at' not in cols:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN created_at TEXT DEFAULT (datetime('now', 'localtime'))")
            if 'updated_at' not in cols:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN updated_at TEXT")
        except Exception:
            # ignore if table doesn't exist yet
            pass


    # Ensure default analytics settings row exists
    try:
        cursor.execute('SELECT COUNT(*) FROM analytics_settings')
        count = cursor.fetchone()[0]
        if count == 0:
            cursor.execute('INSERT INTO analytics_settings (id) VALUES (1)')
    except Exception:
        pass

    # Ensure new columns exist in analytics_settings
    try:
        cursor.execute("PRAGMA table_info(analytics_settings)")
        cols = [row[1] for row in cursor.fetchall()]
        if 'analytics_active' not in cols:
            cursor.execute("ALTER TABLE analytics_settings ADD COLUMN analytics_active INTEGER DEFAULT 1")
        if 'show_network_type' not in cols:
            cursor.execute("ALTER TABLE analytics_settings ADD COLUMN show_network_type INTEGER DEFAULT 1")
    except Exception:
        pass
    conn.commit()
    conn.close()


def get_db():
    if 'db' not in g:
        ensure_database()
        connection = sqlite3.connect(DB_PATH)
        connection.row_factory = sqlite3.Row
        g.db = connection
    return g.db


def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()
