# Portfolio Proje Yapısı

Proje backend ve frontend bölümlerine ayrılmıştır.

## 📁 Yapı

```
portfolio/
├── backend/                    # Backend uygulaması (Flask)
│   ├── app.py                 # Flask ana uygulaması
│   ├── database.py            # Veritabanı şemaları
│   ├── requirements.txt       # Python bağımlılıkları
│   ├── models/
│   │   └── schemas.py         # Veritabanı modelleri
│   ├── routes/
│   │   ├── __init__.py
│   │   └── cv_routes.py       # API rotaları
│   ├── services/
│   │   ├── __init__.py
│   │   ├── db.py              # Veritabanı işlemleri
│   │   └── cv_service.py      # İş mantığı
│   ├── data/                  # Veritabanı ve veri dosyaları
│   └── tmp_*.py               # Geçici test dosyaları
│
├── frontend/                  # Frontend uygulaması
│   ├── static/               # Statik dosyalar
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       └── app.js
│   └── templates/            # HTML şablonları
│       └── index.html
│
├── README.md                 # Proje açıklaması
└── PROJECT_STRUCTURE.md      # Bu dosya

```

## 🚀 Backend Çalıştırma

1. Requirements yükleyin:
```bash
cd backend
pip install -r requirements.txt
```

2. Uygulamayı çalıştırın:
```bash
python app.py
```

3. Tarayıcıda açın:
```
http://127.0.0.1:5000
```

## 🌐 Frontend Yapısı

- **HTML Şablonları**: `frontend/templates/` - Flask tarafından yüklenir
- **Statik Dosyalar**: `frontend/static/` - CSS ve JavaScript dosyaları
- Backend yapılandırması: `../frontend/templates` ve `../frontend/static` yollarını kullanır

## 📝 Önemli Notlar

- Template ve static dosyaları backend/app.py tarafından otomatik olarak frontend klasöründen yüklenir
- Veritabanı dosyası: `backend/data/cv.db`
- GitHub'a yükleme: Tüm proje `portfolio/` klasöründen gönderilir

## 🔧 Backend İmportları

Backend bölümündeki Python dosyaları iç importları kullansın (örn: `from models.schemas import ...`)
