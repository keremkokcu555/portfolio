import os
import re
import hmac
import hashlib
from datetime import datetime, timezone, timedelta

from services.db import get_db

# IPinfo servisi — import hatası uygulamayı durdurmamalı
try:
    from services.ipinfo_service import get_ip_info as _get_ip_info
    _IPINFO_AVAILABLE = True
except Exception:
    _get_ip_info = None
    _IPINFO_AVAILABLE = False

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


def _fetch_geo(ip: str) -> dict:
    """
    IPinfo servisinden coğrafi veri çeker.
    Servis mevcut değilse veya hata oluşursa boş dict döner.
    Cache, ipinfo_service katmanında yönetilir (24 saat).
    """
    if not _IPINFO_AVAILABLE or not _get_ip_info:
        return {}
    try:
        data = _get_ip_info(ip)
        if not data:
            return {}
        return {
            'country':  data.get('country'),
            'region':   data.get('region'),
            'city':     data.get('city'),
            'loc':      data.get('loc'),
            'org':      data.get('org'),
            'timezone': data.get('timezone'),
            'postal':   data.get('postal'),
        }
    except Exception:
        return {}  # Geo hatası analytics akışını asla kesmez


def ensure_ipinfo_columns() -> None:
    """
    visitor_analytics tablosunda IPinfo kolonlarının varlığını kontrol eder.
    Yoksa ALTER TABLE ile ekler. Var olanları değiştirmez.
    Uygulama başlangıcında güvenle çağrılabilir.
    """
    cols_needed = ['country', 'region', 'city', 'loc', 'org', 'timezone', 'postal']
    try:
        db = get_db()
        existing = {r['name'] for r in db.execute('PRAGMA table_info(visitor_analytics)').fetchall()}
        for col in cols_needed:
            if col not in existing:
                db.execute(f'ALTER TABLE visitor_analytics ADD COLUMN {col} TEXT')
        db.commit()
    except Exception:
        pass  # Migration hatası uygulamayı durdurmamalı


def record_visit(ip: str, path: str, user_agent: str, referrer: str) -> None:
    """
    Ziyareti veritabanına kaydeder.
    Gerçek IP adresi loglanır (maskeleme UI tarafındadır).
    Settings tablosundaki yapılandırmalara göre filtreleme yapılır.
    """
    try:
        from flask import session
        settings = get_analytics_settings()
        
        # 1. Admin Kontrolü
        if settings.get('count_admin', 0) == 0:
            if session.get('admin_id'):
                return
                
        # 2. Localhost Kontrolü
        if settings.get('count_localhost', 0) == 0:
            if ip in ['127.0.0.1', '::1', 'localhost']:
                return
                
        # 3. Bot Kontrolü
        if settings.get('count_bots', 0) == 0:
            if is_bot(user_agent):
                return
            ua_lower = (user_agent or '').lower()
            if any(kw in ua_lower for kw in ANALYTICS_CONFIG['bot_keywords']):
                return
                
        # 4. Excluded IP Kontrolü
        excluded_ips = get_excluded_ips()
        if ip in excluded_ips:
            return

        v_hash = get_ip_hash(ip)
        parsed = parse_device(user_agent)
        ref = clean_referrer(referrer)
        now = _now_utc()

        # IPinfo: cache'li, hata-izole çağrı
        geo = _fetch_geo(ip)
        
        # Infer Network Type
        net_type = infer_network_type(geo.get('org'))

        db = get_db()
        db.execute(
            '''INSERT INTO visitor_analytics
               (visitor_hash, visited_at, path, device_type, browser, os, referrer, ip_address,
                country, region, city, loc, org, timezone, postal, network_type)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (
                v_hash, now, path,
                parsed['device_type'], parsed['browser'], parsed['os'],
                ref, ip,
                geo.get('country'), geo.get('region'), geo.get('city'),
                geo.get('loc'),     geo.get('org'),     geo.get('timezone'),
                geo.get('postal'),  net_type
            )
        )
        db.commit()
    except Exception:
        pass  # Analytics hatası portfolio'yu asla bozmaz


# ── Admin API için sorgu fonksiyonları ───────────────────────────


# Config for network types
ANALYTICS_CONFIG = {
    'datacenter_keywords': ['hosting', 'datacenter', 'cloud', 'aws', 'amazon', 'google', 'digitalocean', 'ovh', 'linode', 'hetzner', 'azure'],
    'bot_keywords': ['bot', 'crawler', 'spider', 'slurp', 'archive', 'headless']
}

def get_analytics_settings():
    db = get_db()
    row = db.execute("SELECT * FROM analytics_settings WHERE id = 1").fetchone()
    if row:
        return dict(row)
    return {
        'count_admin': 0,
        'count_localhost': 0,
        'count_bots': 0,
        'mask_ips_ui': 1,
        'cache_seconds': 15,
        'refresh_interval': 60,
        'retention_days': 90
    }

def get_excluded_ips():
    db = get_db()
    rows = db.execute("SELECT ip FROM analytics_excluded_ips").fetchall()
    return [r['ip'] for r in rows]

def infer_network_type(org: str) -> str:
    if not org:
        return 'Unknown'
    org_lower = org.lower()
    for kw in ANALYTICS_CONFIG['datacenter_keywords']:
        if kw in org_lower:
            return 'Datacenter'
    # Normally we'd use IPinfo's 'privacy' block but free tier doesn't have it reliably
    # If it's not a known datacenter/hosting, we assume Residential for now
    return 'Residential'

def mask_ip(ip: str) -> str:
    """IP adresini maskeler: son iki oktet yıldız olur (85.102.***.***)"""
    if not ip:
        return 'Bilinmiyor'
    try:
        parts = ip.split('.')
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.***.***"
        # IPv6
        parts6 = ip.split(':')
        if len(parts6) >= 2:
            return f"{parts6[0]}:{parts6[1]}:***:***"
    except Exception:
        pass
    return '***.***.***'


def get_summary_stats() -> dict:
    """Dashboard için özet istatistikler. Geo alanlar dahil."""
    db = get_db()
    today = _today_utc()

    today_views = db.execute(
        "SELECT COUNT(*) FROM visitor_analytics WHERE visited_at LIKE ?",
        (today + '%',)
    ).fetchone()[0]

    today_unique = db.execute(
        "SELECT COUNT(DISTINCT visitor_hash) FROM visitor_analytics WHERE visited_at LIKE ?",
        (today + '%',)
    ).fetchone()[0]

    week_views = db.execute(
        "SELECT COUNT(*) FROM visitor_analytics WHERE visited_at >= datetime('now', '-7 days', 'utc')"
    ).fetchone()[0]

    month_prefix = datetime.now(timezone.utc).strftime('%Y-%m')
    month_views = db.execute(
        "SELECT COUNT(*) FROM visitor_analytics WHERE visited_at LIKE ?",
        (month_prefix + '%',)
    ).fetchone()[0]

    total_views = db.execute(
        "SELECT COUNT(*) FROM visitor_analytics"
    ).fetchone()[0]

    # Geo sayımları (NULL olmayan benzersiz değerler)
    country_count = db.execute(
        "SELECT COUNT(DISTINCT country) FROM visitor_analytics WHERE country IS NOT NULL AND country != ''"
    ).fetchone()[0]

    city_count = db.execute(
        "SELECT COUNT(DISTINCT city) FROM visitor_analytics WHERE city IS NOT NULL AND city != ''"
    ).fetchone()[0]

    org_count = db.execute(
        "SELECT COUNT(DISTINCT org) FROM visitor_analytics WHERE org IS NOT NULL AND org != ''"
    ).fetchone()[0]

    return {
        'today_views':   today_views,
        'today_unique':  today_unique,
        'week_views':    week_views,
        'month_views':   month_views,
        'total_views':   total_views,
        'country_count': country_count,
        'city_count':    city_count,
        'org_count':     org_count,
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


def get_geo_breakdown(limit: int = 10) -> dict:
    """
    Ülke, şehir ve ISS dağılımlarını döner.
    Sadece IPinfo verisi olan kayıtlar dahil edilir.
    NULL veya boş değerler 'Bilinmiyor' olarak gösterilir.
    """
    db = get_db()

    def _geo_fetch(col):
        rows = db.execute(
            f"""SELECT COALESCE(NULLIF({col}, ''), 'Bilinmiyor') AS label,
                       COUNT(*) AS cnt
                FROM visitor_analytics
                GROUP BY label
                ORDER BY cnt DESC
                LIMIT ?""",
            (limit,)
        ).fetchall()
        total = sum(r['cnt'] for r in rows)
        return [{'label': r['label'], 'count': r['cnt'],
                 'pct': round(r['cnt'] * 100 / total) if total else 0} for r in rows]

    return {
        'country': _geo_fetch('country'),
        'city':    _geo_fetch('city'),
        'org':     _geo_fetch('org'),
    }


def get_recent_visits(limit: int = 20) -> list:
    """Son N ziyaret — anonim (visitor_hash gösterilmez)."""
    db = get_db()
    rows = db.execute(
        """SELECT visited_at, path, device_type, browser, os, referrer, ip_address,
                  country, region, city, loc, org, timezone, postal
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


# ── Blog Görüntülenme Analitiği (Aşama 7) ───────────────────────────

BLOG_VIEW_DEDUP_MINUTES = 30

def record_blog_view(blog_post_id: int, ip: str, user_agent: str) -> bool:
    """
    Belirli bir blog yazısı için görüntülendi kaydı oluşturur.
    F5 spam koruması (30 dakika) ve bot filtresi içerir.
    """
    try:
        # Bot kontrolü
        if is_bot(user_agent):
            return False
            
        # Ziyaretçi hash üretimi (IP + UA + SECRET_KEY)
        secret = os.environ.get('SECRET_KEY', '') + 'blog_views_v1'
        data_str = f"{ip}_{user_agent or ''}"
        visitor_hash = hmac.new(secret.encode(), data_str.encode(), hashlib.sha256).hexdigest()
        
        db = get_db()
        cursor = db.cursor()
        
        # Son 30 dakika içerisinde aynı ziyaretçinin kaydı var mı kontrol et
        time_limit = f"-{BLOG_VIEW_DEDUP_MINUTES} minutes"
        existing = cursor.execute('''
            SELECT id FROM blog_views 
            WHERE blog_post_id = ? AND visitor_hash = ? 
              AND viewed_at >= datetime('now', ?, 'localtime')
            LIMIT 1
        ''', (blog_post_id, visitor_hash, time_limit)).fetchone()
        
        if existing:
            return False
            
        cursor.execute('''
            INSERT INTO blog_views (blog_post_id, visitor_hash) 
            VALUES (?, ?)
        ''', (blog_post_id, visitor_hash))
        db.commit()
        return True
        
    except Exception as e:
        # Hata sitenin geri kalanını çökertmemeli
        print(f"Blog view tracking error: {e}")
        return False

def get_blog_views_count(blog_post_id: int) -> int:
    """Tekil bir blog yazısının görüntülenme sayısını döner."""
    try:
        db = get_db()
        row = db.execute('SELECT COUNT(*) as count FROM blog_views WHERE blog_post_id = ?', (blog_post_id,)).fetchone()
        return row['count'] if row else 0
    except Exception as e:
        print(f"Error getting blog views count: {e}")
        return 0

def get_total_blog_views_count() -> int:
    """Tüm blog yazılarının toplam görüntülenme sayısını döner."""
    try:
        db = get_db()
        row = db.execute('SELECT COUNT(*) as count FROM blog_views').fetchone()
        return row['count'] if row else 0
    except Exception as e:
        print(f"Error getting total blog views count: {e}")
        return 0


def get_dashboard_data(time_range: str = '30days') -> dict:
    """
    Dashboard için tüm veri setini (summary, charts, tables, trends) döndürür.
    Zaman aralıkları: 'today', '7days', '30days', 'month', 'all'
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    
    # Tarih sınırlarını hesapla
    if time_range == 'today':
        current_start = now.strftime('%Y-%m-%d 00:00:00')
        previous_start = (now - timedelta(days=1)).strftime('%Y-%m-%d 00:00:00')
        previous_end = current_start
    elif time_range == '7days':
        current_start = (now - timedelta(days=7)).strftime('%Y-%m-%d %H:%M:%S')
        previous_start = (now - timedelta(days=14)).strftime('%Y-%m-%d %H:%M:%S')
        previous_end = current_start
    elif time_range == '30days':
        current_start = (now - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
        previous_start = (now - timedelta(days=60)).strftime('%Y-%m-%d %H:%M:%S')
        previous_end = current_start
    elif time_range == 'month':
        current_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).strftime('%Y-%m-%d %H:%M:%S')
        prev_month = (now.replace(day=1) - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0)
        previous_start = prev_month.strftime('%Y-%m-%d %H:%M:%S')
        previous_end = current_start
    else: # 'all'
        current_start = '2000-01-01 00:00:00'
        previous_start = current_start
        previous_end = current_start
        
    def _fetch_trend(query, curr_params, prev_params):
        curr = db.execute(query, curr_params).fetchone()[0]
        if time_range == 'all':
            return {'val': curr, 'trend': 0}
        prev = db.execute(query, prev_params).fetchone()[0]
        return {'val': curr, 'trend': curr - prev}

    def _fetch_unique_trend(col):
        curr_q = f"SELECT COUNT(DISTINCT {col}) FROM visitor_analytics WHERE visited_at >= ? AND {col} IS NOT NULL AND {col} != ''"
        prev_q = f"SELECT COUNT(DISTINCT {col}) FROM visitor_analytics WHERE visited_at >= ? AND visited_at < ? AND {col} IS NOT NULL AND {col} != ''"
        curr = db.execute(curr_q, (current_start,)).fetchone()[0]
        if time_range == 'all':
            return {'val': curr, 'trend': 0}
        prev = db.execute(prev_q, (previous_start, previous_end)).fetchone()[0]
        return {'val': curr, 'trend': curr - prev}

    # Summary and Trends
    total_views = _fetch_trend(
        "SELECT COUNT(*) FROM visitor_analytics", (), ()
    )
    
    # simpler macro for trend
    def calc_trend(curr_val, prev_val):
        return curr_val - prev_val if time_range != 'all' else 0

    curr_views = db.execute("SELECT COUNT(*) FROM visitor_analytics WHERE visited_at >= ?", (current_start,)).fetchone()[0]
    prev_views = db.execute("SELECT COUNT(*) FROM visitor_analytics WHERE visited_at >= ? AND visited_at < ?", (previous_start, previous_end)).fetchone()[0]
    views_stat = {'val': curr_views, 'trend': calc_trend(curr_views, prev_views)}

    curr_unique = db.execute("SELECT COUNT(DISTINCT visitor_hash) FROM visitor_analytics WHERE visited_at >= ?", (current_start,)).fetchone()[0]
    prev_unique = db.execute("SELECT COUNT(DISTINCT visitor_hash) FROM visitor_analytics WHERE visited_at >= ? AND visited_at < ?", (previous_start, previous_end)).fetchone()[0]
    unique_stat = {'val': curr_unique, 'trend': calc_trend(curr_unique, prev_unique)}

    def count_col(col):
        curr = db.execute(f"SELECT COUNT(DISTINCT {col}) FROM visitor_analytics WHERE visited_at >= ? AND {col} IS NOT NULL AND {col} != ''", (current_start,)).fetchone()[0]
        prev = db.execute(f"SELECT COUNT(DISTINCT {col}) FROM visitor_analytics WHERE visited_at >= ? AND visited_at < ? AND {col} IS NOT NULL AND {col} != ''", (previous_start, previous_end)).fetchone()[0]
        return {'val': curr, 'trend': calc_trend(curr, prev)}

    country_stat = count_col('country')
    city_stat = count_col('city')
    org_stat = count_col('org')

    # Top stats
    def get_top(col):
        row = db.execute(f"SELECT {col} FROM visitor_analytics WHERE visited_at >= ? AND {col} IS NOT NULL AND {col} != '' GROUP BY {col} ORDER BY COUNT(*) DESC LIMIT 1", (current_start,)).fetchone()
        return row[0] if row else 'Belirsiz'
        
    top_browser = get_top('browser')
    top_os = get_top('os')
    
    # Busiest day
    busiest_day_row = db.execute(
        "SELECT substr(visited_at, 1, 10) as day, COUNT(*) as cnt FROM visitor_analytics WHERE visited_at >= ? GROUP BY day ORDER BY cnt DESC LIMIT 1", 
        (current_start,)
    ).fetchone()
    busiest_day = busiest_day_row['day'] if busiest_day_row else 'Belirsiz'

    # Daily Average
    days_diff = (now - datetime.strptime(current_start, '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)).days if time_range != 'today' else 1
    days_diff = max(1, days_diff)
    daily_avg = round(curr_views / days_diff)

    # Charts Data
    # 1. Line Chart (Daily)
    daily_rows = db.execute(
        "SELECT substr(visited_at, 1, 10) as day, COUNT(*) as views FROM visitor_analytics WHERE visited_at >= ? GROUP BY day ORDER BY day ASC",
        (current_start,)
    ).fetchall()
    daily_labels = [r['day'] for r in daily_rows]
    daily_data = [r['views'] for r in daily_rows]

    def _chart_agg(col, limit=10, default='Bilinmiyor'):
        rows = db.execute(
            f"SELECT COALESCE(NULLIF({col}, ''), ?) as label, COUNT(*) as cnt FROM visitor_analytics WHERE visited_at >= ? GROUP BY label ORDER BY cnt DESC LIMIT ?",
            (default, current_start, limit)
        ).fetchall()
        return {
            'labels': [r['label'] for r in rows],
            'data': [r['cnt'] for r in rows]
        }

    # Tables: Recent Visits
    recent_rows = db.execute(
        """SELECT visited_at, ip_address, country, city, org, browser, os, network_type 
           FROM visitor_analytics 
           WHERE visited_at >= ? 
           ORDER BY visited_at DESC 
           LIMIT 30""",
        (current_start,)
    ).fetchall()
    
    recent_table = []
    for r in recent_rows:
        recent_table.append({
            'visited_at': r['visited_at'],
            'ip_address': r['ip_address'],
            'country': r['country'],
            'city': r['city'],
            'org': r['org'],
            'browser': r['browser'],
            'os': r['os'],
            'network_type': r['network_type'] if 'network_type' in r.keys() else 'Unknown'
        })

    total_all = db.execute("SELECT COUNT(*) FROM visitor_analytics").fetchone()[0]

    settings = get_analytics_settings()
    return {
        'settings': settings,
        'summary': {
            'views': views_stat,
            'unique': unique_stat,
            'countries': country_stat,
            'cities': city_stat,
            'orgs': org_stat,
            'total_all': total_all
        },
        'trends': {
            'top_browser': top_browser,
            'top_os': top_os,
            'busiest_day': busiest_day,
            'daily_avg': daily_avg
        },
        'charts': {
            'daily': {'labels': daily_labels, 'data': daily_data},
            'browser': _chart_agg('browser'),
            'os': _chart_agg('os'),
            'country': _chart_agg('country'),
            'city': _chart_agg('city', limit=15)
        },
        'tables': {
            'recent': recent_table
        },
        'metadata': {
            'range': time_range,
            'generated_at': now.isoformat()
        }
    }
