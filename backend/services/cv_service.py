import os
from services.db import get_db
from models.schemas import REQUIRED_FIELDS

UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'static', 'uploads'))

def is_file_used_in_db(filepath):
    db = get_db()
    # Check profile
    profile = db.execute('SELECT 1 FROM profile WHERE profile_photo = ? OR cv_pdf = ?', (filepath, filepath)).fetchone()
    if profile: return True
    # Check projects
    project = db.execute('SELECT 1 FROM projects WHERE image = ?', (filepath,)).fetchone()
    if project: return True
    # Check certificates
    cert = db.execute('SELECT 1 FROM certificates WHERE image = ? OR pdf = ?', (filepath, filepath)).fetchone()
    if cert: return True
    return False

def delete_file_if_exists(filepath):
    if filepath and isinstance(filepath, str) and filepath.startswith('/static/uploads/'):
        filename = filepath.split('/static/uploads/')[-1]
        # Prevent path traversal
        if '..' in filename or filename.startswith('/') or filename.startswith('\\'):
            return
            
        if is_file_used_in_db(filepath):
            return
            
        full_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
            except Exception:
                pass


def row_to_dict(row):
    if row is None:
        return {}
    return {k: row[k] for k in row.keys()}


def get_profile():
    db = get_db()
    profile = row_to_dict(db.execute('SELECT * FROM profile WHERE id = 1').fetchone())
    
    # Try fetching total_likes safely in case the table is missing for some reason
    try:
        likes = db.execute('SELECT COUNT(*) as cnt FROM portfolio_likes').fetchone()
        profile['total_likes'] = likes['cnt'] if likes else 0
    except Exception:
        profile['total_likes'] = 0
        
    return profile

def update_profile(payload):
    fields = [
        'name', 'title', 'summary', 'profile_photo',
        'email', 'phone', 'city', 'address',
        'github', 'linkedin', 'website', 'instagram', 'x', 'youtube', 'cv_pdf'
    ]
    values = [payload.get(field, '') for field in fields]
    db = get_db()
    old_row = db.execute('SELECT * FROM profile WHERE id = 1').fetchone()
    if old_row:
        if 'profile_photo' in old_row.keys() and 'profile_photo' in payload and old_row['profile_photo'] != payload['profile_photo']:
            delete_file_if_exists(old_row['profile_photo'])
        if 'cv_pdf' in old_row.keys() and 'cv_pdf' in payload and old_row['cv_pdf'] != payload['cv_pdf']:
            delete_file_if_exists(old_row['cv_pdf'])
            
    db.execute(
        '''UPDATE profile SET
           name = ?, title = ?, summary = ?, profile_photo = ?,
           email = ?, phone = ?, city = ?, address = ?,
           github = ?, linkedin = ?, website = ?, instagram = ?, x = ?, youtube = ?, cv_pdf = ?,
           last_updated = datetime('now', 'localtime')
           WHERE id = 1''',
        values
    )
    db.commit()
    return get_profile()


def list_items(table_name):
    db = get_db()
    rows = db.execute(f'SELECT * FROM {table_name} ORDER BY order_index ASC, id ASC').fetchall()
    return [row_to_dict(row) for row in rows]


def create_item(table_name, payload):
    missing = [field for field in REQUIRED_FIELDS.get(table_name, []) if not payload.get(field)]
    if missing:
        raise ValueError(f'Missing fields: {", ".join(missing)}')
    keys = list(payload.keys())
    if not keys:
        raise ValueError('Payload cannot be empty')
    columns = ', '.join(keys) + ', created_at'
    placeholders = ', '.join('?' for _ in keys) + ", datetime('now', 'localtime')"
    values = [payload[key] for key in keys]
    db = get_db()
    db.execute(f'INSERT INTO {table_name} ({columns}) VALUES ({placeholders})', values)
    db.commit()
    return row_to_dict(db.execute(f'SELECT * FROM {table_name} WHERE id = last_insert_rowid()').fetchone())


def update_item(table_name, item_id, payload):
    updates = [f"{key} = ?" for key in payload.keys() if key != 'id']
    if not updates:
        raise ValueError('No fields to update')
    # Automatically set updated_at to current time
    updates.append("updated_at = datetime('now', 'localtime')")
    values = [payload[key] for key in payload.keys() if key != 'id']
    values.append(item_id)
    db = get_db()
    old_row = db.execute(f'SELECT * FROM {table_name} WHERE id = ?', (item_id,)).fetchone()
    if old_row:
        for field in ['image', 'pdf', 'profile_photo']:
            if field in old_row.keys() and field in payload:
                if old_row[field] != payload[field]:
                    delete_file_if_exists(old_row[field])
                    
    db.execute(f'UPDATE {table_name} SET {", ".join(updates)} WHERE id = ?', values)
    db.commit()
    return row_to_dict(db.execute(f'SELECT * FROM {table_name} WHERE id = ?', (item_id,)).fetchone())


def delete_item(table_name, item_id):
    db = get_db()
    old_row = db.execute(f'SELECT * FROM {table_name} WHERE id = ?', (item_id,)).fetchone()
    if old_row:
        for field in ['image', 'pdf', 'profile_photo']:
            if field in old_row.keys():
                delete_file_if_exists(old_row[field])
                
    db.execute(f'DELETE FROM {table_name} WHERE id = ?', (item_id,))
    db.commit()
    return {'success': True, 'id': item_id}


def get_counts():
    db = get_db()
    tables = {
        'projects': 'Projeler',
        'certificates': 'Sertifikalar',
        'experiences': 'Deneyimler',
        'skills': 'Yetenekler'
    }
    counts = {}
    for table, label in tables.items():
        cursor = db.execute(f'SELECT COUNT(*) FROM {table}')
        count = cursor.fetchone()[0]
        counts[table] = {
            'label': label,
            'count': count
        }
    return counts

