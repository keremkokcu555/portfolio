from services.db import get_db
import html
from datetime import datetime, timedelta

# Simple in-memory rate limiter for comments
# { "user_id": [timestamp1, timestamp2, ...] }
comment_rate_limit_store = {}
COMMENT_RATE_LIMIT_MAX_REQUESTS = 5
COMMENT_RATE_LIMIT_WINDOW_HOURS = 1

def check_comment_rate_limit(user_id):
    now = datetime.now()
    cutoff = now - timedelta(hours=COMMENT_RATE_LIMIT_WINDOW_HOURS)
    
    # Clean old requests
    if user_id in comment_rate_limit_store:
        comment_rate_limit_store[user_id] = [t for t in comment_rate_limit_store[user_id] if t > cutoff]
    else:
        comment_rate_limit_store[user_id] = []
        
    if len(comment_rate_limit_store[user_id]) >= COMMENT_RATE_LIMIT_MAX_REQUESTS:
        return False
        
    comment_rate_limit_store[user_id].append(now)
    return True

def create_comment(blog_post_id, google_user_id, display_name, profile_image, content):
    if not content or not content.strip():
        return False, "Yorum boş olamaz"
        
    if len(content) > 2000:
        return False, "Yorum 2000 karakterden uzun olamaz"
        
    # Rate limit by user_id
    if not check_comment_rate_limit(google_user_id):
        return False, "Çok fazla yorum gönderdiniz. Lütfen daha sonra tekrar deneyin."

    db = get_db()
    cursor = db.cursor()
    
    # We do not sanitize HTML here, we rely on textContent and autoescape in frontend
    # but stripping whitespace is good.
    content = content.strip()
    
    cursor.execute('''
        INSERT INTO blog_comments (blog_post_id, google_user_id, display_name, profile_image, content, status)
        VALUES (?, ?, ?, ?, ?, 'published')
    ''', (blog_post_id, google_user_id, display_name, profile_image, content))
    
    db.commit()
    return True, "Yorum başarıyla eklendi"

def get_public_comments(blog_post_id, google_user_id=None):
    db = get_db()
    cursor = db.cursor()
    # Sadece published olanları getir. email vs. zaten DB'de yok, google_user_id'yi frontend'e yollamaya gerek yok.
    # N+1 sorgu problemi oluşmaması için subquery'ler kullanılarak tek sorguda veriler çekilir.
    rows = cursor.execute('''
        SELECT id, display_name, profile_image, content, created_at,
               (SELECT COUNT(*) FROM blog_comment_likes WHERE comment_id = blog_comments.id) as like_count,
               (SELECT COUNT(*) FROM blog_comment_likes WHERE comment_id = blog_comments.id AND google_user_id = ?) as liked
        FROM blog_comments 
        WHERE blog_post_id = ? AND status = 'published'
        ORDER BY created_at DESC
    ''', (google_user_id, blog_post_id)).fetchall()
    
    comments = []
    for r in rows:
        d = dict(r)
        d['liked'] = bool(d['liked'])
        comments.append(d)
    return comments

def get_all_comments_for_admin():
    db = get_db()
    cursor = db.cursor()
    rows = cursor.execute('''
        SELECT c.id, c.display_name, c.profile_image, c.content, c.status, c.created_at, 
               b.title as blog_title, b.slug as blog_slug,
               (SELECT COUNT(*) FROM blog_comment_likes WHERE comment_id = c.id) as like_count
        FROM blog_comments c
        JOIN blog_posts b ON c.blog_post_id = b.id
        ORDER BY c.created_at DESC
    ''').fetchall()
    
    return [dict(row) for row in rows]

def update_comment_status(comment_id, status):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('UPDATE blog_comments SET status = ?, updated_at = datetime("now", "localtime") WHERE id = ?', (status, comment_id))
    db.commit()
    return cursor.rowcount > 0

def delete_comment(comment_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('DELETE FROM blog_comment_likes WHERE comment_id = ?', (comment_id,))
    cursor.execute('DELETE FROM blog_comments WHERE id = ?', (comment_id,))
    db.commit()
    return cursor.rowcount > 0
