"""Read aggregate counters only; never fetch or print a visitor identifier."""
import os,urllib.request,urllib.error,json
from pathlib import Path
if not json.loads((Path(__file__).parent/'events-enabled.json').read_text())['enabled']:
 raise SystemExit('Action tracking is disabled until Analytics Engine is activated. Existing Web Analytics remains enabled.')
account=os.environ['CLOUDFLARE_ACCOUNT_ID']
query="""SELECT toDate(timestamp) AS day, blob1 AS event, blob2 AS page,
SUM(_sample_interval * double1) AS actions
FROM print_pon_events WHERE timestamp >= NOW() - INTERVAL '28' DAY
GROUP BY day, event, page ORDER BY day DESC, actions DESC LIMIT 500 FORMAT JSON"""
req=urllib.request.Request('https://api.cloudflare.com/client/v4/accounts/'+account+'/analytics_engine/sql',data=query.encode(),headers={'Authorization':'Bearer '+os.environ['CLOUDFLARE_API_TOKEN'],'Content-Type':'text/plain'},method='POST')
try:
 with urllib.request.urlopen(req,timeout=45) as r:data=json.load(r)
except urllib.error.HTTPError as e:raise SystemExit('Aggregate report unavailable: HTTP '+str(e.code)+'. Analytics Engine SQL read permission may be required; no secret values were printed.')
print(json.dumps(data.get('data',[]),ensure_ascii=False,indent=2))
