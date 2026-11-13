"""Read the bound production BBS database, verify locally, and store authenticated ciphertext only."""
import base64
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import sys
import urllib.error
import urllib.request

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

spec = importlib.util.spec_from_file_location('cloudflare_connect', Path(__file__).with_name('cloudflare-connect.py'))
connect = importlib.util.module_from_spec(spec)
spec.loader.exec_module(connect)
MAX_BYTES = 32 * 1024 * 1024

def read_only_snapshot(target, token):
    # One SELECT gives a consistent SQLite statement snapshot of schema, all BBS
    # columns and the AUTOINCREMENT high-water mark. No remote write SQL exists.
    sql = """SELECT
      (SELECT json_group_array(json_object('type',type,'name',name,'sql',sql))
       FROM sqlite_schema WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*'
       AND name NOT GLOB '_cf_*') AS schema_json,
      (SELECT json_group_array(json_object('id',id,'parent_id',parent_id,'name',name,
        'message',message,'created_at',created_at,'ip_hash',ip_hash))
       FROM (SELECT * FROM bbs_posts ORDER BY id)) AS rows_json,
      (SELECT seq FROM sqlite_sequence WHERE name='bbs_posts') AS sequence_value"""
    path = f"/accounts/{target['account_id']}/d1/database/{target['database_id']}/query"
    request = urllib.request.Request(connect.API + path, method='POST',
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
        data=json.dumps({'sql': sql}).encode())
    try:
        with urllib.request.build_opener(connect.NoRedirect).open(request, timeout=60) as response:
            raw = response.read(MAX_BYTES + 1)
    except urllib.error.HTTPError as error:
        raise connect.ConnectionFailure(f'D1 read-only query returned HTTP {error.code}; no data-write request made.') from None
    if len(raw) > MAX_BYTES:
        raise connect.ConnectionFailure('Backup exceeds bounded response size.')
    result = json.loads(raw)
    if result.get('success') is not True or len(result.get('result', [])) != 1:
        raise connect.ConnectionFailure('D1 did not confirm a single read-only snapshot.')
    query = result['result'][0]
    if query.get('success') is not True or len(query.get('results', [])) != 1:
        raise connect.ConnectionFailure('D1 snapshot returned an unexpected row count.')
    row = query['results'][0]
    print('Read-only snapshot response received; public/private field values withheld.')
    if not all(key in row for key in ('schema_json', 'rows_json', 'sequence_value')):
        raise connect.ConnectionFailure('Snapshot result field names did not match the query.')
    schema = json.loads(row['schema_json'])
    rows = json.loads(row['rows_json'])
    return rebuild_snapshot(schema, rows, row['sequence_value'])


def rebuild_snapshot(schema, rows, sequence):
    tables = [obj for obj in schema if obj['type'] == 'table']
    if len(tables) != 1 or tables[0]['name'] != 'bbs_posts':
        raise connect.ConnectionFailure('Unexpected user tables; refusing to call a partial copy complete.')
    if any(obj['type'] not in ('table', 'index') for obj in schema):
        raise connect.ConnectionFailure('Unexpected schema objects; a reviewed backup extension is required.')
    db = sqlite3.connect(':memory:')
    try:
        db.enable_load_extension(False)
        db.set_authorizer(lambda action, *_: sqlite3.SQLITE_DENY if action in (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH) else sqlite3.SQLITE_OK)
        db.executescript(tables[0]['sql'])
        columns = {row[1] for row in db.execute('PRAGMA table_info(bbs_posts)')}
        expected = {'id', 'parent_id', 'name', 'message', 'created_at', 'ip_hash'}
        if columns != expected:
            raise connect.ConnectionFailure('BBS columns changed; refusing incomplete column capture.')
        for row in rows:
            if set(row) != expected or type(row['id']) is not int or not 0 < row['id'] <= 9007199254740991:
                raise connect.ConnectionFailure('Unexpected row fields or ID precision.')
            db.execute('INSERT INTO bbs_posts(id,parent_id,name,message,created_at,ip_hash) VALUES (?,?,?,?,?,?)',
                tuple(row[key] for key in ('id', 'parent_id', 'name', 'message', 'created_at', 'ip_hash')))
        max_id = max((row['id'] for row in rows), default=0)
        if sequence is not None:
            if type(sequence) is not int or not max_id <= sequence <= 9007199254740991:
                raise connect.ConnectionFailure('Invalid sequence high-water mark.')
            db.execute("DELETE FROM sqlite_sequence WHERE name='bbs_posts'")
            db.execute('INSERT INTO sqlite_sequence(name,seq) VALUES (?,?)', ('bbs_posts', sequence))
        elif rows:
            raise connect.ConnectionFailure('Missing AUTOINCREMENT state.')
        for obj in schema:
            if obj['type'] == 'index':
                db.executescript(obj['sql'])
        dump = ('\n'.join(db.iterdump()) + '\n').encode()
        if len(dump) > MAX_BYTES:
            raise connect.ConnectionFailure('Backup exceeds bounded SQL size.')
        if db.execute('SELECT count(*) FROM bbs_posts').fetchone()[0] != len(rows):
            raise connect.ConnectionFailure('Local row count mismatch.')
        keys = ('id', 'parent_id', 'name', 'message', 'created_at', 'ip_hash')
        restored = [dict(zip(keys, row)) for row in db.execute('SELECT id,parent_id,name,message,created_at,ip_hash FROM bbs_posts ORDER BY id')]
        if restored != sorted(rows, key=lambda row: row['id']):
            raise connect.ConnectionFailure('Restored private or public field differs from snapshot.')
        return dump
    finally:
        db.close()


def validate_sql(sql):
    db = sqlite3.connect(':memory:')
    try:
        db.enable_load_extension(False)
        def authorize(action, first, second, *_):
            if action in (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH):
                return sqlite3.SQLITE_DENY
            if action == sqlite3.SQLITE_FUNCTION and str(second or first).lower() in ('load_extension', 'readfile', 'writefile'):
                return sqlite3.SQLITE_DENY
            return sqlite3.SQLITE_OK
        db.set_authorizer(authorize)
        ticks = 0
        def progress():
            nonlocal ticks
            ticks += 1
            return int(ticks > 100000)
        db.set_progress_handler(progress, 1000)
        db.executescript(sql.decode('utf-8'))
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok' or db.execute('PRAGMA foreign_key_check').fetchall():
            raise ValueError('Restored database integrity check failed')
        columns = {row[1] for row in db.execute('PRAGMA table_info(bbs_posts)')}
        required = {'id', 'parent_id', 'name', 'message', 'created_at', 'ip_hash'}
        if not required.issubset(columns):
            raise ValueError('Expected BBS schema not present')
        orphaned = db.execute('SELECT count(*) FROM bbs_posts r LEFT JOIN bbs_posts p ON p.id=r.parent_id WHERE r.parent_id IS NOT NULL AND (p.id IS NULL OR p.parent_id IS NOT NULL)').fetchone()[0]
        if orphaned:
            raise ValueError('Invalid BBS reply relationship')
        indexes = {row[1] for row in db.execute('PRAGMA index_list(bbs_posts)')}
        if not {'bbs_posts_roots', 'bbs_posts_rate'}.issubset(indexes):
            raise ValueError('Expected BBS indexes not present')
        total, roots = db.execute('SELECT count(*),sum(parent_id IS NULL) FROM bbs_posts').fetchone()
        return {'posts': int(roots or 0), 'replies': total - int(roots or 0), 'total': total,
                'integrity_ok': True, 'relationships_ok': True, 'expected_indexes_present': True}
    finally:
        db.close()

def seal(payload, secret):
    salt = os.urandom(32)
    key = HKDF(algorithm=hashes.SHA256(), length=32, salt=salt, info=b'nedoko-d1-backup-v1').derive(secret.encode())
    encrypted = Fernet(base64.urlsafe_b64encode(key)).encrypt(payload)
    return json.dumps({'format': 'nedoko-d1-encrypted-v1', 'salt': base64.b64encode(salt).decode(), 'ciphertext': encrypted.decode()}).encode()

def unseal(blob, secret):
    data = json.loads(blob)
    if data.get('format') != 'nedoko-d1-encrypted-v1':
        raise ValueError('Unsupported encrypted backup')
    key = HKDF(algorithm=hashes.SHA256(), length=32, salt=base64.b64decode(data['salt']), info=b'nedoko-d1-backup-v1').derive(secret.encode())
    return Fernet(base64.urlsafe_b64encode(key)).decrypt(data['ciphertext'].encode())

def main():
    os.umask(0o077)
    token = os.environ.get('CLOUDFLARE_API_TOKEN', '').strip()
    account = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '').strip()
    if not token or not account:
        raise connect.ConnectionFailure('Missing registered Cloudflare credentials or account identifier.')
    target = connect.discover(token, account)
    print('Backup stage: production binding verified.')
    sql = read_only_snapshot(target, token)
    print('Backup stage: SQL reconstructed locally.')
    verification = validate_sql(sql)
    print('Backup stage: local SQLite restore verified.')
    key_source = 'D1_BACKUP_KEY' if os.environ.get('D1_BACKUP_KEY') else 'CLOUDFLARE_API_TOKEN'
    secret = os.environ[key_source].strip()
    if len(secret) < 32:
        raise connect.ConnectionFailure('Backup encryption secret must have at least 32 characters.')
    payload = json.dumps({'format': 'nedoko-d1-snapshot-v1', 'captured_at': datetime.now(timezone.utc).isoformat(),
        'target': target, 'capture_method': 'single-read-only-select', 'sql_sha256': hashlib.sha256(sql).hexdigest(),
        'sql_base64': base64.b64encode(sql).decode(), 'verification': verification}, separators=(',', ':')).encode()
    encrypted = seal(payload, secret)
    recovered = unseal(encrypted, secret)
    if recovered != payload:
        raise connect.ConnectionFailure('Encryption roundtrip verification failed.')
    restored = base64.b64decode(json.loads(recovered)['sql_base64'])
    if validate_sql(restored) != verification:
        raise connect.ConnectionFailure('Encrypted backup restoration check failed.')
    output = Path(os.environ['BACKUP_OUTPUT'])
    output.mkdir(parents=True, exist_ok=False, mode=0o700)
    (output / 'database.encrypted.json').write_bytes(encrypted)
    digest = hashlib.sha256(encrypted).hexdigest()
    (output / 'database.encrypted.sha256').write_text(f'{digest}  database.encrypted.json\n')
    (output / 'README.txt').write_text(f'Encrypted full BBS application schema and data captured by one read-only SELECT. Authenticated encryption verified; restored in SQLite memory only.\nRecovery secret: GitHub Actions secret {key_source} as it existed at capture time.\nKeep this secret available. Before rotating/deleting it, preserve or re-encrypt old backups.\nNever publish decrypted SQL; no production restore has been performed.\n')
    summary = {'application_database_backup_saved_encrypted': True, 'capture_method': 'single-read-only-select', 'encryption_roundtrip_ok': True,
               'local_sqlite_restore_ok': True, **verification, 'recovery_secret': key_source,
               'production_restore_performed': False, 'deployment_performed': False}
    text = json.dumps(summary, indent=2)
    print(text)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as file:
            file.write('## Encrypted D1 backup\n\n```json\n' + text + '\n```\n\nArtifact retention: 90 days.\nRecovery requires the same registered secret used at capture time.\n')

if __name__ == '__main__':
    try:
        main()
    except connect.ConnectionFailure as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception as error:
        print(f'D1 backup failed ({type(error).__name__}); API responses, URLs, SQL and credentials withheld. No production restore was attempted.', file=sys.stderr)
        sys.exit(1)
