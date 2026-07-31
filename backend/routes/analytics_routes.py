from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from routes.auth_routes import login_required
import time

from services.analytics_service import (
    get_analytics_settings,
    get_excluded_ips,
    _IPINFO_AVAILABLE
)
from services.db import get_db
from services.analytics_service import (
    get_summary_stats,
    get_daily_stats,
    get_breakdown,
    get_geo_breakdown,
    get_recent_visits,
    prune_old_records,
    get_dashboard_data,
)

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/api/analytics/summary', methods=['GET'])
@login_required
def analytics_summary():
    try:
        return jsonify(get_summary_stats())
    except Exception:
        return jsonify({'error': 'Veri alınamadı'}), 500


@analytics_bp.route('/api/analytics/daily', methods=['GET'])
@login_required
def analytics_daily():
    try:
        days = int(request.args.get('days', 30))
        days = max(1, min(days, 365))
        return jsonify(get_daily_stats(days))
    except Exception:
        return jsonify({'error': 'Veri alınamadı'}), 500


@analytics_bp.route('/api/analytics/breakdown', methods=['GET'])
@login_required
def analytics_breakdown():
    try:
        return jsonify(get_breakdown())
    except Exception:
        return jsonify({'error': 'Veri alınamadı'}), 500


@analytics_bp.route('/api/analytics/geo', methods=['GET'])
@login_required
def analytics_geo():
    """Ülke, şehir ve ISS dağılımlarını döner."""
    try:
        limit = int(request.args.get('limit', 10))
        limit = max(1, min(limit, 50))
        return jsonify(get_geo_breakdown(limit))
    except Exception:
        return jsonify({'error': 'Veri alınamadı'}), 500


@analytics_bp.route('/api/analytics/recent', methods=['GET'])
@login_required
def analytics_recent():
    try:
        limit = int(request.args.get('limit', 20))
        limit = max(1, min(limit, 100))
        return jsonify(get_recent_visits(limit))
    except Exception:
        return jsonify({'error': 'Veri alınamadı'}), 500


@analytics_bp.route('/api/analytics/prune', methods=['DELETE'])
@login_required
def analytics_prune():
    try:
        days = int(request.args.get('days', 90))
        days = max(30, min(days, 3650))
        deleted = prune_old_records(days)
        return jsonify({'success': True, 'deleted': deleted, 'days': days})
    except Exception:
        return jsonify({'error': 'Temizleme başarısız'}), 500


# Simple in-memory cache for dashboard
_dashboard_cache = {}

@analytics_bp.route('/api/analytics/dashboard', methods=['GET'])
@login_required
def analytics_dashboard():
    try:
        time_range = request.args.get('range', '30days')
        if time_range not in ['today', '7days', '30days', 'month', 'all']:
            time_range = '30days'
            
        now = time.time()
        
        # Check cache dynamically
        settings = get_analytics_settings()
        cache_ttl = settings.get('cache_seconds', 15)
        
        if time_range in _dashboard_cache:
            cached_data, timestamp = _dashboard_cache[time_range]
            if now - timestamp < cache_ttl:
                return jsonify(cached_data)
                
        # Fetch fresh data
        data = get_dashboard_data(time_range)
        
        # Update cache
        _dashboard_cache[time_range] = (data, now)
        
        return jsonify(data)
    except Exception as e:
        import traceback as _tb
        full_tb = _tb.format_exc()
        print(f"[ANALYTICS DASHBOARD ERROR] range={request.args.get('range')} | {type(e).__name__}: {e}")
        print(full_tb)
        return jsonify({'error': 'Veri alınamadı', 'detail': str(e), 'type': type(e).__name__}), 500


@analytics_bp.route('/api/analytics/migrate', methods=['POST'])
@login_required
def analytics_migrate():
    """
    Production-safe migration endpoint.
    Runs ALTER TABLE for all missing visitor_analytics columns directly via sqlite3 (no app_context dependency).
    Returns a full report of which columns existed and which were added.
    """
    import sqlite3 as _sqlite3
    from services.db import DB_PATH
    import traceback as _tb

    REQUIRED_COLS = [
        ('ip_address',   'TEXT'),
        ('country',      'TEXT'),
        ('region',       'TEXT'),
        ('city',         'TEXT'),
        ('loc',          'TEXT'),
        ('org',          'TEXT'),
        ('timezone',     'TEXT'),
        ('postal',       'TEXT'),
        ('network_type', "TEXT DEFAULT 'Unknown'"),
    ]

    report = {
        'db_path': DB_PATH,
        'already_existed': [],
        'added': [],
        'failed': [],
    }

    try:
        conn = _sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(visitor_analytics)")
        existing_cols = {row[1] for row in cursor.fetchall()}
        report['existing_before'] = list(existing_cols)

        for col_name, col_def in REQUIRED_COLS:
            if col_name in existing_cols:
                report['already_existed'].append(col_name)
            else:
                try:
                    cursor.execute(f"ALTER TABLE visitor_analytics ADD COLUMN {col_name} {col_def}")
                    report['added'].append(col_name)
                except Exception as e:
                    report['failed'].append({'column': col_name, 'error': str(e)})

        conn.commit()

        # Verify final state
        cursor.execute("PRAGMA table_info(visitor_analytics)")
        report['existing_after'] = [row[1] for row in cursor.fetchall()]
        conn.close()

        report['success'] = True
        return jsonify(report), 200

    except Exception as e:
        report['success'] = False
        report['error'] = str(e)
        report['traceback'] = _tb.format_exc()
        return jsonify(report), 500


@analytics_bp.route('/api/analytics/health', methods=['GET'])
@login_required
def analytics_health():
    db_status = 'connected'
    try:
        get_db().execute('SELECT 1')
    except Exception:
        db_status = 'disconnected'

    return jsonify({
        'status': 'online',
        'database': db_status,
        'ipinfo': 'connected' if _IPINFO_AVAILABLE else 'unavailable',
        'cache_active': True,
        'cache_ttl': get_analytics_settings().get('cache_seconds', 15),
        'last_refresh': datetime.now(timezone.utc).isoformat(),
        'analytics_version': '2.0.0-PRO'
    })

@analytics_bp.route('/api/analytics/settings', methods=['GET', 'POST'])
@login_required
def analytics_settings():
    db = get_db()
    if request.method == 'GET':
        settings = get_analytics_settings()
        excluded = get_excluded_ips()
        return jsonify({'settings': settings, 'excluded_ips': excluded})
        
    # POST
    data = request.get_json()
    db.execute('''
        UPDATE analytics_settings SET 
            analytics_active = ?, count_admin = ?, count_localhost = ?, count_bots = ?, 
            mask_ips_ui = ?, show_network_type = ?, cache_seconds = ?, 
            refresh_interval = ?, retention_days = ?
        WHERE id = 1
    ''', (
        int(data.get('analytics_active', 1)),
        int(data.get('count_admin', 0)),
        int(data.get('count_localhost', 0)),
        int(data.get('count_bots', 0)),
        int(data.get('mask_ips_ui', 1)),
        int(data.get('show_network_type', 1)),
        int(data.get('cache_seconds', 15)),
        int(data.get('refresh_interval', 60)),
        int(data.get('retention_days', 90))
    ))
    db.commit()
    return jsonify({'success': True})

@analytics_bp.route('/api/analytics/excluded_ips', methods=['GET', 'POST', 'DELETE'])
@login_required
def manage_excluded_ips():
    db = get_db()
    if request.method == 'GET':
        rows = db.execute("SELECT id, ip, note, created_at FROM analytics_excluded_ips").fetchall()
        return jsonify([dict(r) for r in rows])

    data = request.get_json()
    ip = data.get('ip') if data else None
    if not ip:
        return jsonify({'error': 'IP is required'}), 400
        
    if request.method == 'POST':
        try:
            db.execute("INSERT INTO analytics_excluded_ips (ip, note) VALUES (?, ?)", (ip, data.get('note', '')))
            db.commit()
        except Exception:
            pass # ignore unique constraint
    elif request.method == 'DELETE':
        db.execute("DELETE FROM analytics_excluded_ips WHERE ip = ?", (ip,))
        db.commit()
        
    return jsonify({'success': True})
