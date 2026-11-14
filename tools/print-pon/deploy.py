import os,json,urllib.request,urllib.error,subprocess,time
from pathlib import Path
from html.parser import HTMLParser
class Scripts(HTMLParser):
 def __init__(self):super().__init__();self.sources=[]
 def handle_starttag(self,tag,attrs):
  if tag=='script':self.sources.append(dict(attrs).get('src'))
ROOT=Path(__file__).resolve().parents[2]
BASE='https://api.cloudflare.com/client/v4/accounts/'+os.environ['CLOUDFLARE_ACCOUNT_ID']+'/pages/projects/print-pon'
def api(suffix='',method='GET'):
 req=urllib.request.Request(BASE+suffix,method=method,headers={'Authorization':'Bearer '+os.environ['CLOUDFLARE_API_TOKEN']})
 try:
  with urllib.request.urlopen(req,timeout=45) as r:data=json.load(r)
 except urllib.error.HTTPError as e:raise RuntimeError('Cloudflare HTTP '+str(e.code)) from None
 if not data.get('success'):raise RuntimeError('Cloudflare request failed (body withheld)')
 return data['result']
p=api();assert p['name']=='print-pon' and p['production_branch']=='main'
assert not p.get('source'),'Unexpected Git integration'
assert not p.get('uses_functions'),'Unexpected server-side functions'
old=p['canonical_deployment']['id'];d=api('/deployments/'+old)
assert not d.get('uses_functions'),'Unexpected deployed functions'
original=set('/'+x for x in json.loads((ROOT/'tools/print-pon/recovered-release.json').read_text())['files'])
assert set(d['files']) in [original,original|{'/404.html'}], 'Production file list changed; inspect before replacing'
assert all(not v.get('env_vars') for v in p.get('deployment_configs',{}).values()),'Unexpected environment variables; inspect settings'
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
print('Preflight passed: complete static deployment; previous deployment',old,flush=True)
subprocess.run(['npx','--yes','--package=wrangler@4.162.0','wrangler','pages','deploy','dist','--project-name','print-pon','--branch','main','--commit-hash',sha,'--commit-dirty=false'],cwd=ROOT,check=True)
new=api()['canonical_deployment']
assert new['id']!=old,'Production deployment did not change'
try:
 assert ((new.get('deployment_trigger') or {}).get('metadata') or {}).get('commit_hash')==sha,'Unexpected production commit'
 for attempt in range(6):
  try:
   with urllib.request.urlopen('https://print-pon.pages.dev/?release='+sha,timeout=30) as r:html=r.read().decode()
   assert '小学生の計算プリントを無料作成・PDF印刷' in html,'Title not updated'
   scripts=Scripts();scripts.feed(html)
   assert scripts.sources.count('https://static.cloudflareinsights.com/beacon.min.js')==1,'Analytics injection must occur exactly once'
   assert 'google-site-verification' in html,'Ownership verification missing'
   for file in ['robots.txt','sitemap.xml','app.js','generator.js','ogp.png','privacy/']:
    with urllib.request.urlopen('https://print-pon.pages.dev/'+file,timeout=30) as r:assert r.status==200 and len(r.read())>0
   try:urllib.request.urlopen('https://print-pon.pages.dev/no-such-page-release-check',timeout=30)
   except urllib.error.HTTPError as e:assert e.code==404
   else:raise AssertionError('Missing URL should return 404')
   break
  except Exception:
   if attempt==5:raise
   time.sleep(5)
except Exception:
 current=api()['canonical_deployment']['id']
 if current==new['id']:
  api('/deployments/'+old+'/rollback',method='POST')
  print('Verification failed; rolled back to previous deployment',old,flush=True)
 raise
print('Production verified:',new['id'],'https://print-pon.pages.dev/',flush=True)
