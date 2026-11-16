"""Deploy only the independent tapping project; never mutate existing sites."""
import hashlib,json,os,subprocess,time,urllib.request,urllib.error
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
PROJECT='rarirurero-tapping-public'
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'managed-sites/rarirurero-tapping/dist'
ORIGIN='https://'+PROJECT+'.pages.dev'
BASE='https://api.cloudflare.com/client/v4/accounts/'+os.environ['CLOUDFLARE_ACCOUNT_ID']+'/pages/projects'
MARKER={'application':'rarirurero-tapping','project':PROJECT,'source':'rayrayeee262626/rarirurero-nedoko:managed-sites/rarirurero-tapping'}
def api(path='',method='GET',payload=None):
 req=urllib.request.Request(BASE+path,method=method,data=json.dumps(payload).encode() if payload is not None else None,headers={'Authorization':'Bearer '+os.environ['CLOUDFLARE_API_TOKEN'],'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=45) as r:data=json.load(r)
 except urllib.error.HTTPError as e:
  if method=='GET' and e.code==404:return None
  raise RuntimeError('Cloudflare API HTTP '+str(e.code)) from None
 if not data.get('success'):raise RuntimeError('Cloudflare API request failed; response withheld')
 return data['result']
def public(path):
 return subprocess.check_output(['curl','--fail','--silent','--show-error','--location','--max-time','30',ORIGIN+'/'+path])
p=api('/'+PROJECT)
if p is None:
 p=api(method='POST',payload={'name':PROJECT,'production_branch':'main','deployment_configs':{'production':{},'preview':{}}})
 print('Created new separate Pages project:',PROJECT,flush=True)
else:
 assert json.loads(public('_tapping-project.json'))==MARKER,'Existing project ownership marker mismatch; stopped'
assert p['name']==PROJECT and p['production_branch']=='main' and not p.get('source')
for env in p.get('deployment_configs',{}).values():
 for key in ('env_vars','d1_databases','kv_namespaces','r2_buckets','service_bindings','durable_object_namespaces','analytics_engine_datasets'):
  assert not env.get(key),'Unexpected project bindings; stopped'
(DIST/'_tapping-project.json').write_text(json.dumps(MARKER)+'\n')
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
subprocess.run(['npx','--yes','--package=wrangler@4.162.0','wrangler','pages','deploy',str(DIST),'--project-name',PROJECT,'--branch','main','--commit-hash',sha,'--commit-dirty=true'],cwd=ROOT,check=True)
for attempt in range(8):
 try:
  assert json.loads(public('_tapping-project.json'))==MARKER
  manifest=json.loads((DIST/'manifest.json').read_text())
  assert len(manifest)==150
  names=['index.html','game.js','config.js','reactions.js','style.css','results.js','manifest.json','assets/normal.png']+[f['image'] for f in manifest]
  def verify(name):
   assert hashlib.sha256(public(name)).digest()==hashlib.sha256((DIST/name).read_bytes()).digest(),'Public file mismatch: '+name
  with ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(verify,names))
  break
 except Exception:
  if attempt==7:raise
  time.sleep(5)
print('PUBLIC DEPLOYMENT VERIFIED:',ORIGIN+'/',flush=True)
