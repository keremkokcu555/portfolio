from flask import Blueprint, jsonify, request
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from services.db import get_db
from routes.auth_routes import login_required
import os

likes_bp = Blueprint('likes', __name__)

# Bu ID daha sonra user tarafından doldurulacak
GOOGLE_CLIENT_ID = "492466186850-rg2iqjkh1ij7393vji3gcnmq1c9bfaea.apps.googleusercontent.com"

@likes_bp.route('/api/like-portfolio', methods=['POST'])
def like_portfolio():
    data = request.get_json() or {}
    token = data.get('credential')
    if not token:
        return jsonify({'error': 'Token eksik'}), 400

    try:
        # Token doğrulama
        # GOOGLE_CLIENT_ID gerçek bir ID olana kadar doğrulamayı atlamaması için dikkat edilmeli.
        # Eğer placeholder ise hata fırlatabilir, bu yüzden try-except bloğu önemli.


        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        
        email = idinfo.get('email')
        name = idinfo.get('name')
        picture = idinfo.get('picture')

        if not email:
            return jsonify({'error': 'Email bilgisi alınamadı'}), 400

        db = get_db()
        # Kullanıcı daha önce beğenmiş mi kontrol et
        existing = db.execute("SELECT id FROM portfolio_likes WHERE email = ?", (email,)).fetchone()
        
        if existing:
            return jsonify({'message': 'Daha önce beğenmişsiniz, teşekkürler!'}), 200
            
        # Yeni beğeni kaydet
        db.execute(
            "INSERT INTO portfolio_likes (email, name, profile_pic) VALUES (?, ?, ?)",
            (email, name, picture)
        )
        db.commit()
        return jsonify({'message': 'Beğeniniz kaydedildi!'}), 201

    except ValueError:
        # Geçersiz token
        return jsonify({'error': 'Geçersiz token'}), 401
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
