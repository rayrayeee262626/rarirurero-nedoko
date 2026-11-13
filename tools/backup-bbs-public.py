"""Read-only rescue copy of public BBS rows. NOT a full D1 backup."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
from datetime import datetime, timezone

ENDPOINT = 'https://rarirurero-nedoko.pages.dev/api/bbs'

def fetch_page(before):
    url = ENDPOINT + (f'?before={before}' if before else '')
    result = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--max-time', '30', url], capture_output=True)
    if result.returncode:
        raise RuntimeError('Public BBS GET failed; no completed backup was written.')
    try:
        return json.loads(result.stdout)
    except (ValueError, UnicodeError):
        raise RuntimeError('BBS returned invalid JSON.') from None

def valid_id(value):
    return type(value) is int and value > 0

def collect():
    roots, replies, seen_cursors = {}, {}, set()
    before = None
    possible_reply_truncation = False
    pages = 0
    while True:
        data = fetch_page(before)
        pages += 1
        if not isinstance(data, dict) or not isinstance(data.get('posts'), list) or not isinstance(data.get('replies'), list):
            raise ValueError('Unexpected response shape')
        page_ids = set()
        for row in data['posts']:
            if not isinstance(row, dict) or not valid_id(row.get('id')):
                raise ValueError('Invalid root ID')
            if before and row['id'] >= before:
                raise ValueError('Pagination did not move backwards')
            public = {key: row[key] for key in ('id', 'name', 'message', 'created_at')}
            if not all(isinstance(public[key], str) for key in ('name', 'message', 'created_at')):
                raise ValueError('Invalid root fields')
            if public['id'] in roots:
                raise ValueError('Duplicate root ID')
            roots[public['id']] = public
            page_ids.add(public['id'])
        possible_reply_truncation |= len(data['replies']) >= 200
        for row in data['replies']:
            if not isinstance(row, dict) or not valid_id(row.get('id')) or row.get('parent_id') not in page_ids:
                raise ValueError('Invalid reply relationship')
            public = {key: row[key] for key in ('id', 'parent_id', 'name', 'message', 'created_at')}
            if not all(isinstance(public[key], str) for key in ('name', 'message', 'created_at')):
                raise ValueError('Invalid reply fields')
            if public['id'] in replies or public['id'] in roots:
                raise ValueError('Duplicate reply ID')
            replies[public['id']] = public
        cursor = data.get('nextBefore')
        if cursor is None:
            break
        if not valid_id(cursor) or not page_ids or cursor != min(page_ids) or cursor in seen_cursors:
            raise ValueError('Invalid next-page cursor')
        seen_cursors.add(cursor)
        before = cursor
        if pages >= 10000:
            raise ValueError('Page limit reached; refusing an incomplete completed copy')
    if set(roots) & set(replies):
        raise ValueError('IDs collide across root and reply pages')
    return {
        'format': 'nedoko-public-rescue-v1',
        'captured_at': datetime.now(timezone.utc).isoformat(),
        'source': ENDPOINT,
        'full_d1_backup': False,
        'atomic_snapshot': False,
        'possible_reply_truncation': possible_reply_truncation,
        'missing': ['ip_hash', 'database schema', 'other D1 tables', 'Cloudflare configuration'],
        'pages': pages,
        'posts': sorted(roots.values(), key=lambda row: row['id']),
        'replies': sorted(replies.values(), key=lambda row: row['id']),
    }

def verify_into_memory(data):
    if data.get('format') != 'nedoko-public-rescue-v1' or data.get('full_d1_backup') is not False:
        raise ValueError('Unsupported backup format')
    db = sqlite3.connect(':memory:')
    try:
        db.execute('PRAGMA foreign_keys=ON')
        # Separate recovery table: never generate SQL to replace production bbs_posts.
        db.execute('CREATE TABLE recovered_public_posts (id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES recovered_public_posts(id), name TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL)')
        for row in data['posts']:
            db.execute('INSERT INTO recovered_public_posts VALUES (?,NULL,?,?,?)', (row['id'], row['name'], row['message'], row['created_at']))
        for row in data['replies']:
            db.execute('INSERT INTO recovered_public_posts VALUES (?,?,?,?,?)', (row['id'], row['parent_id'], row['name'], row['message'], row['created_at']))
        expected = len(data['posts']) + len(data['replies'])
        assert db.execute('SELECT count(*) FROM recovered_public_posts').fetchone()[0] == expected
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert db.execute('PRAGMA foreign_key_check').fetchall() == []
        restored = db.execute('SELECT id,parent_id,name,message,created_at FROM recovered_public_posts ORDER BY id').fetchall()
        original = sorted([(r['id'], None, r['name'], r['message'], r['created_at']) for r in data['posts']] + [(r['id'], r['parent_id'], r['name'], r['message'], r['created_at']) for r in data['replies']])
        assert restored == original
    finally:
        db.close()

def save(directory):
    os.umask(0o077)
    directory = directory.expanduser().resolve()
    repo = Path(__file__).resolve().parents[1]
    if directory.is_relative_to(repo):
        raise ValueError('Backups must be stored outside the public source repository')
    data = collect()
    verify_into_memory(data)
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    target = Path(tempfile.mkdtemp(prefix='bbs-public-', dir=directory))
    payload = (json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode()
    (target / 'snapshot.json').write_bytes(payload)
    digest = hashlib.sha256(payload).hexdigest()
    (target / 'snapshot.sha256').write_text(f'{digest}  snapshot.json\n')
    (target / 'README.txt').write_text('PUBLIC RESCUE COPY ONLY. Not a full D1 backup; not an atomic snapshot.\nMissing private columns, schema and configuration. Replies may be capped by the public API.\nKeep an independent protected copy. Do not import into production.\n')
    print(f'Public rescue copy saved: {target}')
    print(f"Root posts: {len(data['posts'])}; replies: {len(data['replies'])}; pages: {data['pages']}")
    print('Checksum and in-memory restore verified. Full D1 backup: NOT COMPLETE.')
    if data['possible_reply_truncation']:
        print('WARNING: API reply limit reached; some replies may be missing.')

def verify(path):
    payload = path.read_bytes()
    digest = path.with_name('snapshot.sha256').read_text().split()[0]
    if hashlib.sha256(payload).hexdigest() != digest:
        raise ValueError('Checksum mismatch')
    verify_into_memory(json.loads(payload))
    print('Checksum, public text fields and parent/reply relationships restored and verified in memory. No remote writes.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('save').add_argument('--directory', type=Path, required=True)
    sub.add_parser('verify').add_argument('snapshot', type=Path)
    args = parser.parse_args()
    try:
        save(args.directory) if args.command == 'save' else verify(args.snapshot)
    except Exception:
        raise SystemExit('Backup operation failed; no production changes. Details and post contents were withheld from output.') from None
