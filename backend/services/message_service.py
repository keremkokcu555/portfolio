from services.db import get_db

def row_to_dict(row):
    if row is None:
        return {}
    return {k: row[k] for k in row.keys()}

def get_messages():
    db = get_db()
    rows = db.execute('SELECT * FROM messages ORDER BY id DESC').fetchall()
    return [row_to_dict(row) for row in rows]

def get_message_by_id(message_id):
    db = get_db()
    row = db.execute('SELECT * FROM messages WHERE id = ?', (message_id,)).fetchone()
    return row_to_dict(row) if row else None

def create_message(name, email, subject, message):
    db = get_db()
    db.execute(
        'INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
        (name, email, subject, message)
    )
    db.commit()

def mark_message_as_read(message_id):
    db = get_db()
    db.execute('UPDATE messages SET is_read = 1 WHERE id = ?', (message_id,))
    db.commit()

def delete_message(message_id):
    db = get_db()
    db.execute('DELETE FROM messages WHERE id = ?', (message_id,))
    db.commit()

def get_messages_count():
    db = get_db()
    total = db.execute('SELECT COUNT(*) as count FROM messages').fetchone()['count']
    unread = db.execute('SELECT COUNT(*) as count FROM messages WHERE is_read = 0').fetchone()['count']
    return {'total': total, 'unread': unread}
