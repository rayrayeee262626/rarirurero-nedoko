"""Read-only crawl diagnostics. No credentials, JavaScript or analytics requests."""
import concurrent.futures, json, subprocess, xml.etree.ElementTree as ET
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit
from pathlib import Path
BASE = 'https://print-pon.pages.dev/'
UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
class Page(HTMLParser):
 def __init__(self):
  super().__init__(); self.links=[]; self.canonical=[]; self.noindex=False
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='a' and a.get('href'): self.links.append(a['href'])
  if tag=='link' and a.get('rel')=='canonical': self.canonical.append(a.get('href'))
  if tag=='meta' and a.get('name','').lower() in ('robots','googlebot') and 'noindex' in a.get('content','').lower(): self.noindex=True

def fetch(url,ua=UA):
 result=subprocess.run(['curl','--silent','--show-error','--max-time','30','--user-agent',ua,'--dump-header','-','--write-out','\n%{http_code}',url],capture_output=True,check=True)
 raw,status=result.stdout.rsplit(b'\n',1)
 # Handle proxy CONNECT and informational headers, without following redirects.
 parts=raw.split(b'\r\n\r\n'); headers=[]
 while parts and parts[0].startswith(b'HTTP/'):
  headers.append(parts.pop(0).decode('latin1'))
 body=b'\r\n\r\n'.join(parts).decode('utf-8')
 return int(status), '\n'.join(headers), body

def main():
 status,headers,xml=fetch(BASE+'sitemap.xml')
 assert status==200, ('sitemap',status)
 assert 'application/xml' in headers.lower() or 'text/xml' in headers.lower(),headers
 assert 'x-robots-tag: noindex' not in headers.lower()
 root=ET.fromstring(xml); ns='{http://www.sitemaps.org/schemas/sitemap/0.9}'
 assert root.tag==ns+'urlset'
 urls=[e.text for e in root.findall(ns+'url/'+ns+'loc')]
 topics=json.loads((Path(__file__).resolve().parents[2]/'tools/print-pon/topics.json').read_text())
 expected={BASE,BASE+'about/',BASE+'privacy/',BASE+'terms/'}|{BASE+t['slug']+'/' for t in topics}
 assert set(urls)==expected and len(urls)==len(expected)
 status,_,robots=fetch(BASE+'robots.txt'); assert status==200
 assert 'Sitemap: '+BASE+'sitemap.xml' in robots and 'Disallow: /\n' not in robots
 for ua in ['curl/8.0','Google-InspectionTool/1.0']:
  s,_,body=fetch(BASE+'sitemap.xml',ua);assert s==200 and ET.fromstring(body).tag==ns+'urlset'
 def check(url):
  status,headers,body=fetch(url);assert status==200,(url,status)
  page=Page();page.feed(body)
  assert page.canonical==[url],(url,page.canonical)
  assert not page.noindex and 'x-robots-tag: noindex' not in headers.lower(),url
  assert 'cf-mitigated: challenge' not in headers.lower(),url
  links={urljoin(url,h).split('#')[0].split('?')[0] for h in page.links}
  return {'url':url,'status':status,'canonical':page.canonical[0],'links':sorted(links & expected),'indexing_allowed':True}
 rows=list(concurrent.futures.ThreadPoolExecutor(max_workers=4).map(check,urls))
 graph={r['url']:r['links'] for r in rows}; reached={BASE}; pending=[BASE]
 while pending:
  for url in graph[pending.pop()]:
   if url not in reached:reached.add(url);pending.append(url)
 assert reached==expected,('Unreachable by static links',expected-reached)
 result={'sitemap_http':200,'sitemap_urls':len(urls),'static_link_reachable':len(reached),'robots_sitemap_present':True,'pages':rows,'limit':'This verifies public discovery paths, not actual Google sitemap processing or index inclusion.'}
 print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
