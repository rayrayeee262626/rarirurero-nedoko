"""Export the bound production D1, verify locally, and store authenticated ciphertext only."""
import base64
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

spec = importlib.util.spec_from_file_location('cloudflare_connect', Path(__file__).with_name('cloudflare-connect.py'))
connect = importlib.util.module_from_spec(spec)
spec.loader.exec_module(connect)
MAX_BYTES = 32 * 1024 * 1024

def export_request(target, token, bookmark=None):
    path = f"/accounts/{target['account_id']}/d1/database/{target['database_id']}/export"
    body = {'output_format': 'polling'}
    if bookmark:
        body['current_bookmark'] = bookmark
    request = urllib.request.Request(connect.API + path, method='POST',
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
        data=json.dumps(body).encode())
    try:
        with urllib.request.build_opener(connect.NoRedirect).open(request, timeout=30) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        raise connect.ConnectionFailure(f'D1 export returned HTTP {error.code}; no restore or data-write request was made.') from None
    if not isinstance(result, dict) or result.get('success') is not True:
        raise connect.ConnectionFailure('D1 export was not successful; response withheld.')
    return result['result']

def export_sql(target, token):
    bookmark = None
    for _ in range(90):
        result = export_request(target, token, bookmark)
        if result.get('status') == 'error':
            raise connect.ConnectionFailure('D1 reported an export error; details withheld.')
        if result.get('status') == 'complete':
            url = result.get('result', {}).get('signed_url', '')
            parsed = urllib.parse.urlparse(url)
            if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
                raise connect.ConnectionFailure('Invalid export download URL.')
            # Signed URL from Cloudflare: a separate request, with NO API Authorization header.
            with urllib.request.build_opener(connect.NoRedirect).open(url, timeout=60) as response:
                sql = response.read(MAX_BYTES + 1)
            if not sql or len(sql) > MAX_BYTES:
                raise connect.ConnectionFailure('Export empty or beyond bounded backup size.')
            return sql, result.get('at_bookmark') or bookmark
        bookmark = result.get('at_bookmark') or bookmark
        if not bookmark:
            raise connect.ConnectionFailure('Export did not return a polling bookmark.')
        time.sleep(2)
    raise connect.ConnectionFailure('Export polling timed out; no completed backup published.')

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
    sql, bookmark = export_sql(target, token)
    verification = validate_sql(sql)
    key_source = 'D1_BACKUP_KEY' if os.environ.get('D1_BACKUP_KEY') else 'CLOUDFLARE_API_TOKEN'
    secret = os.environ[key_source].strip()
    if len(secret) < 32:
        raise connect.ConnectionFailure('Backup encryption secret must have at least 32 characters.')
    payload = json.dumps({'format': 'nedoko-d1-snapshot-v1', 'captured_at': datetime.now(timezone.utc).isoformat(),
        'target': target, 'bookmark': bookmark, 'sql_sha256': hashlib.sha256(sql).hexdigest(),
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
    (output / 'README.txt').write_text(f'Encrypted full D1 SQL export. Authenticated encryption verified; restored in SQLite memory only.\nRecovery secret: GitHub Actions secret {key_source} as it existed at capture time.\nKeep this secret available. Before rotating/deleting it, preserve or re-encrypt old backups.\nNever publish decrypted SQL; no production restore has been performed.\n')
    summary = {'full_d1_export_saved_encrypted': True, 'encryption_roundtrip_ok': True,
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
    except Exception:
        print('D1 backup failed; API responses, URLs, SQL and credentials withheld. No production restore was attempted.', file=sys.stderr)
        sys.exit(1)
