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

