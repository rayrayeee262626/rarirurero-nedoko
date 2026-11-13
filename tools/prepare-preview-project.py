"""Create/verify ONLY the separate preview project. Never alter production."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import urllib.request

spec = importlib.util.spec_from_file_location('connect', Path(__file__).with_name('cloudflare-connect.py'))
connect = importlib.util.module_from_spec(spec)
spec.loader.exec_module(connect)
PREVIEW = 'rarirurero-nedoko-preview'

def check_isolation(project):
    if project.get('name') != PREVIEW or project.get('production_branch') != 'preview':
        raise connect.ConnectionFailure('Preview project identity or branch mismatch; stopped.')
    if project.get('source'):
        raise connect.ConnectionFailure('Preview must use explicit direct upload.')
    for configuration in project.get('deployment_configs', {}).values():
        for key in ('d1_databases', 'kv_namespaces', 'r2_buckets', 'service_bindings', 'env_vars', 'durable_object_namespaces'):
            if configuration.get(key):
                raise connect.ConnectionFailure('Preview has unexpected bindings or variables; stopped without changing them.')

def main():
    token = os.environ['CLOUDFLARE_API_TOKEN'].strip()
    account = os.environ['CLOUDFLARE_ACCOUNT_ID'].strip()
    connect.discover(token, account)
    path = f'/accounts/{account}/pages/projects/{PREVIEW}'
    project = connect.api_get(path, token)
    if project is None:
        request = urllib.request.Request(connect.API + f'/accounts/{account}/pages/projects', method='POST',
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
            data=json.dumps({'name': PREVIEW, 'production_branch': 'preview', 'deployment_configs': {'production': {}, 'preview': {}}}).encode())
        with urllib.request.build_opener(connect.NoRedirect).open(request, timeout=30) as response:
            result = json.load(response)
        if result.get('success') is not True:
            raise connect.ConnectionFailure('Preview project creation did not succeed.')
        project = result['result']
    check_isolation(project)
    print('Separate preview project verified. No database binding or production settings changed.')

if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('Preview project preparation failed; details withheld to protect credentials. No production changes.', file=sys.stderr)
        sys.exit(1)
