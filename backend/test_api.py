import requests
import json

BASE_URL = "http://127.0.0.1:5000/api"

print("=== API Routes Test ===\n")

endpoints = [
    ("GET", "/profile", None),
    ("GET", "/education", None),
    ("GET", "/courses", None),
    ("GET", "/certificates", None),
    ("GET", "/experiences", None),
    ("GET", "/projects", None),
    ("GET", "/skills", None),
    ("GET", "/languages", None),
    ("GET", "/counts", None),
]

for method, endpoint, data in endpoints:
    try:
        if method == "GET":
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=2)
        else:
            response = requests.post(f"{BASE_URL}{endpoint}", json=data, timeout=2)
        
        status = "✓" if response.status_code == 200 else "✗"
        print(f"{status} {method} {endpoint}: {response.status_code}")
        if response.status_code != 200:
            print(f"  Error: {response.text[:100]}")
    except Exception as e:
        print(f"✗ {method} {endpoint}: {str(e)[:50]}")

print("\nFlask server ayakta olmadığı için bağlantı hatası görülebilir.")
print("Backend'i `python app.py` ile çalıştırıp test edin.")
