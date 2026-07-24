import os
import sqlite3
from flask import g

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'cv.db')

PROFILE_SCHEMA = '''
CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT,
    title TEXT,
    summary TEXT,
    profile_photo TEXT,
    email TEXT,
    phone TEXT,
    city TEXT,
    address TEXT,
    github TEXT,
    linkedin TEXT,
    website TEXT,
    instagram TEXT,
    x TEXT,
    youtube TEXT,
    last_updated TEXT
);
'''

EDUCATION_SCHEMA = '''
CREATE TABLE IF NOT EXISTS education (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school TEXT NOT NULL,
    department TEXT,
    level TEXT,
    start_date TEXT,
    end_date TEXT,
    ongoing INTEGER DEFAULT 0,
    gpa TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0
);
'''

COURSES_SCHEMA = '''
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    organization TEXT,
    start_date TEXT,
    end_date TEXT,
    certificate INTEGER DEFAULT 0,
    certificate_link TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0
);
'''

CERTIFICATES_SCHEMA = '''
CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    organization TEXT,
    date TEXT,
    image TEXT,
    pdf TEXT,
    description TEXT,
    order_index INTEGER DEFAULT 0
);
'''

EXPERIENCES_SCHEMA = '''
CREATE TABLE IF NOT EXISTS experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    position TEXT,
    start_date TEXT,
    end_date TEXT,
    ongoing INTEGER DEFAULT 0,
    description TEXT,
    order_index INTEGER DEFAULT 0
);
'''

PROJECTS_SCHEMA = '''
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    technologies TEXT,
    github_link TEXT,
    demo_link TEXT,
    image TEXT,
    order_index INTEGER DEFAULT 0
);
'''

SKILLS_SCHEMA = '''
CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    level TEXT,
    order_index INTEGER DEFAULT 0
);
'''

LANGUAGES_SCHEMA = '''
CREATE TABLE IF NOT EXISTS languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    level TEXT,
    order_index INTEGER DEFAULT 0
);
'''

SCHEMA_SQL = (
    PROFILE_SCHEMA
    + EDUCATION_SCHEMA
    + COURSES_SCHEMA
    + CERTIFICATES_SCHEMA
    + EXPERIENCES_SCHEMA
    + PROJECTS_SCHEMA
    + SKILLS_SCHEMA
    + LANGUAGES_SCHEMA
)


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
               github, linkedin, website, instagram, x, youtube, last_updated
             ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))''',
            ('', '', '', '', '', '', '', '', '', '', '', '', '', '', '')
        )
    conn.commit()
    conn.close()


def get_db():
    if 'db' not in g:
        ensure_database()
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()
