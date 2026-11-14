from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'dist'
TOPICS=json.loads((ROOT/'tools/print-pon/topics.json').read_text())
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__();self.h1=0;self.links=[];self.assets=[];self.ids=[];self.canon=[];self.description=[];self.title=False;self.titles=[];self.feed(text)
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='h1':self.h1+=1
  if t=='title':self.title=True
  if 'id' in a:self.ids.append(a['id'])
  if t=='a' and a.get('href'):self.links.append(a['href'])
  if t in ['script','img'] and a.get('src'):self.assets.append(a['src'])
  if t=='link' and a.get('href'):
   if a.get('rel')=='canonical':self.canon.append(a['href'])
   elif a.get('rel') in ['stylesheet','icon','apple-touch-icon']:self.assets.append(a['href'])
  if t=='meta' and a.get('name')=='description':self.description.append(a['content'])
 def handle_endtag(self,t):
  if t=='title':self.title=False
 def handle_data(self,d):
  if self.title:self.titles.append(d)
seen=set()
for topic in TOPICS:
 path=OUT/topic['slug']/'index.html';text=path.read_text();page=Page(text)
 assert page.h1==1 and len(page.canon)==1 and page.canon[0]=='https://print-pon.pages.dev/'+topic['slug']+'/'
 assert len(page.description)==1 and topic['level'] in page.description[0] and topic['scope'] in page.description[0]
 title=''.join(page.titles);assert title not in seen;seen.add(title)
 assert len(page.ids)==len(set(page.ids)),'Duplicate IDs'
 assert '問題例' in text and topic['tip'] in text and topic['note'] in text
 assert '<ol class="sample-questions">' in text,'No-script content missing'
 assert 'noindex' not in text
 for href in page.links+page.assets:
  parsed=urlsplit(href)
  if parsed.scheme or parsed.netloc:continue
  if parsed.fragment and not parsed.path:
   assert parsed.fragment in page.ids,href
   continue
  target=OUT/unquote(parsed.path).lstrip('/') if parsed.path.startswith('/') else path.parent/unquote(parsed.path)
  assert target.is_file() or (target/'index.html').is_file(),str(target)
xml=ET.parse(OUT/'sitemap.xml');urls=[e.text for e in xml.findall('.//{*}loc')];assert len(urls)==14 and len(set(urls))==14
for topic in TOPICS:assert 'https://print-pon.pages.dev/'+topic['slug']+'/' in urls
home=(OUT/'index.html').read_text()
for topic in TOPICS:assert f'href="/{topic["slug"]}/"' in home
assert not (OUT/'AGENTS.md').exists()
print('10 unique crawlable topic pages: titles, descriptions, headings, examples, canonicals, internal links and sitemap passed.')

events=json.loads((ROOT/'tools/print-pon/events-enabled.json').read_text())['enabled']
assert (OUT/'_worker.js').exists()==events and (OUT/'_routes.json').exists()==events
assert f'data-events="{"enabled" if events else "disabled"}"' in home
