import os,json,urllib.request,urllib.error,subprocess,time
from pathlib import Path
from html.parser import HTMLParser
class Scripts(HTMLParser):
 def __init__(self):super().__init__();self.sources=[]
 def handle_starttag(self,tag,attrs):
  if tag=='script':self.sources.append(dict(attrs).get('src'))
ROOT=Path(__file__).resolve().parents[2]
EVENTS=json.loads((ROOT/'tools/print-pon/events-enabled.json').read_text())['enabled']
BASE='https://api.cloudflare.com/client/v4/accounts/'+os.environ['CLOUDFLARE_ACCOUNT_ID']+'/pages/projects/print-pon'
def api(suffix='',method='GET',payload=None):
 req=urllib.request.Request(BASE+suffix,method=method,data=json.dumps(payload).encode() if payload is not None else None,headers={'Authorization':'Bearer '+os.environ['CLOUDFLARE_API_TOKEN'],'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=45) as r:data=json.load(r)
 except urllib.error.HTTPError as e:raise RuntimeError('Cloudflare HTTP '+str(e.code)) from None
 if not data.get('success'):raise RuntimeError('Cloudflare request failed (body withheld)')
 return data['result']
p=api();assert p['name']=='print-pon' and p['production_branch']=='main'
assert not p.get('source'),'Unexpected Git integration'
# Only the dedicated aggregate event binding may be added by this release.
for config in p.get('deployment_configs',{}).values():
 assert not config.get('env_vars'),'Unexpected environment variables'
 assert config.get('analytics_engine_datasets',{}) in ({},None,{'PRINT_PON_EVENTS':{'dataset':'print_pon_events'}}),'Unexpected analytics binding'
old=p['canonical_deployment']['id'];d=api('/deployments/'+old)
if d.get('uses_functions'):
 assert p.get('deployment_configs',{}).get('production',{}).get('analytics_engine_datasets',{}).get('PRINT_PON_EVENTS',{}).get('dataset')=='print_pon_events','Unexpected existing functions'
original=set('/'+x for x in json.loads((ROOT/'tools/print-pon/recovered-release.json').read_text())['files'])
managed={'/'+str(f.relative_to(ROOT/'dist')) for f in (ROOT/'dist').rglob('*') if f.is_file()}
assert original <= set(d['files']) <= managed, 'Production file list changed; inspect before replacing'
assert all(not v.get('env_vars') for v in p.get('deployment_configs',{}).values()),'Unexpected environment variables; inspect settings'
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
print('Preflight passed: complete managed deployment; previous deployment',old,flush=True)
def restore_binding():
 api(method='PATCH',payload={'deployment_configs':{env:{'analytics_engine_datasets':cfg.get('analytics_engine_datasets') or {}} for env,cfg in p.get('deployment_configs',{}).items()}})
try:
 subprocess.run(['npx','--yes','--package=wrangler@4.162.0','wrangler','pages','deploy',str(ROOT/'dist'),'--project-name','print-pon','--branch','main','--commit-hash',sha,'--commit-dirty=false'],cwd=(ROOT/'tools/print-pon' if EVENTS else ROOT),check=True)
except Exception:
 current=api()['canonical_deployment']
 if current['id']!=old and ((current.get('deployment_trigger') or {}).get('metadata') or {}).get('commit_hash')==sha:
  api('/deployments/'+old+'/rollback',method='POST')
 restore_binding()
 raise
new=api()['canonical_deployment']
assert new['id']!=old,'Production deployment did not change'
try:
 assert ((new.get('deployment_trigger') or {}).get('metadata') or {}).get('commit_hash')==sha,'Unexpected production commit'
 for attempt in range(6):
  try:
   def public(url,expected=200):
    result=subprocess.run(['curl','--location','--silent','--show-error','--max-time','30','--write-out','\\n%{http_code}',url],capture_output=True,check=True)
    body,status=result.stdout.rsplit(b'\n',1)
    assert int(status)==expected,'Unexpected public HTTP status '+status.decode()
    return body
   html=public('https://print-pon.pages.dev/?release='+sha).decode()
   assert '小学生の計算プリントを無料作成・PDF印刷' in html,'Title not updated'
   scripts=Scripts();scripts.feed(html)
   assert scripts.sources.count('https://static.cloudflareinsights.com/beacon.min.js')<=1 and scripts.sources.count('/analytics.js')==1,'Existing analytics fallback missing or duplicate injection'
   assert 'google-site-verification' in html,'Ownership verification missing'
   for file in ['robots.txt','sitemap.xml','app.js','generator.js','ogp.png','privacy/','analytics.js']:
    assert len(public('https://print-pon.pages.dev/'+file))>0
   public('https://print-pon.pages.dev/no-such-page-release-check',404)
   topics=json.loads((ROOT/'tools/print-pon/topics.json').read_text())
   for topic in topics:
    page=public('https://print-pon.pages.dev/'+topic['slug']+'/').decode()
    assert topic['title'] in page and 'topicConfig' in page
    scripts=Scripts();scripts.feed(page)
    assert scripts.sources.count('https://static.cloudflareinsights.com/beacon.min.js')<=1 and scripts.sources.count('/analytics.js')==1
   if EVENTS:
    health=subprocess.run(['curl','--silent','--show-error','--max-time','30','--output','/dev/null','--write-out','%{http_code}','--request','POST','--header','Origin: https://print-pon.pages.dev','--header','Content-Type: application/json','--data','{"event":"health","page":"home"}','https://print-pon.pages.dev/api/events'],capture_output=True,check=True)
    assert health.stdout==b'204','Anonymous event binding unavailable'
   break
  except Exception:
   if attempt==5:raise
   time.sleep(5)
except Exception:
 current=api()['canonical_deployment']['id']
 if current==new['id']:
  api('/deployments/'+old+'/rollback',method='POST')
  restore_binding()
  print('Verification failed; rolled back to previous deployment and analytics binding',old,flush=True)
 raise
print('Production verified:',new['id'],'https://print-pon.pages.dev/',flush=True)
