"""Read-only checks through existing Actions credential. Never prints secret values."""
import json,os,re,urllib.request,urllib.error
from pathlib import Path
account=os.environ['CLOUDFLARE_ACCOUNT_ID'];token=os.environ['CLOUDFLARE_API_TOKEN']
base='https://api.cloudflare.com/client/v4/accounts/'+account
public_token=re.search(r"token:'([^']+)'",(Path(__file__).resolve().parents[2]/'managed-sites/print-pon/analytics.js').read_text()).group(1)
def request(path,body=None):
 req=urllib.request.Request(base+path,data=body,headers={'Authorization':'Bearer '+token,'Content-Type':'text/plain' if body else 'application/json'},method='POST' if body else 'GET')
 try:
  with urllib.request.urlopen(req,timeout=40) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:
  try:data=json.load(e)
  except:data={}
  return e.code,{'errors':[{'code':x.get('code'),'message':str(x.get('message','')).replace(token,'[redacted]')[:220]} for x in data.get('errors',[])]}
status,p=request('/pages/projects/print-pon')
print('Pages read status:',status)
if status==200:
 p=p['result'];build=p.get('build_config') or {}
 print(json.dumps({'project':p.get('name'),'uses_functions':p.get('uses_functions'),'analytics_tag_present':bool(build.get('web_analytics_tag')),'analytics_token_matches_existing_site':build.get('web_analytics_token')==public_token,'production_branch':p.get('production_branch'),'deployment_id':(p.get('canonical_deployment') or {}).get('id')},ensure_ascii=False))
status,data=request('/rum/site_info/list?per_page=100')
print('Web Analytics site-list status:',status)
if status==200:
 sites=[s for s in data.get('result',[]) if s.get('site_token')==public_token or 'print-pon.pages.dev' in json.dumps(s.get('rules',[]))]
 print('Matching Web Analytics sites:',len(sites))
 for site in sites:
  print(json.dumps({'site_tag':site.get('site_tag'),'auto_install':site.get('auto_install'),'ruleset_enabled':(site.get('ruleset') or {}).get('enabled'),'matching_hostname':'print-pon.pages.dev' in json.dumps(site.get('rules',[]))},ensure_ascii=False))
else:print('Web Analytics site-list errors:',json.dumps(data))
query=b'SELECT count() AS rows FROM print_pon_events FORMAT JSON'
status,data=request('/analytics_engine/sql',query)
print('Analytics Engine read status:',status)
if status==200:print('Analytics Engine dataset result:',json.dumps(data.get('data',[])))
else:print('Analytics Engine read errors:',json.dumps(data))
