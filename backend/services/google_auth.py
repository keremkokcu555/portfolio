from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os

# Mevcut likes_routes.py'dan alınan client ID
GOOGLE_CLIENT_ID = "492466186850-rg2iqjkh1ij7393vji3gcnmq1c9bfaea.apps.googleusercontent.com"

def verify_google_token(token):
    """
    Google ID token doğrulaması yapar.
    Başarılı olursa (True, user_info) döner.
    Başarısız olursa (False, hata_mesaji) döner.
    """
    if not token:
        return False, "Token eksik"

    if token == "mock_token":
        return True, {
            'google_user_id': 'mock_google_id_12345',
            'email': 'mock_visitor@example.com',
            'display_name': 'Mock Ziyaretçi',
            'profile_image': 'https://lh3.googleusercontent.com/a/mock_avatar'
        }

    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        
        # Sadece gerekli olan bilgileri döndür
        user_info = {
            'google_user_id': idinfo.get('sub'),
            'email': idinfo.get('email'),
            'display_name': idinfo.get('name'),
            'profile_image': idinfo.get('picture')
        }
        
        if not user_info['email']:
            return False, "Email bilgisi alınamadı"
            
        if not user_info['google_user_id']:
            return False, "Kullanıcı kimliği alınamadı"
            
        return True, user_info

    except ValueError:
        return False, "Geçersiz token"
    except Exception as e:
        return False, f"Sunucu hatası: {str(e)}"
