from flask import Blueprint, jsonify, request, session
from routes.auth_routes import login_required
from services.blog_service import (
    create_blog_post, update_blog_post, delete_blog_post,
    get_all_blog_posts, get_published_blog_posts,
    get_blog_post_by_id, get_blog_post_by_slug,
    publish_blog_post, unpublish_blog_post
)
from services.db import get_db

blog_bp = Blueprint('blog_bp', __name__)

# ==================================================
# PUBLIC API
# ==================================================

@blog_bp.route('/blog', methods=['GET'])
def public_get_blogs():
    """Tüm yayınlanmış (published) blog yazılarını getirir."""
    try:
        blogs = get_published_blog_posts()
        return jsonify(blogs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@blog_bp.route('/blog/<slug>', methods=['GET'])
def public_get_blog_by_slug(slug):
    """Belirli bir yayınlanmış blog yazısını getirir."""
    try:
        blog = get_blog_post_by_slug(slug)
        if not blog:
            return jsonify({"error": "Blog yazısı bulunamadı."}), 404
            
        if blog['status'] != 'published':
            # Draft yazılar public API'de KESİNLİKLE görünmemeli.
            return jsonify({"error": "Blog yazısı bulunamadı."}), 404
            
        return jsonify(blog), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================================================
# BLOG POST LIKES (AŞAMA 5)
# ==================================================

@blog_bp.route('/blog/<slug>/likes', methods=['GET'])
def get_blog_likes(slug):
    blog = get_blog_post_by_slug(slug)
    if not blog or blog['status'] != 'published':
        return jsonify({"error": "Blog yazısı bulunamadı."}), 404
        
    db = get_db()
    cursor = db.cursor()
    
    count_row = cursor.execute('SELECT COUNT(*) as count FROM blog_post_likes WHERE blog_post_id = ?', (blog['id'],)).fetchone()
    count = count_row['count'] if count_row else 0
    
    visitor = session.get('visitor')
    google_user_id = visitor.get('google_user_id') if visitor else None
    
    liked = False
    if google_user_id:
        liked_row = cursor.execute('SELECT id FROM blog_post_likes WHERE blog_post_id = ? AND google_user_id = ?', (blog['id'], google_user_id)).fetchone()
        liked = bool(liked_row)
        
    return jsonify({"count": count, "liked": liked}), 200

@blog_bp.route('/blog/<slug>/likes', methods=['POST'])
def like_blog(slug):
    visitor = session.get('visitor')
    if not visitor:
        return jsonify({"error": "Beğenmek için giriş yapmalısınız."}), 401
        
    google_user_id = visitor['google_user_id']
    
    blog = get_blog_post_by_slug(slug)
    if not blog or blog['status'] != 'published':
        return jsonify({"error": "Blog yazısı bulunamadı."}), 404
        
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute('INSERT OR IGNORE INTO blog_post_likes (blog_post_id, google_user_id) VALUES (?, ?)', (blog['id'], google_user_id))
        db.commit()
        
        count_row = cursor.execute('SELECT COUNT(*) as count FROM blog_post_likes WHERE blog_post_id = ?', (blog['id'],)).fetchone()
        count = count_row['count'] if count_row else 0
        
        return jsonify({"success": True, "count": count, "liked": True}), 200
    except Exception as e:
        return jsonify({"error": "Beğeni kaydedilemedi."}), 500

@blog_bp.route('/blog/<slug>/likes', methods=['DELETE'])
def unlike_blog(slug):
    visitor = session.get('visitor')
    if not visitor:
        return jsonify({"error": "Beğeniyi kaldırmak için giriş yapmalısınız."}), 401
        
    google_user_id = visitor['google_user_id']
    
    blog = get_blog_post_by_slug(slug)
    if not blog or blog['status'] != 'published':
        return jsonify({"error": "Blog yazısı bulunamadı."}), 404
        
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute('DELETE FROM blog_post_likes WHERE blog_post_id = ? AND google_user_id = ?', (blog['id'], google_user_id))
        db.commit()
        
        count_row = cursor.execute('SELECT COUNT(*) as count FROM blog_post_likes WHERE blog_post_id = ?', (blog['id'],)).fetchone()
        count = count_row['count'] if count_row else 0
        
        return jsonify({"success": True, "count": count, "liked": False}), 200
    except Exception as e:
        return jsonify({"error": "Beğeni kaldırılamadı."}), 500


# ==================================================
# ADMIN API
# ==================================================

@blog_bp.route('/admin/blog', methods=['GET'])
@login_required
def admin_get_all_blogs():
    """Tüm blog yazılarını (draft ve published) getirir."""
    try:
        blogs = get_all_blog_posts()
        return jsonify(blogs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@blog_bp.route('/admin/blog/<int:post_id>', methods=['GET'])
@login_required
def admin_get_blog(post_id):
    try:
        blog = get_blog_post_by_id(post_id)
        if not blog:
            return jsonify({"error": "Kayıt bulunamadı."}), 404
        return jsonify(blog), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@blog_bp.route('/admin/blog', methods=['POST'])
@login_required
def admin_create_blog():
    data = request.get_json() or {}
    try:
        post_id = create_blog_post(data)
        return jsonify({"message": "Blog yazısı başarıyla oluşturuldu.", "id": post_id}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": "Sunucu hatası: " + str(e)}), 500

@blog_bp.route('/admin/blog/<int:post_id>', methods=['PUT'])
@login_required
def admin_update_blog(post_id):
    data = request.get_json() or {}
    try:
        update_blog_post(post_id, data)
        return jsonify({"message": "Blog yazısı başarıyla güncellendi."}), 200
    except ValueError as ve:
        if str(ve) == "Blog post bulunamadı.":
            return jsonify({"error": str(ve)}), 404
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": "Sunucu hatası: " + str(e)}), 500

@blog_bp.route('/admin/blog/<int:post_id>', methods=['DELETE'])
@login_required
def admin_delete_blog(post_id):
    try:
        delete_blog_post(post_id)
        return jsonify({"message": "Blog yazısı başarıyla silindi."}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": "Sunucu hatası: " + str(e)}), 500

@blog_bp.route('/admin/blog/<int:post_id>/publish', methods=['PATCH'])
@login_required
def admin_publish_blog(post_id):
    try:
        publish_blog_post(post_id)
        return jsonify({"message": "Blog yazısı başarıyla yayınlandı."}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": "Sunucu hatası: " + str(e)}), 500

@blog_bp.route('/admin/blog/<int:post_id>/unpublish', methods=['PATCH'])
@login_required
def admin_unpublish_blog(post_id):
    try:
        unpublish_blog_post(post_id)
        return jsonify({"message": "Blog yazısı başarıyla yayından kaldırıldı (draft yapıldı)."}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": "Sunucu hatası: " + str(e)}), 500
