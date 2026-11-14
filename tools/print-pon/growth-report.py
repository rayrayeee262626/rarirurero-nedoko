"""Aggregate growth diagnostics with existing Actions identity; no visitor records."""
import json,os,urllib.request,urllib.error,datetime
account=os.environ['CLOUDFLARE_ACCOUNT_ID'];token=os.environ['CLOUDFLARE_API_TOKEN']
def request(url,payload=None,text=False):
 data=(payload.encode() if text else json.dumps(payload).encode()) if payload is not None else None
 req=urllib.request.Request(url,data=data,headers={'Authorization':'Bearer '+token,'Content-Type':'text/plain' if text else 'application/json'},method='POST' if payload is not None else 'GET')
 try:
  with urllib.request.urlopen(req,timeout=45) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,{'error':'HTTP '+str(e.code)}
base='https://api.cloudflare.com/client/v4/accounts/'+account
status,pages=request(base+'/pages/projects/print-pon')
if status==200:
 for ident in ['02e6e2e2-d023-498c-964d-1d7aee2866e6']:
  s,d=request(base+'/pages/projects/print-pon/deployments/'+ident)
  if s==200:print('Original Web Analytics tag:',(d.get('result',{}).get('build_config') or {}).get('web_analytics_tag'))
status,sites=request(base+'/rum/site_info/list?per_page=100');print('RUM site-list HTTP:',status)
if status==200:
 matches=[s for s in sites.get('result',[]) if s.get('site_token')=='60038f3f421648d3bc5ecf09f3cd4061' or 'print-pon.pages.dev' in json.dumps(s.get('rules',[]))]
 print('RUM matching site tags:',[s.get('site_tag') for s in matches])
query="SELECT toDate(timestamp) AS day, blob1 AS event, blob2 AS page, SUM(_sample_interval * double1) AS actions FROM print_pon_events WHERE timestamp >= NOW() - INTERVAL '28' DAY GROUP BY day,event,page ORDER BY day DESC,actions DESC LIMIT 500 FORMAT JSON"
s,d=request(base+'/analytics_engine/sql',query,True);print('Action aggregate HTTP:',s);print('ACTION_DATA',json.dumps(d.get('data',[]) if s==200 else d))
q='query { __schema { types { name kind } queryType { name fields { name type { name kind ofType { name kind } } } } } }'
s,d=request('https://api.cloudflare.com/client/v4/graphql',{'query':q});print('GraphQL schema HTTP:',s)
if d.get('errors'):print('GRAPHQL_ERRORS',json.dumps(d['errors']))
else:
 schema=(d.get('data') or {}).get('__schema') or {}
 print('RUM_TYPES',json.dumps([t for t in schema.get('types',[]) if 'rumpageload' in t['name'].lower()]))
 print('ROOT_SCHEMA',json.dumps(schema.get('queryType')))
 print('ACCOUNT_TYPES',json.dumps([t for t in schema.get('types',[]) if t['name'].lower() in ['account','viewer']]))
