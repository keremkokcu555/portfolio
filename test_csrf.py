import requests
import re
session = requests.Session()
login_page = session.get('http://127.0.0.1:5000/admin/login')
token_match = re.search(r'name="csrf-token" content="([^"]+)"', login_page.text)
token = token_match.group(1) if token_match else ''
print('Session cookies:', session.cookies.get_dict())
print('Token:', token)
res = session.post('http://127.0.0.1:5000/api/auth/login', json={'username':'admin', 'password':'wrong'}, headers={'X-CSRFToken': token})
print('Res:', res.status_code, res.text)
