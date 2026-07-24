import requests
import re

session = requests.Session()
res = session.get('http://127.0.0.1:5000/')
print('Public:', res.status_code)

res = session.post('http://127.0.0.1:5000/api/messages', json={'name':'Test','email':'t@t.com','subject':'S','message':'M'})
print('Messages (Public POST):', res.status_code)

res = session.post('http://127.0.0.1:5000/api/projects', json={'title': 'Test'})
print('Admin POST Without Token:', res.status_code)

login_page = session.get('http://127.0.0.1:5000/admin/login')
token_match = re.search(r'name="csrf-token" content="([^"]+)"', login_page.text)
token = token_match.group(1) if token_match else ''
print('Found CSRF:', bool(token))

res = session.post('http://127.0.0.1:5000/api/auth/login', json={'username':'admin', 'password':'wrong'}, headers={'X-CSRFToken': token})
print('Wrong login with Token:', res.status_code)
