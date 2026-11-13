"""Deploy only approved dist files, preserve bindings, and verify without posting."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.request

spec = importlib.util.spec_from_file_location('connect', Path(__file__).with_name('cloudflare-connect.py'))
connect = importlib.util.module_from_spec(spec)
spec.loader.exec_module(connect)
ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://rarirurero-nedoko.pages.dev'

def fingerprint(project):
    config = project.get('deployment_configs', {}).get('production', {})
    # Compare binding/variable values in memory, output only a pass/fail result.
    selected = {key: config.get(key) for key in ('d1_databases', 'env_vars', 'kv_namespaces', 'r2_buckets', 'service_bindings')}
    return hashlib.sha256(json.dumps(selected, sort_keys=True).encode()).hexdigest()

def check_project(project):
    if project.get('name') != connect.PROJECT or project.get('subdomain') != connect.PROJECT + '.pages.dev':
        raise connect.ConnectionFailure('Production identity mismatch.')
    branch = project.get('production_branch')
    if not isinstance(branch, str) or not re.fullmatch(r'[\w./-]+', branch):
        raise connect.ConnectionFailure('Production branch could not be safely identified.')
    old = project.get('canonical_deployment', {}).get('id', '')
    if not re.fullmatch(r'[a-fA-F0-9-]{36}', old):
        raise connect.ConnectionFailure('No verified existing deployment to roll back to.')
    env = project.get('deployment_configs', {}).get('production', {}).get('env_vars', {})
    if not all(name in env for name in ('TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET')):
        raise connect.ConnectionFailure('Expected Turnstile variable names not present.')
    return branch, old

def approved_files():
    release = json.loads((ROOT / 'deployment/approved-release.json').read_text())
    if release['project'] != connect.PROJECT:
        raise connect.ConnectionFailure('Release target mismatch.')
    files = release['files']
    if set(files) != {p.name for p in (ROOT / 'dist').iterdir()}:
        raise connect.ConnectionFailure('Release output file set mismatch.')
    for name, digest in files.items():
        data = (ROOT / 'dist' / name).read_bytes()
        if hashlib.sha256(data).hexdigest() != digest:
            raise connect.ConnectionFailure('Output differs from approved release.')
        if name.endswith('.html') and (b'preview-banner' in data or b'noindex' in data):
            raise connect.ConnectionFailure('Preview-only page detected in production output.')
    worker = (ROOT / 'dist/_worker.js').read_text()
    if 'env.DB' not in worker or '試作版のサンプル' in worker:
        raise connect.ConnectionFailure('Production BBS worker missing or substituted.')
    return files

def public_get(path):
    with urllib.request.urlopen(urllib.request.Request(SITE + path, headers={'Cache-Control': 'no-cache'}), timeout=30) as response:
        if response.status != 200 or not response.url.startswith(SITE + '/'):
            raise connect.ConnectionFailure('Unexpected public response.')
        return response.read()

def public_posts(data):
    return {(kind, row['id']): row for kind in ('posts', 'replies') for row in data[kind]}

def verify_public(files, config_before, posts_before):
    for name, digest in files.items():
        if name == '_worker.js':
            continue
        path = '/' if name == 'index.html' else '/' + (name[:-5] if name.endswith('.html') else name)
        if hashlib.sha256(public_get(path)).hexdigest() != digest:
            raise connect.ConnectionFailure('Published file does not yet match approved release.')
    config_after = json.loads(public_get('/api/bbs/config'))
    if config_after != config_before or config_after.get('ready') is not True:
        raise connect.ConnectionFailure('BBS readiness or Turnstile configuration changed.')
    after = public_posts(json.loads(public_get('/api/bbs')))
    if any(after.get(key) != row for key, row in posts_before.items()):
        raise connect.ConnectionFailure('Previously visible BBS rows differ after release.')

def rollback(account, token, old):
    request = urllib.request.Request(connect.API + f'/accounts/{account}/pages/projects/{connect.PROJECT}/deployments/{old}/rollback',
        method='POST', headers={'Authorization': 'Bearer ' + token})
    with urllib.request.build_opener(connect.NoRedirect).open(request, timeout=30) as response:
        result = json.load(response)
    if result.get('success') is not True:
        raise connect.ConnectionFailure('Automatic rollback did not confirm success; inspect deployment history.')
    print('Previous production deployment restored. No database restore or mutation performed.')

def main():
    files = approved_files()
    backup = Path(os.environ['BACKUP_OUTPUT'])
    encrypted = backup / 'database.encrypted.json'
    if not encrypted.is_file() or time.time() - encrypted.stat().st_mtime > 600:
        raise connect.ConnectionFailure('A fresh encrypted backup is required before deployment.')
    if hashlib.sha256(encrypted.read_bytes()).hexdigest() != (backup / 'database.encrypted.sha256').read_text().split()[0]:
        raise connect.ConnectionFailure('Pre-release backup checksum mismatch.')
    token = os.environ['CLOUDFLARE_API_TOKEN'].strip()
    account = os.environ['CLOUDFLARE_ACCOUNT_ID'].strip()
    target = connect.discover(token, account)
    path = f'/accounts/{account}/pages/projects/{connect.PROJECT}'
    before = connect.api_get(path, token)
    branch, old = check_project(before)
    settings = fingerprint(before)
    config_before = json.loads(public_get('/api/bbs/config'))
    if config_before.get('ready') is not True:
        raise connect.ConnectionFailure('BBS was not ready before release; stopped.')
    posts_before = public_posts(json.loads(public_get('/api/bbs')))
    print('Approved files, backup, production target, rollback target and BBS readiness verified.')
    command = ['npm', 'exec', '--yes', '--package=wrangler@4.143.0', '--', 'wrangler', 'pages', 'deploy', 'dist',
               '--project-name=' + connect.PROJECT, '--branch=' + branch]
    result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=240)
    if result.returncode:
        current = connect.api_get(path, token)
        if current.get('canonical_deployment', {}).get('id') != old:
            rollback(account, token, old)
        raise connect.ConnectionFailure('Production upload did not succeed; tool output withheld to protect settings.')
    try:
        after = connect.api_get(path, token)
        if fingerprint(after) != settings or after.get('production_branch') != branch:
            raise connect.ConnectionFailure('Production bindings or variable values changed.')
        for attempt in range(8):
            try:
                verify_public(files, config_before, posts_before)
                break
            except Exception:
                if attempt == 7:
                    raise
                time.sleep(5)
    except Exception:
        rollback(account, token, old)
        raise connect.ConnectionFailure('Post-deployment verification failed; previous deployment restored.') from None
    summary = {'production_release_verified': True, 'public_files_match_approved_release': True,
               'bindings_and_variables_unchanged': True, 'bbs_ready': True,
               'previously_visible_posts_unchanged': True, 'database_mutations_performed': False,
               'rollback_deployment_id': old, 'deployment_id': after.get('canonical_deployment', {}).get('id')}
    text = json.dumps(summary, indent=2)
    print(text)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as file:
            file.write('## Production release verified\n\n```json\n' + text + '\n```\n')

if __name__ == '__main__':
    try:
        main()
    except connect.ConnectionFailure as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Production release stopped; settings, post content and credentials withheld.', file=sys.stderr)
        sys.exit(1)
