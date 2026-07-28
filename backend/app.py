import os
import secrets
from dotenv import load_dotenv
from flask import Flask, render_template, session, redirect, request, abort

# Load .env
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(env_path)

from flask_cors import CORS
from services.db import close_db, ensure_database
from routes.cv_routes import cv_bp
from routes.auth_routes import auth_bp
from routes.message_routes import message_bp
from routes.analytics_routes import analytics_bp
from routes.likes_routes import likes_bp
from routes.blog_routes import blog_bp
from routes.comment_routes import comment_bp

app = Flask(__name__, template_folder='../frontend/templates', static_folder='../frontend/static')

# SECRET_KEY Configuration (CRITICAL Fix)
secret_key = os.environ.get('SECRET_KEY')
if not secret_key:
    raise RuntimeError("CRITICAL ERROR: SECRET_KEY environment variable is not set!")
app.secret_key = secret_key

# Environment Configuration
FLASK_ENV = os.environ.get('FLASK_ENV', 'production')
is_development = (FLASK_ENV == 'development')

app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB limit

# Session Security Configuration
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = not is_development  # Secure only in production

CORS(app)

app.register_blueprint(cv_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(message_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(likes_bp)
app.register_blueprint(blog_bp, url_prefix='/api')
app.register_blueprint(comment_bp, url_prefix='/api')

app.teardown_appcontext(close_db)
ensure_database()

# CSRF Token Injection & Validation
@app.before_request
def csrf_protect():
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_hex(32)
        
    if request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
        # Bypassing public endpoints (visitor auth, message form, portfolio likes, blog comments and likes)
        if request.method in ['POST', 'DELETE'] and (
            request.path in ['/api/messages', '/api/like-portfolio', '/api/auth/visitor/login', '/api/auth/visitor/logout']
            or (request.path.startswith('/api/blog/') and request.path.endswith('/comments'))
            or (request.path.startswith('/api/blog/') and request.path.endswith('/likes'))
        ):
            return
            
        
        token = session.get('csrf_token')
        if not token or token != request.headers.get('X-CSRFToken'):
            abort(403, description="CSRF token eksik veya geçersiz.")

@app.after_request
def security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

    # Ziyaret kaydı — yalnızca GET, yalnızca public portfolio
    # try/except ile tamamen izole: hata portfolio'yu asla bozmaz
    try:
        if (
            request.method == 'GET'
            and response.status_code == 200
            and request.path == '/'
        ):
            from services.analytics_service import record_visit
            real_ip = request.environ.get('HTTP_X_FORWARDED_FOR') or request.environ.get('REMOTE_ADDR') or '0.0.0.0'
            # If multiple IPs are present in X-Forwarded-For, get the first one (the original client)
            if ',' in real_ip:
                real_ip = real_ip.split(',')[0].strip()
            
            record_visit(
                ip=real_ip,
                path=request.path,
                user_agent=request.headers.get('User-Agent', ''),
                referrer=request.headers.get('Referer', ''),
            )
    except Exception:
        pass

    return response

def generate_csrf_token():
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_hex(32)
    return session['csrf_token']

app.jinja_env.globals['csrf_token'] = generate_csrf_token

@app.route('/')
def home():
    # Only visitor page, purely read-only public portfolio
    return render_template('portfolio.html')

@app.route('/blog/<slug>')
def blog_detail(slug):
    from services.blog_service import get_blog_post_by_slug
    blog = get_blog_post_by_slug(slug)
    if not blog or blog['status'] != 'published':
        abort(404)
        
    real_ip = request.environ.get('HTTP_X_FORWARDED_FOR') or request.environ.get('REMOTE_ADDR') or '0.0.0.0'
    if ',' in real_ip:
        real_ip = real_ip.split(',')[0].strip()
    user_agent = request.headers.get('User-Agent', '')
    
    try:
        from services.analytics_service import record_blog_view
        if record_blog_view(blog['id'], real_ip, user_agent):
            blog['view_count'] = (blog.get('view_count') or 0) + 1
    except Exception as e:
        print(f"Error recording view in route: {e}")
        
    return render_template('blog_detail.html', blog=blog)

@app.route('/admin/blog/<int:post_id>/preview')
def admin_blog_preview(post_id):
    if not session.get('admin_logged_in'):
        return redirect('/admin/login')
    from services.blog_service import get_blog_post_by_id
    blog = get_blog_post_by_id(post_id)
    if not blog:
        abort(404)
    return render_template('blog_detail.html', blog=blog, preview_mode=True)

@app.route('/admin')
def admin_root():
    if not session.get('admin_logged_in'):
        return redirect('/admin/login')
    return redirect('/admin/dashboard')

@app.route('/admin/dashboard')
def admin_panel():
    if not session.get('admin_logged_in'):
        return redirect('/admin/login')
    return render_template('admin.html')

@app.route('/admin/login')
def admin_login():
    if session.get('admin_logged_in'):
        return redirect('/admin/dashboard')
    return render_template('login.html')

@app.errorhandler(403)
def forbidden_error(error):
    from flask import jsonify
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': str(error.description)}), 403
    return "403 Forbidden", 403

@app.errorhandler(404)
def not_found_error(error):
    from flask import jsonify
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': 'API endpoint bulunamadı'}), 404
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    from flask import jsonify
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': 'Sunucu hatası oluştu'}), 500
    return render_template('500.html'), 500

if __name__ == '__main__':
    app.run(port=5000, debug=is_development)
