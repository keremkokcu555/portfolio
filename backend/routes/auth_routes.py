from flask import Blueprint, request, jsonify, session
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from services.db import get_db
from functools import wraps

auth_bp = Blueprint('auth', __name__)
ph = PasswordHasher()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return jsonify({'error': 'Yetkisiz erişim. Lütfen giriş yapın.'}), 401
        return f(*args, **kwargs)
    return decorated_function


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Kullanıcı adı ve şifre gereklidir.'}), 400

    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT password_hash FROM admins WHERE username = ?', (username,))
    row = cursor.fetchone()

    if row:
        password_hash = row['password_hash']
        
        if password_hash.startswith('scrypt:'):
            from werkzeug.security import check_password_hash
            if check_password_hash(password_hash, password):
                new_hash = ph.hash(password)
                cursor.execute('UPDATE admins SET password_hash = ? WHERE username = ?', (new_hash, username))
                db.commit()
                session['admin_logged_in'] = True
                return jsonify({'success': True, 'message': 'Giriş başarılı'}), 200
        else:
            try:
                ph.verify(password_hash, password)
                if ph.check_needs_rehash(password_hash):
                    new_hash = ph.hash(password)
                    cursor.execute('UPDATE admins SET password_hash = ? WHERE username = ?', (new_hash, username))
                    db.commit()
                session['admin_logged_in'] = True
                return jsonify({'success': True, 'message': 'Giriş başarılı'}), 200
            except VerifyMismatchError:
                pass
    
    return jsonify({'error': 'Geçersiz kullanıcı adı veya şifre'}), 401


@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('admin_logged_in', None)
    return jsonify({'success': True, 'message': 'Çıkış yapıldı'}), 200


@auth_bp.route('/api/auth/status', methods=['GET'])
def status():
    is_logged_in = session.get('admin_logged_in') == True
    return jsonify({'logged_in': is_logged_in}), 200

from services.google_auth import verify_google_token

@auth_bp.route('/api/auth/visitor/login', methods=['POST'])
def visitor_login():
    data = request.get_json() or {}
    token = data.get('credential')
    if not token:
        return jsonify({'error': 'Token eksik'}), 400

    is_valid, user_info = verify_google_token(token)
    if not is_valid:
        return jsonify({'error': user_info}), 401

    session['visitor'] = user_info
    return jsonify({'success': True, 'message': 'Ziyaretçi girişi başarılı', 'user': user_info}), 200

@auth_bp.route('/api/auth/visitor/logout', methods=['POST'])
def visitor_logout():
    session.pop('visitor', None)
    return jsonify({'success': True, 'message': 'Çıkış yapıldı'}), 200

@auth_bp.route('/api/auth/visitor/status', methods=['GET'])
def visitor_status():
    visitor = session.get('visitor')
    if visitor:
        return jsonify({'logged_in': True, 'user': visitor}), 200
    return jsonify({'logged_in': False}), 200
