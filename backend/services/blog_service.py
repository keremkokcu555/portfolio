import os
import sqlite3
import re
import unicodedata
import datetime
from services.db import get_db

def safe_delete_blog_image(filepath):
    """Güvenli bir şekilde eski blog kapağını siler. Hata olursa yutar."""
    if not filepath or not isinstance(filepath, str):
        return
    if not filepath.startswith('/static/uploads/blog/'):
        return
        
    filename = filepath.split('/')[-1]
    if '..' in filename or not filename:
        return
        
    try:
        base_dir = os.path.abspath(os.path.dirname(__file__))
        upload_folder = os.path.abspath(os.path.join(base_dir, '..', '..', 'frontend', 'static', 'uploads', 'blog'))
        full_path = os.path.join(upload_folder, filename)
        
        if os.path.exists(full_path):
            os.remove(full_path)
    except Exception as e:
        print(f"Orphan file deletion failed for {filepath}: {e}")
        pass

def generate_slug(title, current_slug=None):
    """
    Türkçe karakterleri dönüştürerek benzersiz bir slug üretir.
    current_slug varsa ve aynı title için çağrıldıysa mevcut slug'ı korumak için kontrol yapılabilir,
    ancak bu fonksiyon sadece benzersizliği sağlar.
    """
    text = title.lower()
    replacements = {
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
        'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
        
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    base_slug = re.sub(r'[\s-]+', '-', text).strip('-')
    
    if not base_slug:
        base_slug = "blog-post"

    db = get_db()
    cursor = db.cursor()
    
    slug = base_slug
    counter = 2
    
    while True:
        # Check if slug exists
        # Ignore current_slug if we are updating an existing post
        if current_slug and slug == current_slug:
            break
            
        cursor.execute("SELECT id FROM blog_posts WHERE slug = ?", (slug,))
        if not cursor.fetchone():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
        
    return slug


def validate_blog_data(data):
    """
    Gelen blog verilerini doğrular. Hata varsa (is_valid, error_message) döner.
    """
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    summary = data.get('summary', '').strip()
    tags = data.get('tags', '').strip()
    status = data.get('status', 'draft').strip()

    if not title:
        return False, "Başlık (title) boş olamaz."
    if not content:
        return False, "İçerik (content) boş olamaz."
        
    if len(title) > 200:
        return False, "Başlık 200 karakterden uzun olamaz."
    if len(summary) > 500:
        return False, "Özet 500 karakterden uzun olamaz."
    if len(tags) > 200:
        return False, "Etiketler 200 karakterden uzun olamaz."
        
    if status not in ['draft', 'published']:
        return False, "Geçersiz durum (status). Yalnızca 'draft' veya 'published' olabilir."
        
    return True, ""


def create_blog_post(data):
    is_valid, error = validate_blog_data(data)
    if not is_valid:
        raise ValueError(error)

    title = data.get('title').strip()
    content = data.get('content').strip()
    summary = data.get('summary', '').strip()
    tags = data.get('tags', '').strip()
    cover_image = data.get('cover_image', '').strip()
    status = data.get('status', 'draft').strip()
    
    slug = generate_slug(title)
    
    published_at = None
    if status == 'published':
        published_at = datetime.datetime.now().isoformat()
        
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        INSERT INTO blog_posts (title, slug, summary, content, cover_image, tags, status, published_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (title, slug, summary, content, cover_image, tags, status, published_at))
    db.commit()
    return cursor.lastrowid


def update_blog_post(post_id, data):
    is_valid, error = validate_blog_data(data)
    if not is_valid:
        raise ValueError(error)

    db = get_db()
    cursor = db.cursor()
    
    # Mevcut kaydı al
    cursor.execute("SELECT slug, status FROM blog_posts WHERE id = ?", (post_id,))
    row = cursor.fetchone()
    if not row:
        raise ValueError("Blog post bulunamadı.")
        
    current_slug = row['slug']
    current_status = row['status']
    
    title = data.get('title').strip()
    content = data.get('content').strip()
    summary = data.get('summary', '').strip()
    tags = data.get('tags', '').strip()
    cover_image = data.get('cover_image', '').strip()
    status = data.get('status', 'draft').strip()
    
    new_slug = generate_slug(title, current_slug=current_slug)
    
    published_at = None
    if status == 'published' and current_status != 'published':
        published_at = datetime.datetime.now().isoformat()
        cursor.execute('''
            UPDATE blog_posts 
            SET title=?, slug=?, summary=?, content=?, cover_image=?, tags=?, status=?, updated_at=CURRENT_TIMESTAMP, published_at=?
            WHERE id=?
        ''', (title, new_slug, summary, content, cover_image, tags, status, published_at, post_id))
    else:
        cursor.execute('''
            UPDATE blog_posts 
            SET title=?, slug=?, summary=?, content=?, cover_image=?, tags=?, status=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?
        ''', (title, new_slug, summary, content, cover_image, tags, status, post_id))
        
    db.commit()

    # Eğer DB güncellendiyse ve eski görsel değişmişse, eskisini sil
    current_cover = row['cover_image'] if 'cover_image' in row.keys() else None
    if current_cover and current_cover != cover_image:
        safe_delete_blog_image(current_cover)


def delete_blog_post(post_id):
    db = get_db()
    cursor = db.cursor()
    
    # Kapağı almak için
    cursor.execute("SELECT cover_image FROM blog_posts WHERE id = ?", (post_id,))
    row = cursor.fetchone()
    
    # Güvenli cleanup (Cascade silme)
    cursor.execute("DELETE FROM blog_post_likes WHERE blog_post_id = ?", (post_id,))
    cursor.execute("DELETE FROM blog_comments WHERE blog_post_id = ?", (post_id,))
    cursor.execute("DELETE FROM blog_views WHERE blog_post_id = ?", (post_id,))
    cursor.execute("DELETE FROM blog_posts WHERE id = ?", (post_id,))
    if cursor.rowcount == 0:
        raise ValueError("Blog post bulunamadı.")
    db.commit()
    
    # Başarılı silme sonrası resmi temizle
    if row and 'cover_image' in row.keys() and row['cover_image']:
        safe_delete_blog_image(row['cover_image'])


def get_all_blog_posts():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        SELECT *, 
               (SELECT COUNT(*) FROM blog_post_likes WHERE blog_post_id = blog_posts.id) as like_count,
               (SELECT COUNT(*) FROM blog_views WHERE blog_post_id = blog_posts.id) as view_count
        FROM blog_posts 
        ORDER BY created_at DESC
    ''')
    return [dict(row) for row in cursor.fetchall()]


def get_published_blog_posts():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        SELECT id, title, slug, summary, cover_image, tags, published_at,
               (SELECT COUNT(*) FROM blog_post_likes WHERE blog_post_id = blog_posts.id) as like_count,
               (SELECT COUNT(*) FROM blog_views WHERE blog_post_id = blog_posts.id) as view_count
        FROM blog_posts 
        WHERE status = 'published' 
        ORDER BY published_at DESC
    ''')
    return [dict(row) for row in cursor.fetchall()]


def get_blog_post_by_id(post_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        SELECT *,
               (SELECT COUNT(*) FROM blog_post_likes WHERE blog_post_id = blog_posts.id) as like_count,
               (SELECT COUNT(*) FROM blog_views WHERE blog_post_id = blog_posts.id) as view_count
        FROM blog_posts 
        WHERE id = ?
    ''', (post_id,))
    row = cursor.fetchone()
    if row:
        return dict(row)
    return None


def get_blog_post_by_slug(slug):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        SELECT *,
               (SELECT COUNT(*) FROM blog_post_likes WHERE blog_post_id = blog_posts.id) as like_count,
               (SELECT COUNT(*) FROM blog_views WHERE blog_post_id = blog_posts.id) as view_count
        FROM blog_posts 
        WHERE slug = ?
    ''', (slug,))
    row = cursor.fetchone()
    if row:
        return dict(row)
    return None


def publish_blog_post(post_id):
    db = get_db()
    cursor = db.cursor()
    published_at = datetime.datetime.now().isoformat()
    cursor.execute('''
        UPDATE blog_posts 
        SET status = 'published', published_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status != 'published'
    ''', (published_at, post_id))
    db.commit()
    if cursor.rowcount == 0:
         cursor.execute("SELECT id FROM blog_posts WHERE id = ?", (post_id,))
         if not cursor.fetchone():
             raise ValueError("Blog post bulunamadı.")


def unpublish_blog_post(post_id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute('''
        UPDATE blog_posts 
        SET status = 'draft', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND status != 'draft'
    ''', (post_id,))
    db.commit()
    if cursor.rowcount == 0:
         cursor.execute("SELECT id FROM blog_posts WHERE id = ?", (post_id,))
         if not cursor.fetchone():
             raise ValueError("Blog post bulunamadı.")
