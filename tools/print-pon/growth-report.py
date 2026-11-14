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
query="SELECT toDate(timestamp) AS day, blob1 AS event, blob2 AS page, SUM(_sample_interval * double1) AS actions FROM print_pon_events WHERE timestamp >= NOW() - INTERVAL '28' DAY GROUP BY day,event,page ORDER BY day DESC,actions DESC LIMIT 500 FORMAT JSON"
s,d=request(base+'/analytics_engine/sql',query,True);print('Action aggregate HTTP:',s);print('ACTION_DATA',json.dumps(d.get('data',[]) if s==200 else d))
now=datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
start=now-datetime.timedelta(days=28)
flt='{datetime_geq:"'+start.isoformat().replace('+00:00','Z')+'",datetime_leq:"'+now.isoformat().replace('+00:00','Z')+'",requestHost:"print-pon.pages.dev"}'
q='query { viewer { accounts(filter:{accountTag:"'+account+'"}) {'
for name,dim,limit in [('totals','',1),('pages','requestPath',1000),('sources','refererHost',1000),('daily','date',100)]:
 q+=name+':rumPageloadEventsAdaptiveGroups(limit:'+str(limit)+',filter:'+flt+') {count sum{visits} '+('dimensions{'+dim+'}' if dim else '')+'}'
q+='} } }'
s,d=request('https://api.cloudflare.com/client/v4/graphql',{'query':q})
print('ACCESS_PERIOD',json.dumps({'start':start.isoformat(),'end':now.isoformat(),'timezone':'UTC','host':'print-pon.pages.dev'}))
if d.get('errors'):print('ACCESS_ERRORS',json.dumps(d['errors']))
else:
 accounts=((d.get('data') or {}).get('viewer') or {}).get('accounts') or []
 if not accounts:print('ACCESS_ERRORS','No account data returned')
 else:
  a=accounts[0]
  print('ACCESS_TOTALS',json.dumps(a.get('totals',[])))
  from pathlib import Path
  topics=json.loads((Path(__file__).parent/'topics.json').read_text())
  allowed={'/','/about/','/privacy/','/terms/'}|{'/'+t['slug']+'/' for t in topics}
  rows=[];other={'path':'other','pageviews':0,'visits':0}
  for row in a.get('pages',[]):
   path=row.get('dimensions',{}).get('requestPath','')
   v={'path':path,'pageviews':row.get('count',0),'visits':row.get('sum',{}).get('visits',0)}
   if path in allowed:rows.append(v)
   else:other['pageviews']+=v['pageviews'];other['visits']+=v['visits']
  if other['pageviews']:rows.append(other)
  print('ACCESS_PAGES',json.dumps(rows))
  source_totals={}
  for row in a.get('sources',[]):
   host=(row.get('dimensions',{}).get('refererHost') or '').lower()
   source='direct/unknown' if not host else 'internal' if host=='print-pon.pages.dev' else 'Google' if host.endswith('google.com') or host.endswith('google.co.jp') else 'X' if host in ['t.co','x.com','twitter.com'] else 'note' if host=='note.com' else 'LINE' if host.endswith('line.me') else 'Bing' if host.endswith('bing.com') else 'other'
   target=source_totals.setdefault(source,{'pageviews':0,'visits':0});target['pageviews']+=row.get('count',0);target['visits']+=row.get('sum',{}).get('visits',0)
  print('ACCESS_SOURCES',json.dumps(source_totals))
  print('ACCESS_DAILY',json.dumps(a.get('daily',[])))
