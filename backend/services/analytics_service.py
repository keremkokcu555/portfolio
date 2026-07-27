import os
import re
import hmac
import hashlib
from datetime import datetime, timezone

from services.db import get_db

# ── Bot User-Agent kalıpları ─────────────────────────────────────
_BOT_PATTERNS = re.compile(
    r'bot|crawler|spider|slurp|baiduspider|yandexbot|facebot|ia_archive|'
    r'semrush|ahrefsbot|python-requests|curl|wget|libwww|scrapy|'
    r'headlesschrome|phantomjs|selenium|claudebot|gptbot|'
    r'pinterestbot|twitterbot|linkedinbot|whatsapp|facebookexternalhit|'
    r'applebot|duckduckbot',
    re.IGNORECASE
)

# Unique visitor penceresi: aynı takvim günü (UTC)
def _today_utc() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')

def _now_utc() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')


def is_bot(user_agent: str) -> bool:
    """User-Agent bot/crawler içeriyorsa True döner."""
    try:
        if not user_agent:
            return False
        return bool(_BOT_PATTERNS.search(user_agent))
    except Exception:
        return False


def get_ip_hash(ip: str) -> str:
    """IP adresini HMAC-SHA256 ile anonimleştirir. SECRET_KEY salt olarak kullanılır."""
    secret = os.environ.get('SECRET_KEY', '') + 'analytics_v1'
    return hmac.new(secret.encode(), ip.encode(), hashlib.sha256).hexdigest()


def parse_device(user_agent: str) -> dict:
    """UA string'inden cihaz tipi, tarayıcı ve OS çıkarır. Basit kural bazlı."""
    ua = user_agent or ''

    # Device type
    if re.search(r'Mobile|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini', ua, re.I):
        device_type = 'Mobil'
    elif re.search(r'iPad|Tablet|tablet', ua, re.I):
        device_type = 'Tablet'
    else:
        device_type = 'Masaüstü'

    # Browser — sıralama önemli (Edge, Chrome'dan önce gelmeli)
    if re.search(r'Edg/', ua, re.I):
        browser = 'Edge'
    elif re.search(r'OPR|Opera', ua, re.I):
        browser = 'Opera'
    elif re.search(r'SamsungBrowser', ua, re.I):
        browser = 'Samsung'
    elif re.search(r'Firefox', ua, re.I):
        browser = 'Firefox'
    elif re.search(r'Chrome', ua, re.I):
        browser = 'Chrome'
    elif re.search(r'Safari', ua, re.I):
        browser = 'Safari'
    elif re.search(r'MSIE|Trident', ua, re.I):
        browser = 'IE'
    else:
        browser = 'Diğer'

    # OS
    if re.search(r'Android', ua, re.I):
        os_name = 'Android'
    elif re.search(r'iPhone|iPad|iOS', ua, re.I):
        os_name = 'iOS'
    elif re.search(r'Windows', ua, re.I):
        os_name = 'Windows'
    elif re.search(r'Macintosh|Mac OS', ua, re.I):
        os_name = 'macOS'
    elif re.search(r'Linux', ua, re.I):
        os_name = 'Linux'
    elif re.search(r'CrOS', ua, re.I):
        os_name = 'ChromeOS'
    else:
        os_name = 'Diğer'

    return {'device_type': device_type, 'browser': browser, 'os': os_name}


def clean_referrer(referrer: str) -> str:
    """Referrer URL'sinden yalnızca domain alır. Boşsa 'Doğrudan' döner."""
    if not referrer:
        return 'Doğrudan'
    try:
        m = re.search(r'https?://([^/]+)', referrer)
        if m:
            domain = m.group(1).lower()
            # kendi domain ise direkt say
            return domain
        return 'Doğrudan'
    except Exception:
        return 'Doğrudan'


def record_visit(ip: str, path: str, user_agent: str, referrer: str) -> None:
    """
    Ziyareti veritabanına kaydeder.
    Ham IP asla kaydedilmez.
    Hata olursa sessizce geçer — portfolio'yu etkilemez.
    """
    try:
        if is_bot(user_agent):
            return

        v_hash = get_ip_hash(ip)
        parsed = parse_device(user_agent)
        ref = clean_referrer(referrer)
        now = _now_utc()

        db = get_db()
        db.execute(
            '''INSERT INTO visitor_analytics
               (visitor_hash, visited_at, path, device_type, browser, os, referrer, ip_address)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (v_hash, now, path, parsed['device_type'], parsed['browser'], parsed['os'], ref, ip)
        )
        db.commit()
    except Exception:
        pass  # Analytics hatası portfolio'yu asla bozmaz


# ── Admin API için sorgu fonksiyonları ───────────────────────────

def get_summary_stats() -> dict:
    """Dashboard için özet istatistikler."""
    db = get_db()
    today = _today_utc()

    # Bugünkü görüntüleme
    today_views = db.execute(
        "SELECT COUNT(*) FROM visitor_analytics WHERE visited_at LIKE ?",
        (today + '%',)
    ).fetchone()[0]

    # Bugünkü tekil ziyaretçi (takvim gününe göre)
    today_unique = db.execute(
        "SELECT COUNT(DISTINCT visitor_hash) FROM visitor_analytics WHERE visited_at LIKE ?",
        (today + '%',)
    ).fetchone()[0]

    # Son 7 gün görüntüleme
    week_views = db.execute(
        "SELECT COUNT(*) FROM visitor_analytics WHERE visited_at >= datetime('now', '-7 days', 'utc')"
    ).fetchone()[0]

    # Bu ay görüntüleme
    month_prefix = datetime.now(timezone.utc).strftime('%Y-%m')
    month_views = db.execute(
        "SELECT COUNT(*) FROM visitor_analytics WHERE visited_at LIKE ?",
        (month_prefix + '%',)
    ).fetchone()[0]

    # Toplam görüntüleme
    total_views = db.execute(
        "SELECT COUNT(*) FROM visitor_analytics"
    ).fetchone()[0]

    return {
        'today_views':  today_views,
        'today_unique': today_unique,
        'week_views':   week_views,
        'month_views':  month_views,
        'total_views':  total_views,
    }


def get_daily_stats(days: int = 30) -> list:
    """Son N gün için günlük görüntüleme ve tekil ziyaretçi."""
    db = get_db()
    rows = db.execute(
        """SELECT
               substr(visited_at, 1, 10) AS day,
               COUNT(*)                 AS views,
               COUNT(DISTINCT visitor_hash) AS unique_visitors
           FROM visitor_analytics
           WHERE visited_at >= datetime('now', ?, 'utc')
           GROUP BY day
           ORDER BY day ASC""",
        (f'-{days} days',)
    ).fetchall()
    return [{'date': r['day'], 'views': r['views'], 'unique': r['unique_visitors']} for r in rows]


def get_breakdown() -> dict:
    """Cihaz, tarayıcı, OS ve referrer dağılımları."""
    db = get_db()

    def _fetch(col):
        rows = db.execute(
            f"""SELECT {col} AS label, COUNT(*) AS cnt
                FROM visitor_analytics
                GROUP BY {col}
                ORDER BY cnt DESC
                LIMIT 10"""
        ).fetchall()
        total = sum(r['cnt'] for r in rows)
        return [{'label': r['label'] or 'Bilinmiyor', 'count': r['cnt'],
                 'pct': round(r['cnt'] * 100 / total) if total else 0} for r in rows]

    return {
        'device':   _fetch('device_type'),
        'browser':  _fetch('browser'),
        'os':       _fetch('os'),
        'referrer': _fetch('referrer'),
    }


def get_recent_visits(limit: int = 20) -> list:
    """Son N ziyaret — anonim (visitor_hash gösterilmez)."""
    db = get_db()
    rows = db.execute(
        """SELECT visited_at, path, device_type, browser, os, referrer, ip_address
           FROM visitor_analytics
           ORDER BY id DESC
           LIMIT ?""",
        (limit,)
    ).fetchall()
    return [dict(r) for r in rows]


def prune_old_records(days: int) -> int:
    """N günden eski kayıtları siler. Silinen satır sayısını döner."""
    if days < 1:
        return 0
    db = get_db()
    cursor = db.execute(
        "DELETE FROM visitor_analytics WHERE visited_at < datetime('now', ?, 'utc')",
        (f'-{days} days',)
    )
    db.commit()
    return cursor.rowcount
