from app import app
from services.cv_service import create_item, list_items
with app.app_context():
    created = create_item('projects', {'title':'Zamanli Test','description':'test'})
    print('created:', created)
    projects = list_items('projects')
    print('latest created_at:', projects[-1].get('created_at'))
