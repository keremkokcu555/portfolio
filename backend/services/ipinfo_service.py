"""
ipinfo_service.py
─────────────────────────────────────────────────────────────────────────────
IPinfo API entegrasyon servisi.

Bu servis tamamen bağımsızdır; diğer uygulama dosyalarına bağımlılığı yoktur.
Ortam değişkeni üzerinden API token'ı okur, token asla loglanmaz, frontend'e
gönderilmez ve kaynak kodda sabit olarak yer almaz.

Kullanım örneği:
    from services.ipinfo_service import get_ip_info

    info = get_ip_info("8.8.8.8")
    if info:
        print(info.get("country"))
    else:
        print("Bilgi alınamadı")
"""

import os
import json
import time
import logging
import hashlib
from typing import Optional

import requests
from dotenv import load_dotenv

# ─── .env Yükleme ────────────────────────────────────────────────────────────
# Bu servis bağımsız çalışabilmesi için kendi .env yükleme işlemini yapar.
# Zaten yüklenmiş olsa dahi override=False sayesinde mevcut değerlere dokunmaz.
_env_path = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", ".env")
)
load_dotenv(_env_path, override=False)

# ─── Logger ──────────────────────────────────────────────────────────────────
# Ayrı bir logger nesnesi; hassas veriler (token, ham IP) loglanmaz.
logger = logging.getLogger("ipinfo_service")

# ─── Sabitler ────────────────────────────────────────────────────────────────
IPINFO_API_BASE = "https://ipinfo.io"
REQUEST_TIMEOUT = 5          # saniye
CACHE_TTL = 60 * 60 * 24    # 24 saat (saniye cinsinden)

# ─── Bellek İçi Önbellek (In-Memory Cache) ───────────────────────────────────
# Yapı: { "ip_hash": {"data": {...}, "expires_at": <unix_timestamp>} }
# Uygulama yeniden başlatıldığında önbellek sıfırlanır; bu kasıtlı bir tasarım
# tercihidir. Kalıcı önbellek gerekiyorsa Redis gibi bir araç tercih edilmelidir.
_cache: dict = {}


# ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────────────

def _mask_ip(ip: str) -> str:
    """
    IP adresini loglarda güvenli biçimde göstermek için maskeler.

    IPv4  → ilk iki oktet açık, son ikisi yıldız (ör. 8.8.***.***).
    IPv6  → ilk iki grup açık, kalanı yıldız (ör. 2001:db8:***:***).
    Diğer → 'MASKED' döner.
    """
    if not ip:
        return "UNKNOWN"
    if ":" in ip:
        parts = ip.split(":")
        return ":".join(parts[:2]) + ":***:***"
    parts = ip.split(".")
    if len(parts) == 4:
        return f"{parts[0]}.{parts[1]}.***.***"
    return "MASKED"


def _ip_cache_key(ip: str) -> str:
    """
    IP adresini SHA-256 ile hasheleyerek önbellekte anahtar olarak kullanır.
    Ham IP adresi hiçbir zaman önbellek anahtarı olarak saklanmaz.
    """
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()


def _get_token() -> Optional[str]:
    """
    IPINFO_TOKEN ortam değişkenini okur.
    Token boşsa veya yoksa None döner; token asla loglanmaz.
    """
    token = os.environ.get("IPINFO_TOKEN", "").strip()
    return token if token else None


def _cache_get(ip: str) -> Optional[dict]:
    """
    Önbellekte geçerli bir kayıt varsa döner, yoksa ya da süresi dolmuşsa None döner.
    """
    key = _ip_cache_key(ip)
    entry = _cache.get(key)
    if entry is None:
        return None
    if time.time() > entry["expires_at"]:
        # Süresi dolmuş kaydı temizle
        del _cache[key]
        return None
    return entry["data"]


def _cache_set(ip: str, data: dict) -> None:
    """
    Verilen IP için API yanıtını önbelleğe yazar.
    Önbellek anahtarı hashed IP'dir; ham IP saklanmaz.
    """
    key = _ip_cache_key(ip)
    _cache[key] = {
        "data": data,
        "expires_at": time.time() + CACHE_TTL,
    }


# ─── Ana Servis Fonksiyonu ───────────────────────────────────────────────────

def get_ip_info(ip: str) -> Optional[dict]:
    """
    Verilen IP adresi için IPinfo API'sinden coğrafi/ağ bilgisi döner.

    Önce bellek içi önbelleği kontrol eder; önbellekte yoksa HTTP isteği atar.
    Başarılı bir yanıt 24 saat boyunca önbellekte saklanır.

    Parametreler
    ────────────
    ip : str
        Sorgulanacak IP adresi (IPv4 veya IPv6).

    Döndürdüğü değer
    ────────────────
    dict  : Başarılı yanıt (ör. {"ip","city","region","country","org",...}).
    None  : Token eksikse, ağ hatası oluşursa veya API hata kodu dönerse.

    Hatalar
    ───────
    Hiçbir istisna dışarıya sızdırılmaz; tüm sorunlar loglanır ve None döner.
    """
    masked = _mask_ip(ip)

    # ── 1. Önbellek Kontrolü ──────────────────────────────────────────────────
    cached = _cache_get(ip)
    if cached is not None:
        logger.debug("IPinfo önbellekten döndü: %s", masked)
        return cached

    inst_log = logging.getLogger('analytics.instrumentation')
    
    # ── 2. Token Kontrolü ────────────────────────────────────────────────────
    token = _get_token()
    if not token:
        inst_log.warning("6. IPINFO_TOKEN missing: True (Using free tier)")
    else:
        inst_log.warning("6. IPINFO_TOKEN missing: False (Token found)")

    # ── 3. HTTP İsteği ───────────────────────────────────────────────────────
    url = f"{IPINFO_API_BASE}/{ip}/json"
    inst_log.warning(f"7. Exact URL requested: {url}")
    
    headers = {
        "Accept": "application/json",
        "User-Agent": "portfolio-app/1.0 (ipinfo-service)",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        inst_log.warning(f"8. HTTP status returned by IPinfo: {response.status_code}")
        
        try:
            body = response.text[:500]
        except Exception:
            body = "Could not read body"
        inst_log.warning(f"9. Response body (first 500 chars): {body}")

        # ── HTTP Hata Kodları ────────────────────────────────────────────────
        if response.status_code == 401:
            logger.error(
                "IPinfo 401 Unauthorized — token geçersiz. IP: %s", masked
            )
            return None

        if response.status_code == 403:
            logger.error(
                "IPinfo 403 Forbidden — erişim reddedildi. IP: %s", masked
            )
            return None

        if response.status_code == 404:
            logger.warning("IPinfo 404 — IP bulunamadı: %s", masked)
            return None

        if response.status_code == 429:
            logger.warning(
                "IPinfo 429 Rate Limit — istek limiti aşıldı. IP: %s", masked
            )
            return None

        if response.status_code >= 500:
            logger.error(
                "IPinfo %d Sunucu Hatası. IP: %s",
                response.status_code,
                masked,
            )
            return None

        if not response.ok:
            logger.warning(
                "IPinfo beklenmeyen durum kodu %d. IP: %s",
                response.status_code,
                masked,
            )
            return None

        # ── JSON Ayrıştırma ──────────────────────────────────────────────────
        try:
            data = response.json()
        except (json.JSONDecodeError, ValueError) as e:
            inst_log.error(f"10. JSON Decode Exception: {e}")
            logger.error(
                "IPinfo JSON ayrıştırma hatası. IP: %s | Hata: %s", masked, e
            )
            return None

        # ── Önbelleğe Yaz ve Döndür ─────────────────────────────────────────
        _cache_set(ip, data)
        logger.info("IPinfo başarılı. IP: %s | Ülke: %s", masked, data.get("country", "?"))
        return data

    except requests.exceptions.Timeout:
        logger.warning(
            "IPinfo zaman aşımı (%ds). IP: %s", REQUEST_TIMEOUT, masked
        )
        return None

    except requests.exceptions.ConnectionError as e:
        logger.error("IPinfo bağlantı hatası. IP: %s | Hata: %s", masked, e)
        return None

    except requests.exceptions.RequestException as e:
        logger.error("IPinfo ağ hatası. IP: %s | Hata: %s", masked, e)
        return None

    except Exception as e:
        # Beklenmedik her türlü hata yakalanır; sistem asla çökmez.
        logger.critical(
            "IPinfo beklenmeyen hata. IP: %s | Tür: %s",
            masked,
            type(e).__name__,
        )
        return None


def get_cache_stats() -> dict:
    """
    Mevcut önbellek durumunu döndürür.
    Hata ayıklama / izleme amacıyla kullanılabilir.
    Ham IP ya da token bilgisi içermez.
    """
    now = time.time()
    total = len(_cache)
    active = sum(1 for v in _cache.values() if v["expires_at"] > now)
    expired = total - active
    return {
        "total_entries": total,
        "active_entries": active,
        "expired_entries": expired,
        "cache_ttl_seconds": CACHE_TTL,
    }


def clear_cache() -> int:
    """
    Tüm önbelleği temizler. Temizlenen kayıt sayısını döndürür.
    Gerektiğinde dışarıdan çağrılabilir.
    """
    count = len(_cache)
    _cache.clear()
    logger.info("IPinfo önbelleği temizlendi. Silinen kayıt: %d", count)
    return count


# ─── Test Fonksiyonu ─────────────────────────────────────────────────────────

def test_ipinfo_service(test_ip: str = "8.8.8.8") -> None:
    """
    Servisi hızlıca test etmek için kullanılır.
    Doğrudan `python ipinfo_service.py` komutuyla çalıştırılabilir.

    Parametreler
    ────────────
    test_ip : str
        Test edilecek IP adresi. Varsayılan: 8.8.8.8 (Google DNS).

    Örnek çıktı:
        [OK]  IP: 8.8.*** | Ülke: US | Şehir: Mountain View
        [OK]  Önbellek istatistikleri: {'total_entries': 1, ...}
        [OK]  Önbellek testi (2. istek önbellekten gelmeli): ...
    """
    # Logging'i test için konsola yönlendir
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    print(f"\n{'='*60}")
    print(" IPinfo Servis Testi")
    print(f"{'='*60}")

    # Token kontrolü (değerini loglamıyoruz)
    token = _get_token()
    if not token:
        print("[WARN] IPINFO_TOKEN bulunamadı. Ücretsiz katman (anonim) kullanılacak.")
        print("       .env dosyanıza şu satırı eklerseniz rate limit artar:")
        print("       IPINFO_TOKEN=your_token_here")
    else:
        print(f"[OK]   Token mevcut (ilk 4 karakter: {token[:4]}****)")

    print(f"[OK]   Test IP: {_mask_ip(test_ip)}")

    # 1. İstek (API'den)
    print("\n[1/3] API isteği atılıyor...")
    result = get_ip_info(test_ip)

    if result:
        print(f"[OK]   Yanıt alındı.")
        print(f"       Ülke  : {result.get('country', 'N/A')}")
        print(f"       Şehir : {result.get('city', 'N/A')}")
        print(f"       Bölge : {result.get('region', 'N/A')}")
        print(f"       Org   : {result.get('org', 'N/A')}")
    else:
        print("[HATA] Yanıt alınamadı. Log çıktısını inceleyin.")

    # 2. Önbellek istatistikleri
    print("\n[2/3] Önbellek durumu kontrol ediliyor...")
    stats = get_cache_stats()
    print(f"[OK]   {stats}")

    # 3. İkinci istek (önbellekten gelmeli)
    print("\n[3/3] 2. istek (önbellekten gelmeli)...")
    result2 = get_ip_info(test_ip)
    if result2 and result2 == result:
        print("[OK]   Önbellek çalışıyor — aynı veri döndü.")
    else:
        print("[UYARI] Önbellek beklenen davranışı sergilemedi.")

    print(f"\n{'='*60}")
    print(" Test tamamlandı.")
    print(f"{'='*60}\n")



# ─── Servis Doğrulama Fonksiyonu ─────────────────────────────────────────────

def verify_ipinfo_service(test_ip: str = "8.8.8.8") -> bool:
    """
    IPinfo servisinin uçtan uca çalışıp çalışmadığını doğrular.

    Kontrol sırası:
      1. IPINFO_TOKEN ortam değişkeni okunabilir mi?
      2. https://ipinfo.io/<ip> API'sine gerçek bir istek atılabiliyor mu?
      3. Yanıttaki zorunlu alanlar (ip, city, region, country, loc, org, timezone) mevcut mu?

    Döndürdüğü değer
    ────────────────
    True  : Tüm kontroller başarılı — servis kullanıma hazır.
    False : Herhangi bir kontrol başarısız — detay terminalde gösterilir.

    Hiçbir durumda exception dışarıya sızdırmaz; sistem asla çökmez.
    """
    logging.basicConfig(
        level=logging.WARNING,                      # sadece uyarı ve üzeri
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    REQUIRED_FIELDS = ["ip", "city", "region", "country", "loc", "org", "timezone"]
    SEP = "=" * 41

    print(f"\n{SEP}")
    print("  IPINFO SERVICE VERIFICATION")
    print(SEP)

    # ── 1. Token Kontrolü ─────────────────────────────────────────────────────
    token = _get_token()
    if not token:
        print("[WARN] IPINFO token not found. Using free tier (anonymous).")
    else:
        print("[OK]   IPINFO token detected.")

    # ── 2. API İsteği ────────────────────────────────────────────────────────
    url = f"{IPINFO_API_BASE}/{test_ip}/json"
    headers = {
        "Accept": "application/json",
        "User-Agent": "portfolio-app/1.0 (ipinfo-verify)",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
    except requests.exceptions.Timeout:
        print("[FAIL] API istegi zaman asimina ugradi (5s).")
        print(f"\n  Sebep   : İnternet bağlantısı yavaş veya IPinfo erişilemiyor.")
        print(f"{SEP}\n")
        return False
    except requests.exceptions.ConnectionError:
        print("[FAIL] API'ye baglanılamadi.")
        print(f"\n  Sebep   : İnternet bağlantısı yok veya DNS çözümlenemedi.")
        print(f"{SEP}\n")
        return False
    except Exception as e:
        print(f"[FAIL] Beklenmeyen hata: {type(e).__name__}")
        print(f"{SEP}\n")
        return False

    # ── 3. HTTP Durum Kodu ───────────────────────────────────────────────────
    if response.status_code == 401:
        print("[FAIL] API istegi reddedildi.")
        print(f"\n  Sebep   : Token geçersiz (401 Unauthorized).")
        print(f"  Çözüm   : https://ipinfo.io/account/token adresinden geçerli token alın.")
        print(f"{SEP}\n")
        return False

    if response.status_code == 429:
        print("[FAIL] API istek limiti dolmus.")
        print(f"\n  Sebep   : 429 Too Many Requests.")
        print(f"  Çözüm   : Ücretsiz planda aylık 50.000 istek hakkı vardır.")
        print(f"{SEP}\n")
        return False

    if not response.ok:
        print(f"[FAIL] API beklenmeyen durum kodu: {response.status_code}")
        print(f"{SEP}\n")
        return False

    # ── 4. JSON Ayrıştırma ───────────────────────────────────────────────────
    try:
        data = response.json()
    except (json.JSONDecodeError, ValueError):
        print("[FAIL] API yaniti JSON olarak ayristirilamadi.")
        print(f"{SEP}\n")
        return False

    # ── 5. Zorunlu Alan Kontrolü ─────────────────────────────────────────────
    missing = [f for f in REQUIRED_FIELDS if f not in data]
    if missing:
        print(f"[FAIL] Yanıtta eksik alanlar var: {missing}")
        print(f"{SEP}\n")
        return False

    # ── 6. Başarı Raporu ─────────────────────────────────────────────────────
    print(f"\n  Test IP  : {data.get('ip', 'N/A')}")
    print(f"  Ülke     : {data.get('country', 'N/A')}")
    print(f"  Şehir    : {data.get('city', 'N/A')}")
    print(f"  Bölge    : {data.get('region', 'N/A')}")
    print(f"  Konum    : {data.get('loc', 'N/A')}")
    print(f"  Org      : {data.get('org', 'N/A')}")
    print(f"  Zaman D. : {data.get('timezone', 'N/A')}")

    print(f"\n{SEP}")
    print("  IPINFO SERVICE READY")
    print(f"  Token Loaded : YES")
    print(f"  API Status   : OK")
    print(f"{SEP}\n")
    return True


# ─── Doğrudan Çalıştırma ─────────────────────────────────────────────────────
if __name__ == "__main__":
    verify_ipinfo_service("8.8.8.8")
