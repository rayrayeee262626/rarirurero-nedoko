"""Discover the existing Pages/D1 target using GET only. Never log raw API bodies."""
import json
import os
import re
import sys
import urllib.error
import urllib.request

API = 'https://api.cloudflare.com/client/v4'
PROJECT = 'rarirurero-nedoko'

class ConnectionFailure(Exception):
    pass

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ConnectionFailure('Unexpected API redirect; request stopped.')

def api_get(path, token):
    if not path.startswith('/') or '://' in path or '..' in path:
        raise ConnectionFailure('Invalid API path.')
    request = urllib.request.Request(API + path, headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json'})
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=30) as response:
            data = json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise ConnectionFailure(f'Cloudflare returned HTTP {error.code}; check token permissions or expiry.') from None
    except Exception:
        raise ConnectionFailure('Cloudflare request failed; response details withheld.') from None
    if not isinstance(data, dict) or data.get('success') is not True:
        raise ConnectionFailure('Cloudflare did not confirm success; response details withheld.')
    return data.get('result')

def discover(token):
    verified = api_get('/user/tokens/verify', token)
    if not isinstance(verified, dict) or verified.get('status') != 'active':
        raise ConnectionFailure('Token is not active.')
    accounts = []
    for page in range(1, 21):
        chunk = api_get(f'/accounts?per_page=50&page={page}', token)
        if not isinstance(chunk, list):
            raise ConnectionFailure('Cannot list accessible accounts.')
        accounts.extend(chunk)
        if len(chunk) < 50:
            break
    else:
        raise ConnectionFailure('Account list exceeded discovery limit.')
    candidates = []
    for account in accounts:
        account_id = account.get('id', '')
        if not re.fullmatch(r'[a-fA-F0-9]{32}', account_id):
            raise ConnectionFailure('Unexpected account identifier.')
        project = api_get(f'/accounts/{account_id}/pages/projects/{PROJECT}', token)
        if project:
            candidates.append((account_id, project))
    if len(candidates) != 1:
        raise ConnectionFailure('Expected exactly one accessible target Pages project; check account scope.')
    account_id, project = candidates[0]
    if project.get('name') != PROJECT or project.get('subdomain') != PROJECT + '.pages.dev':
        raise ConnectionFailure('Project identity mismatch.')
    production = project.get('deployment_configs', {}).get('production', {})
    database_id = production.get('d1_databases', {}).get('DB', {}).get('id', '')
    if not re.fullmatch(r'[a-fA-F0-9-]{36}', database_id):
        raise ConnectionFailure('Production D1 binding DB was not found.')
    database = api_get(f'/accounts/{account_id}/d1/database/{database_id}', token)
    if not isinstance(database, dict) or database.get('uuid') != database_id:
        raise ConnectionFailure('D1 metadata could not be verified.')
    # Internal result only. Never return token, env values, account name, or raw API objects.
    return {'account_id': account_id, 'database_id': database_id,
            'project': PROJECT, 'binding': 'DB',
            'git_integration': bool(project.get('source')),
            'production_deployment_exists': bool(project.get('canonical_deployment'))}

def main():
    token = os.environ.get('CLOUDFLARE_API_TOKEN', '').strip()
    if not token:
        raise ConnectionFailure('CLOUDFLARE_API_TOKEN is not registered or is unavailable to this run.')
    target = discover(token)
    summary = {'project': PROJECT, 'token_active': True, 'pages_metadata_read': True,
               'production_binding': 'DB', 'd1_metadata_read': True,
               'git_integration': target['git_integration'],
               'production_deployment_exists': target['production_deployment_exists'],
               'deployment_performed': False, 'database_modified': False,
               'full_backup_completed': False}
    text = json.dumps(summary, indent=2)
    print(text)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as file:
            file.write('## Cloudflare connection check\n\n```json\n' + text + '\n```\n')

if __name__ == '__main__':
    try:
        main()
    except ConnectionFailure as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print('Connection check failed; details withheld to protect credentials.', file=sys.stderr)
        sys.exit(1)
