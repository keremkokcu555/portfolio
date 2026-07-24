PROFILE_FIELDS = [
    'name', 'title', 'summary', 'profile_photo',
    'email', 'phone', 'city', 'address',
    'github', 'linkedin', 'website', 'instagram', 'x', 'youtube', 'cv_pdf'
]

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
    cv_pdf TEXT,
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
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT,
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
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT,
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
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT,
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
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT,
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
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT,
    order_index INTEGER DEFAULT 0
);
'''

SKILLS_SCHEMA = '''
CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    level TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT,
    order_index INTEGER DEFAULT 0
);
'''

LANGUAGES_SCHEMA = '''
CREATE TABLE IF NOT EXISTS languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    level TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT,
    order_index INTEGER DEFAULT 0
);
'''

ADMINS_SCHEMA = '''
CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
'''

MESSAGES_SCHEMA = '''
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
'''

VISITOR_ANALYTICS_SCHEMA = '''
CREATE TABLE IF NOT EXISTS visitor_analytics (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_hash TEXT NOT NULL,
    visited_at   TEXT NOT NULL,
    path         TEXT DEFAULT '/',
    device_type  TEXT,
    browser      TEXT,
    os           TEXT,
    referrer     TEXT
);
CREATE INDEX IF NOT EXISTS idx_analytics_visited_at   ON visitor_analytics(visited_at);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor_hash ON visitor_analytics(visitor_hash);
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
    + ADMINS_SCHEMA
    + MESSAGES_SCHEMA
    + VISITOR_ANALYTICS_SCHEMA
)

REQUIRED_FIELDS = {
    'education': ['school'],
    'courses': ['title'],
    'certificates': ['name'],
    'experiences': ['company'],
    'projects': ['title'],
    'skills': ['name'],
    'languages': ['name'],
}
