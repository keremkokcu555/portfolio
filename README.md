# Portfolio Backend (Python + SQLite)

Bu proje, kişisel CV bilgilerinizi, eğitim ve kurs verilerinizi, sertifikalarınızı, deneyimlerinizi, projelerinizi, yetenek ve dil bilgilerinizi güvenli bir şekilde saklamak ve sergilemek için hazırlanmış bir web uygulamasıdır.

## Mimari & Özellikler

Proje iki temel kısımdan oluşmaktadır:
1. **Public Portfolio (Ziyaretçi Ekranı)**: Geliştirici kimliğinizi ve geçmişinizi ziyaretçilerinize modern bir tasarımla (SPA - Single Page Application mantığı) sunar. 
2. **Admin Paneli**: Tamamen size özel ve güvenli ortamda portföyünüzün içeriğini yönetmenizi (CRUD işlemleri) sağlar.

### Öne Çıkan Özellikler:
- **Veritabanı**: Veriler `backend/data/cv.db` içinde taşınabilir `SQLite` ile saklanır.
- **Kimlik Doğrulama**: Güvenilir ve modern **Argon2** hash algoritması tabanlı Admin oturumu.
- **Dosya Yönetimi**: Pillow destekli görsel optimizasyon, backend uzantı (MIME ve Magic Number) validasyonu ile CV ve Sertifika/Proje kapak yüklemeleri.
- **İletişim Formu**: Public kullanıcıların size ulaşması için Rate Limiting korumalı Gelen Mesajlar modülü.
- **Dashboard**: Ziyaretçi görüntülenmesi, sistem verileri ve mesaj özetleri.
- **Güvenlik (CSRF & Headers)**: Kritik Admin HTTP işlemlerinde CSRF Token validasyonu, X-Content-Type-Options gibi güncel Security Header korumaları.

## Kullanılan Teknolojiler

- **Backend**: Python 3, Flask, SQLite3
- **Güvenlik**: argon2-cffi, CSRF Token, Secure Cookies
- **Görüntü İşleme**: Pillow (PIL)
- **Frontend**: Vanilla JavaScript (Fetch API), HTML5, CSS3

---

## Kurulum ve Çalıştırma

### 1. Sanal Ortam (Virtual Environment)
Geliştirme ortamınızın izole olması için venv kullanmanız önerilir.

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Bağımlılıkların Yüklenmesi
Projeyi çalıştırmak için gerekli kütüphaneleri kurun:

```powershell
pip install -r requirements.txt
```

### 3. Çevre Değişkenleri (.env)
Proje kök dizininde bulunan `.env.example` dosyasının adını `.env` olarak değiştirin ve içindeki değerleri güvenli bir şekilde güncelleyin.
* `SECRET_KEY`: Uygulama oturum ve CSRF güvenliği için uzun, rastgele bir karakter dizisi (Zorunludur).
* `FLASK_ENV`: Geliştirme sürecinde `development`, canlıda `production` olmalıdır.
* `ADMIN_USERNAME`: Panele giriş yapacağınız kullanıcı adı.
* `ADMIN_PASSWORD_HASH`: Parolanızın scrypt/argon2 formatında oluşturulmuş hash hali. *(Not: Panele ilk giriş denemenizde hash argon2'ye çevrilecektir)*

### 4. Geliştirme (Development) Ortamında Çalıştırma
Yerel test ve geliştirmeler için:

```powershell
python backend/app.py
```
> Sunucu `http://127.0.0.1:5000` adresinde ayağa kalkacaktır. Uygulama ilk kez çalıştığında `data/cv.db` şeması otomatik olarak oluşturulur.

---

## Production Deployment (Canlıya Alma)

`python app.py` (Flask Development Server) production ortamı için uygun değildir. Asenkron işlemler ve yük altında performanslı/güvenli çalışması için WSGI sunucusu kullanılması şarttır.

### Windows İçin (Waitress)
```powershell
pip install waitress
waitress-serve --listen=127.0.0.1:5000 "backend.app:app"
```

### Linux İçin (Gunicorn)
```bash
pip install gunicorn
gunicorn -w 4 -b 127.0.0.1:5000 "backend.app:app"
```

> **Güvenlik Notları**: Canlı ortamda `FLASK_ENV=production` yapıldığından emin olun. Ayrıca uygulamanın HTTPS üzerinden hizmet vermesini sağlayın (Örn: Nginx reverse proxy ile Let's Encrypt). Böylece CSRF mekanizmaları ve `Secure Cookie` koruması tamamen aktif olacaktır.

## API Endpoint'leri

**Public Uç Noktalar:**
- `GET /api/profile` vb. (Read-only listelemeler)
- `POST /api/messages` (Ziyaretçi iletişim formu)

**Admin Uç Noktalar (Oturum & CSRF Gerektirir):**
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET/POST/PUT/DELETE` `education, courses, certificates, experiences, projects, skills, languages, messages, upload`

> Admin işlemlerindeki `POST`, `PUT`, `PATCH`, `DELETE` isteklerinde `X-CSRFToken` header ile istek atılması zorunludur.
