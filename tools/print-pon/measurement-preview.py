"""Try the prepared event binding only on a noindex Pages preview, never production."""
import os,json,subprocess,re,urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[2]
base='https://api.cloudflare.com/client/v4/accounts/'+os.environ['CLOUDFLARE_ACCOUNT_ID']+'/pages/projects/print-pon'
token=os.environ['CLOUDFLARE_API_TOKEN']
def api(method='GET',payload=None):
 req=urllib.request.Request(base,method=method,data=json.dumps(payload).encode() if payload is not None else None,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=40) as r:data=json.load(r)
 assert data.get('success');return data['result']
p=api();production=p['canonical_deployment']['id'];previous=p.get('deployment_configs',{}).get('preview',{}).get('analytics_engine_datasets') or {}
config=root/'tools/print-pon/events-enabled.json';config.write_text(json.dumps({'enabled':True,'reason':'Isolated preview capability check'}))
subprocess.run(['python3',str(root/'tools/print-pon/build.py')],cwd=root,check=True)
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
r=subprocess.run(['npx','--yes','--package=wrangler@4.162.0','wrangler','pages','deploy',str(root/'dist'),'--project-name','print-pon','--branch','measurement-check','--commit-hash',sha,'--commit-dirty=true'],cwd=root/'tools/print-pon',capture_output=True,text=True)
output=re.sub(r'\x1b\[[0-9;]*m','',r.stdout+'\n'+r.stderr).replace(token,'[redacted]')
print('Preview deployment status:',r.returncode)
if r.returncode:
 api('PATCH',{'deployment_configs':{'preview':{'analytics_engine_datasets':previous}}})
 print('Analytics Engine initial activation required:', 'enable Analytics Engine' in output)
 if 'enable Analytics Engine' in output:
  print('Cloudflare requires dashboard activation before a binding can be deployed.')
 else:print('Preview error summary:',output[-1600:])
else:
 urls=re.findall(r'https://[a-z0-9]+\.print-pon\.pages\.dev',output);assert urls
 url=urls[-1]
 h=subprocess.run(['curl','--silent','--show-error','--max-time','30','--output','/dev/null','--write-out','%{http_code}','--request','POST','--header','Origin: '+url,'--header','Content-Type: application/json','--data','{"event":"health","page":"home"}',url+'/api/events'],capture_output=True,text=True,check=True)
 print('Preview URL:',url);print('Event binding health HTTP status:',h.stdout)
assert api()['canonical_deployment']['id']==production, 'Production must remain unchanged'
print('Production unchanged: confirmed')
