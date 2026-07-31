import os
import sqlite3
from flask import g
from models.schemas import PROFILE_FIELDS, SCHEMA_SQL

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, '..', 'data')
DB_PATH = os.path.abspath(os.path.join(DATA_DIR, 'cv.db'))


def ensure_database():
    import logging
    log = logging.getLogger('db.ensure_database')

    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    try:
        conn.executescript(SCHEMA_SQL)
    except Exception:
        import traceback
        log.error("SCHEMA_SQL executescript failed:\n%s", traceback.format_exc())
        raise

    cursor = conn.cursor()

    # ── Profile seed & cv_pdf migration ────────────────────────────
    try:
        count = cursor.execute('SELECT COUNT(*) FROM profile').fetchone()[0]
        if count == 0:
            cursor.execute(
                '''INSERT INTO profile (
                   id, name, title, summary, profile_photo, email, phone, city, address,
                   github, linkedin, website, instagram, x, youtube, cv_pdf, last_updated
                 ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now", "localtime"))''',
                tuple('' for _ in PROFILE_FIELDS)
            )
        else:
            cols = [r[1] for r in cursor.execute("PRAGMA table_info(profile)").fetchall()]
            if 'cv_pdf' not in cols:
                cursor.execute("ALTER TABLE profile ADD COLUMN cv_pdf TEXT")
                log.info("Migration: added profile.cv_pdf")
    except Exception:
        import traceback
        log.error("Profile migration failed:\n%s", traceback.format_exc())

    # ── visitor_analytics: ALL required columns ─────────────────────
    # Uses sqlite3.connect directly — NO flask.g, NO app_context required.
    ANALYTICS_COLS = [
        ('ip_address',   'TEXT'),
        ('country',      'TEXT'),
        ('region',       'TEXT'),
        ('city',         'TEXT'),
        ('loc',          'TEXT'),
        ('org',          'TEXT'),
        ('timezone',     'TEXT'),
        ('postal',       'TEXT'),
        ('network_type', "TEXT DEFAULT 'Unknown'"),
    ]
    try:
        existing = {r[1] for r in cursor.execute("PRAGMA table_info(visitor_analytics)").fetchall()}
        for col_name, col_def in ANALYTICS_COLS:
            if col_name not in existing:
                cursor.execute(f"ALTER TABLE visitor_analytics ADD COLUMN {col_name} {col_def}")
                log.info("Migration: added visitor_analytics.%s", col_name)
    except Exception:
        import traceback
        log.error("visitor_analytics column migration failed:\n%s", traceback.format_exc())
        raise  # This is critical — let it surface

    # ── analytics_settings: new columns ────────────────────────────
    SETTINGS_COLS = [
        ('analytics_active',  'INTEGER DEFAULT 1'),
        ('show_network_type', 'INTEGER DEFAULT 1'),
    ]
    try:
        existing = {r[1] for r in cursor.execute("PRAGMA table_info(analytics_settings)").fetchall()}
        for col_name, col_def in SETTINGS_COLS:
            if col_name not in existing:
                cursor.execute(f"ALTER TABLE analytics_settings ADD COLUMN {col_name} {col_def}")
                log.info("Migration: added analytics_settings.%s", col_name)
    except Exception:
        import traceback
        log.error("analytics_settings column migration failed:\n%s", traceback.format_exc())

    # ── analytics_settings: default row ────────────────────────────
    try:
        if cursor.execute('SELECT COUNT(*) FROM analytics_settings').fetchone()[0] == 0:
            cursor.execute('INSERT INTO analytics_settings (id) VALUES (1)')
            log.info("Migration: inserted default analytics_settings row")
    except Exception:
        import traceback
        log.error("analytics_settings seed failed:\n%s", traceback.format_exc())

    # ── Timestamp columns on entity tables ─────────────────────────
    TIMESTAMPED = ['education', 'courses', 'certificates', 'experiences', 'projects', 'skills', 'languages']
    for table in TIMESTAMPED:
        try:
            cols = [r[1] for r in cursor.execute(f"PRAGMA table_info({table})").fetchall()]
            if 'created_at' not in cols:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN created_at TEXT DEFAULT (datetime('now', 'localtime'))")
                log.info("Migration: added %s.created_at", table)
            if 'updated_at' not in cols:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN updated_at TEXT")
                log.info("Migration: added %s.updated_at", table)
        except Exception:
            import traceback
            log.error("Timestamp migration for %s failed:\n%s", table, traceback.format_exc())

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
