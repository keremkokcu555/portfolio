from flask import Blueprint, request, jsonify
import re
from datetime import datetime, timedelta
from routes.auth_routes import login_required
from services.message_service import (
    create_message, get_messages, get_message_by_id,
    mark_message_as_read, delete_message, get_messages_count
)

message_bp = Blueprint('messages', __name__)

# Simple in-memory rate limiter
# Structure: { ip_address: [timestamp1, timestamp2, ...] }
rate_limit_store = {}
RATE_LIMIT_MAX_REQUESTS = 5
RATE_LIMIT_WINDOW_HOURS = 1

def check_rate_limit(ip):
    now = datetime.now()
    cutoff = now - timedelta(hours=RATE_LIMIT_WINDOW_HOURS)
    
    # Clean old requests
    if ip in rate_limit_store:
        rate_limit_store[ip] = [t for t in rate_limit_store[ip] if t > cutoff]
    else:
        rate_limit_store[ip] = []
        
    if len(rate_limit_store[ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return False
        
    rate_limit_store[ip].append(now)
    return True

@message_bp.route('/api/messages', methods=['POST'])
def send_message():
    ip = request.remote_addr
    if not check_rate_limit(ip):
        return jsonify({'error': 'Too many requests. Please try again later.'}), 429

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request data'}), 400

    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    subject = data.get('subject', '').strip()
    message = data.get('message', '').strip()

    if not name or not email or not subject or not message:
        return jsonify({'error': 'Tüm alanlar doldurulmalıdır.'}), 400

    if len(name) > 100:
        return jsonify({'error': 'Ad soyad en fazla 100 karakter olabilir.'}), 400
    if len(email) > 254:
        return jsonify({'error': 'E-posta en fazla 254 karakter olabilir.'}), 400
    if len(subject) > 200:
        return jsonify({'error': 'Konu en fazla 200 karakter olabilir.'}), 400
    if len(message) > 5000:
        return jsonify({'error': 'Mesaj en fazla 5000 karakter olabilir.'}), 400

    email_regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    if not re.match(email_regex, email):
        return jsonify({'error': 'Geçerli bir e-posta adresi giriniz.'}), 400

    create_message(name, email, subject, message)
    return jsonify({'success': True, 'message': 'Mesajınız başarıyla gönderildi.'}), 201

@message_bp.route('/api/messages', methods=['GET'])
@login_required
def get_all_messages():
    messages = get_messages()
    return jsonify(messages)

@message_bp.route('/api/messages/<int:msg_id>', methods=['GET'])
@login_required
def get_message(msg_id):
    msg = get_message_by_id(msg_id)
    if not msg:
        return jsonify({'error': 'Mesaj bulunamadı'}), 404
    return jsonify(msg)

@message_bp.route('/api/messages/<int:msg_id>/read', methods=['PATCH'])
@login_required
def mark_read(msg_id):
    msg = get_message_by_id(msg_id)
    if not msg:
        return jsonify({'error': 'Mesaj bulunamadı'}), 404
    mark_message_as_read(msg_id)
    return jsonify({'success': True})

@message_bp.route('/api/messages/<int:msg_id>', methods=['DELETE'])
@login_required
def delete_msg(msg_id):
    msg = get_message_by_id(msg_id)
    if not msg:
        return jsonify({'error': 'Mesaj bulunamadı'}), 404
    delete_message(msg_id)
    return jsonify({'success': True})

@message_bp.route('/api/messages/counts', methods=['GET'])
@login_required
def message_counts():
    counts = get_messages_count()
    return jsonify(counts)
