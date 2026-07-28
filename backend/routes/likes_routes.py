from flask import Blueprint, jsonify, request, session
from services.db import get_db
from routes.auth_routes import login_required
from services.google_auth import verify_google_token

likes_bp = Blueprint('likes', __name__)

# Bu ID daha sonra user tarafından doldurulacak
GOOGLE_CLIENT_ID = "492466186850-rg2iqjkh1ij7393vji3gcnmq1c9bfaea.apps.googleusercontent.com"

@likes_bp.route('/api/like-portfolio', methods=['POST'])
def like_portfolio():
    try:
        data = request.get_json() or {}
        token = data.get('credential')
        if not token:
            visitor = session.get('visitor')
            if not visitor:
                return jsonify({'error': 'Yetkisiz erişim, token veya oturum yok'}), 401
            email = visitor.get('email')
            name = visitor.get('display_name')
            picture = visitor.get('profile_image')
        else:
            is_valid, user_info = verify_google_token(token)
            if not is_valid:
                return jsonify({'error': user_info}), 401
                
            email = user_info.get('email')
            name = user_info.get('display_name')
            picture = user_info.get('profile_image')
            session['visitor'] = user_info

        if not email:
            return jsonify({'error': 'Email bilgisi alınamadı'}), 400

        db = get_db()
        existing = db.execute("SELECT id FROM portfolio_likes WHERE email = ?", (email,)).fetchone()
        
        if existing:
            return jsonify({'message': 'Daha önce beğenmişsiniz, teşekkürler!'}), 200
            
        db.execute(
            "INSERT INTO portfolio_likes (email, name, profile_pic) VALUES (?, ?, ?)",
            (email, name, picture)
        )
        db.commit()
        return jsonify({'message': 'Beğeniniz kaydedildi!'}), 201

    except Exception as e:
        return jsonify({'error': 'Sunucu hatası'}), 500


@likes_bp.route('/api/portfolio-likes', methods=['GET'])
@login_required
def get_portfolio_likes():
    try:
        db = get_db()
        rows = db.execute("SELECT id, email, name, profile_pic, liked_at FROM portfolio_likes ORDER BY id DESC").fetchall()
        likes = [dict(row) for row in rows]
        return jsonify(likes), 200
    except Exception as e:
        return jsonify({'error': 'Veri alınamadı'}), 500
