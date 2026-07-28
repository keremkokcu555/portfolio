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
    referrer     TEXT,
    ip_address   TEXT
);
CREATE INDEX IF NOT EXISTS idx_analytics_visited_at   ON visitor_analytics(visited_at);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor_hash ON visitor_analytics(visitor_hash);
'''

PORTFOLIO_LIKES_SCHEMA = '''
CREATE TABLE IF NOT EXISTS portfolio_likes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT UNIQUE NOT NULL,
    name        TEXT,
    profile_pic TEXT,
    liked_at    TEXT DEFAULT (datetime('now', 'localtime'))
);
'''

BLOG_POSTS_SCHEMA = '''
CREATE TABLE IF NOT EXISTS blog_posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    tags        TEXT,
    likes       INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now', 'localtime'))
);
'''

BLOG_COMMENTS_SCHEMA = '''
CREATE TABLE IF NOT EXISTS blog_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_post_id INTEGER NOT NULL,
    google_user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    profile_image TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'published',
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT,
    FOREIGN KEY (blog_post_id) REFERENCES blog_posts (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comments_blog_id ON blog_comments(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON blog_comments(status);
'''

BLOG_POST_LIKES_SCHEMA = '''
CREATE TABLE IF NOT EXISTS blog_post_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_post_id INTEGER NOT NULL,
    google_user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(blog_post_id, google_user_id),
    FOREIGN KEY (blog_post_id) REFERENCES blog_posts (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_post_likes_blog_id ON blog_post_likes(blog_post_id);
'''

BLOG_COMMENT_LIKES_SCHEMA = '''
CREATE TABLE IF NOT EXISTS blog_comment_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    google_user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    UNIQUE(comment_id, google_user_id),
    FOREIGN KEY (comment_id) REFERENCES blog_comments (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON blog_comment_likes(comment_id);
'''

BLOG_VIEWS_SCHEMA = '''
CREATE TABLE IF NOT EXISTS blog_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_post_id INTEGER NOT NULL,
    visitor_hash TEXT NOT NULL,
    viewed_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (blog_post_id) REFERENCES blog_posts (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_blog_views_post_id ON blog_views(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_views_dedup ON blog_views(blog_post_id, visitor_hash, viewed_at);
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
    + PORTFOLIO_LIKES_SCHEMA
    + BLOG_POSTS_SCHEMA
    + BLOG_COMMENTS_SCHEMA
    + BLOG_POST_LIKES_SCHEMA
    + BLOG_COMMENT_LIKES_SCHEMA
    + BLOG_VIEWS_SCHEMA
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
