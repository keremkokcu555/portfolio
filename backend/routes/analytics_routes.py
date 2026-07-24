from flask import Blueprint, jsonify, request
from routes.auth_routes import login_required
from services.analytics_service import (
    get_summary_stats,
    get_daily_stats,
    get_breakdown,
    get_recent_visits,
    prune_old_records,
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
        days = max(1, min(days, 365))  # 1-365 arasında sınırla
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
        days = max(30, min(days, 3650))  # En az 30, en fazla 10 yıl
        deleted = prune_old_records(days)
        return jsonify({'success': True, 'deleted': deleted, 'days': days})
    except Exception:
        return jsonify({'error': 'Temizleme başarısız'}), 500
