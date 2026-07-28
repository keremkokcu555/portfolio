from flask import Blueprint, request, jsonify, session
from services.comment_service import (
    create_comment, get_public_comments, get_all_comments_for_admin,
    update_comment_status, delete_comment
)
from services.blog_service import get_blog_post_by_slug
from routes.auth_routes import login_required

comment_bp = Blueprint('comments', __name__)

from services.db import get_db

@comment_bp.route('/blog/<slug>/comments', methods=['GET'])
def get_comments(slug):
    blog = get_blog_post_by_slug(slug)
    if not blog or blog['status'] != 'published':
        return jsonify({'error': 'Blog yazısı bulunamadı'}), 404
        
    visitor = session.get('visitor')
    google_user_id = visitor.get('google_user_id') if visitor else None
    
    comments = get_public_comments(blog['id'], google_user_id)
    return jsonify(comments), 200

@comment_bp.route('/blog/<slug>/comments', methods=['POST'])
def post_comment(slug):
    visitor = session.get('visitor')
    if not visitor:
        return jsonify({'error': 'Yorum yapmak için giriş yapmalısınız.'}), 401
        
    blog = get_blog_post_by_slug(slug)
    if not blog or blog['status'] != 'published':
        return jsonify({'error': 'Blog yazısı bulunamadı veya yoruma kapalı'}), 404
        
    data = request.get_json() or {}
    content = data.get('content')
    
    success, message = create_comment(
        blog['id'], 
        visitor['google_user_id'], 
        visitor['display_name'], 
        visitor['profile_image'], 
        content
    )
    
    if success:
        return jsonify({'success': True, 'message': message}), 201
    else:
        status_code = 429 if "Çok fazla" in message else 400
        return jsonify({'error': message}), status_code

@comment_bp.route('/admin/blog/comments', methods=['GET'])
@login_required
def admin_get_comments():
    comments = get_all_comments_for_admin()
    return jsonify(comments), 200

@comment_bp.route('/admin/blog/comments/<int:comment_id>/hide', methods=['PATCH'])
@login_required
def admin_hide_comment(comment_id):
    if update_comment_status(comment_id, 'hidden'):
        return jsonify({'success': True}), 200
    return jsonify({'error': 'Yorum bulunamadı'}), 404

@comment_bp.route('/admin/blog/comments/<int:comment_id>/publish', methods=['PATCH'])
@login_required
def admin_publish_comment(comment_id):
    if update_comment_status(comment_id, 'published'):
        return jsonify({'success': True}), 200
    return jsonify({'error': 'Yorum bulunamadı'}), 404

@comment_bp.route('/admin/blog/comments/<int:comment_id>', methods=['DELETE'])
@login_required
def admin_delete_comment(comment_id):
    if delete_comment(comment_id):
        return jsonify({'success': True}), 200
    return jsonify({'error': 'Yorum bulunamadı'}), 404

# ==================================================
# COMMENT LIKES (AŞAMA 5)
# ==================================================

@comment_bp.route('/blog/comments/<int:comment_id>/likes', methods=['GET'])
def get_comment_likes(comment_id):
    db = get_db()
    cursor = db.cursor()
    
    # Yorumun varlığını ve yayın durumunu doğrula
    comment = cursor.execute('SELECT id, status FROM blog_comments WHERE id = ?', (comment_id,)).fetchone()
    if not comment or comment['status'] != 'published':
        return jsonify({'error': 'Yorum bulunamadı veya gizli'}), 404
        
    visitor = session.get('visitor')
    google_user_id = visitor.get('google_user_id') if visitor else None
    
    count_row = cursor.execute('SELECT COUNT(*) as count FROM blog_comment_likes WHERE comment_id = ?', (comment_id,)).fetchone()
    count = count_row['count'] if count_row else 0
    
    liked = False
    if google_user_id:
        liked_row = cursor.execute('SELECT id FROM blog_comment_likes WHERE comment_id = ? AND google_user_id = ?', (comment_id, google_user_id)).fetchone()
        liked = bool(liked_row)
        
    return jsonify({'count': count, 'liked': liked}), 200

@comment_bp.route('/blog/comments/<int:comment_id>/likes', methods=['POST'])
def like_comment(comment_id):
    visitor = session.get('visitor')
    if not visitor:
        return jsonify({'error': 'Beğenmek için giriş yapmalısınız.'}), 401
        
    google_user_id = visitor['google_user_id']
    
    db = get_db()
    cursor = db.cursor()
    
    # Yorumun varlığını, yayın durumunu ve ait olduğu blog postun published olup olmadığını doğrula
    comment = cursor.execute('''
        SELECT c.id, c.status, b.status as blog_status 
        FROM blog_comments c
        JOIN blog_posts b ON c.blog_post_id = b.id
        WHERE c.id = ?
    ''', (comment_id,)).fetchone()
    
    if not comment or comment['status'] != 'published' or comment['blog_status'] != 'published':
        return jsonify({'error': 'Yorum bulunamadı veya beğenilemez'}), 404
        
    try:
        cursor.execute('INSERT OR IGNORE INTO blog_comment_likes (comment_id, google_user_id) VALUES (?, ?)', (comment_id, google_user_id))
        db.commit()
        
        # Güncel beğeniyi hesapla
        count_row = cursor.execute('SELECT COUNT(*) as count FROM blog_comment_likes WHERE comment_id = ?', (comment_id,)).fetchone()
        count = count_row['count'] if count_row else 0
        return jsonify({'success': True, 'count': count, 'liked': True}), 200
    except Exception as e:
        return jsonify({'error': 'Beğeni kaydedilemedi.'}), 500

@comment_bp.route('/blog/comments/<int:comment_id>/likes', methods=['DELETE'])
def unlike_comment(comment_id):
    visitor = session.get('visitor')
    if not visitor:
        return jsonify({'error': 'Beğeniyi kaldırmak için giriş yapmalısınız.'}), 401
        
    google_user_id = visitor['google_user_id']
    
    db = get_db()
    cursor = db.cursor()
    
    # Yorumun varlığını kontrol et
    comment = cursor.execute('SELECT id FROM blog_comments WHERE id = ?', (comment_id,)).fetchone()
    if not comment:
        return jsonify({'error': 'Yorum bulunamadı'}), 404
        
    try:
        cursor.execute('DELETE FROM blog_comment_likes WHERE comment_id = ? AND google_user_id = ?', (comment_id, google_user_id))
        db.commit()
        
        count_row = cursor.execute('SELECT COUNT(*) as count FROM blog_comment_likes WHERE comment_id = ?', (comment_id,)).fetchone()
        count = count_row['count'] if count_row else 0
        return jsonify({'success': True, 'count': count, 'liked': False}), 200
    except Exception as e:
        return jsonify({'error': 'Beğeni kaldırılamadı.'}), 500
