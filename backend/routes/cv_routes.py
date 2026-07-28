import os
import uuid
from functools import wraps
from werkzeug.utils import secure_filename
from flask import Blueprint, jsonify, request, session
from services.cv_service import (
    get_profile as get_profile_service,
    update_profile as update_profile_service,
    list_items as list_items_service,
    create_item as create_item_service,
    update_item as update_item_service,
    delete_item as delete_item_service,
    get_counts as get_counts_service,
)

cv_bp = Blueprint('cv', __name__)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

@cv_bp.route('/api/profile', methods=['GET'])
def profile_get():
    return jsonify(get_profile_service())

@cv_bp.route('/api/profile', methods=['PUT'])
@admin_required
def profile_put():
    payload = request.get_json() or {}
    return jsonify(update_profile_service(payload))

def register_crud(route_name, table_name):
    def list_route(table_name=table_name):
        return jsonify(list_items_service(table_name))

    @admin_required
    def create_route(table_name=table_name):
        payload = request.get_json() or {}
        try:
            result = create_item_service(table_name, payload)
            return jsonify(result), 201
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400

    @admin_required
    def update_route(item_id, table_name=table_name):
        payload = request.get_json() or {}
        try:
            return jsonify(update_item_service(table_name, item_id, payload))
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400

    @admin_required
    def delete_route(item_id, table_name=table_name):
        return jsonify(delete_item_service(table_name, item_id))

    cv_bp.add_url_rule(f'/api/{route_name}', endpoint=f'list_{route_name}', view_func=list_route, methods=['GET'])
    cv_bp.add_url_rule(f'/api/{route_name}', endpoint=f'create_{route_name}', view_func=create_route, methods=['POST'])
    cv_bp.add_url_rule(f'/api/{route_name}/<int:item_id>', endpoint=f'update_{route_name}', view_func=update_route, methods=['PUT'])
    cv_bp.add_url_rule(f'/api/{route_name}/<int:item_id>', endpoint=f'delete_{route_name}', view_func=delete_route, methods=['DELETE'])

register_crud('education', 'education')
register_crud('courses', 'courses')
register_crud('certificates', 'certificates')
register_crud('experiences', 'experiences')
register_crud('projects', 'projects')
register_crud('skills', 'skills')
register_crud('languages', 'languages')

@cv_bp.route('/api/counts', methods=['GET'])
def counts_get():
    return jsonify(get_counts_service())

UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'static', 'uploads'))
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'pdf'}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_PDF_SIZE = 10 * 1024 * 1024   # 10 MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@cv_bp.route('/api/upload', methods=['POST'])
@admin_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    upload_type = request.form.get('type', 'misc')
    valid_types = ['profile', 'projects', 'certificates', 'cv', 'misc']
    if upload_type not in valid_types:
        upload_type = 'misc'

    if file and allowed_file(file.filename):
        ext = file.filename.rsplit('.', 1)[1].lower()
        
        # Check size and content
        file.seek(0, os.SEEK_END)
        file_length = file.tell()
        file.seek(0)
        
        if ext == 'pdf':
            if file_length > MAX_PDF_SIZE:
                return jsonify({'error': 'PDF size exceeds 10MB limit'}), 400
            header = file.read(5)
            file.seek(0)
            if not header.startswith(b'%PDF-'):
                return jsonify({'error': 'Invalid PDF file content'}), 400
        else:
            if file_length > MAX_IMAGE_SIZE:
                return jsonify({'error': 'Image size exceeds 5MB limit'}), 400
            try:
                from PIL import Image
                img = Image.open(file)
                img.verify()
                file.seek(0)
            except Exception as e:
                return jsonify({'error': 'Invalid image file'}), 400
        
        type_folder = os.path.join(UPLOAD_FOLDER, upload_type)
        if not os.path.exists(type_folder):
            os.makedirs(type_folder, exist_ok=True)
            
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(type_folder, unique_filename)
        file.save(filepath)
        
        return jsonify({'url': f'/static/uploads/{upload_type}/{unique_filename}'}), 201
        
    return jsonify({'error': 'Invalid file type'}), 400


# ── Genel Dosya Silme Endpoint'i ─────────────────────────────────
# DELETE /api/file  body: { "table": "...", "id": ..., "field": "..." }
# profile tablosu için id göndermeye gerek yok (her zaman id=1).
# Desteklenen tablo/alan kombinasyonları:
#   profile       → profile_photo, cv_pdf
#   certificates  → image, pdf
#   projects      → image
#   courses       → certificate_link

ALLOWED_FILE_FIELDS = {
    'profile':      {'profile_photo': '/static/uploads/profile/',
                     'cv_pdf':        '/static/uploads/cv/'},
    'certificates': {'image': '/static/uploads/certificates/',
                     'pdf':   '/static/uploads/certificates/'},
    'projects':     {'image': '/static/uploads/projects/'},
    'courses':      {'certificate_link': '/static/uploads/certificates/'},
    'blog_posts':   {'cover_image': '/static/uploads/blog/'},
}

@cv_bp.route('/api/file', methods=['DELETE'])
@admin_required
def delete_file():
    try:
        from services.db import get_db
        data = request.get_json() or {}
        table = data.get('table', '').strip()
        field = data.get('field', '').strip()
        item_id = data.get('id')

        # Whitelist kontrolü
        if table not in ALLOWED_FILE_FIELDS:
            return jsonify({'error': 'Geçersiz tablo'}), 400
        if field not in ALLOWED_FILE_FIELDS[table]:
            return jsonify({'error': 'Geçersiz alan'}), 400

        allowed_prefix = ALLOWED_FILE_FIELDS[table][field]
        db = get_db()

        # Kaydı çek
        if table == 'profile':
            row = db.execute(f'SELECT {field} FROM profile WHERE id = 1').fetchone()
        else:
            if not item_id:
                return jsonify({'error': 'id zorunludur'}), 400
            row = db.execute(f'SELECT {field} FROM {table} WHERE id = ?', (item_id,)).fetchone()

        if not row or not row[field]:
            return jsonify({'error': 'Dosya bulunamadı'}), 404

        old_path = row[field]

        # Güvenlik: sadece beklenen upload alt klasörüne ait dosyaları sil
        if not old_path.startswith(allowed_prefix):
            return jsonify({'error': 'Geçersiz dosya yolu'}), 400

        # DB alanını temizle
        if table == 'profile':
            db.execute(f"UPDATE profile SET {field} = '', last_updated = datetime('now', 'localtime') WHERE id = 1")
        else:
            db.execute(f"UPDATE {table} SET {field} = NULL WHERE id = ?", (item_id,))
        db.commit()

        # Fiziksel dosyayı sil (DB'den kaldırıldıktan sonra — tutarlılık garantili)
        filename = old_path.split('/static/uploads/')[-1]
        if '..' not in filename and not filename.startswith('/') and not filename.startswith('\\'):
            full_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(full_path):
                try:
                    os.remove(full_path)
                except Exception:
                    pass  # Dosya silinemese de DB zaten temizlendi

        return jsonify({'success': True})

    except Exception:
        return jsonify({'error': 'Silme işlemi sırasında hata oluştu'}), 500


# Geriye dönük uyumluluk: eski /api/profile/photo endpoint'ini yeni genel endpoint'e yönlendir
@cv_bp.route('/api/profile/photo', methods=['DELETE'])
@admin_required
def delete_profile_photo():
    from flask import current_app
    with current_app.test_request_context():
        pass
    # Delegate to general handler via internal logic
    try:
        from services.db import get_db
        db = get_db()
        row = db.execute('SELECT profile_photo FROM profile WHERE id = 1').fetchone()
        if not row or not row['profile_photo']:
            return jsonify({'error': 'Profil fotoğrafı bulunamadı'}), 404
        old_path = row['profile_photo']
        if not old_path.startswith('/static/uploads/profile/'):
            return jsonify({'error': 'Geçersiz dosya yolu'}), 400
        db.execute("UPDATE profile SET profile_photo = '', last_updated = datetime('now', 'localtime') WHERE id = 1")
        db.commit()
        filename = old_path.split('/static/uploads/')[-1]
        if '..' not in filename and not filename.startswith('/') and not filename.startswith('\\'):
            full_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(full_path):
                try:
                    os.remove(full_path)
                except Exception:
                    pass
        return jsonify({'success': True})
    except Exception:
        return jsonify({'error': 'Silme işlemi sırasında hata oluştu'}), 500
