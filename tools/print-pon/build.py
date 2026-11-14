"""Render crawlable unit pages and copy only explicit public assets to dist/."""
from pathlib import Path
from html import escape
import shutil,json,re
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'managed-sites/print-pon'
TOPICS=json.loads((ROOT/'tools/print-pon/topics.json').read_text())
SITE='https://print-pon.pages.dev/'
EVENTS=json.loads((ROOT/'tools/print-pon/events-enabled.json').read_text())['enabled']
assert isinstance(EVENTS,bool)
def h(s):return escape(str(s),quote=True)
def directory():
 groups=[]
 for grade in range(1,5):
  links=''.join(f'<li><a href="/{h(t["slug"])}/">{h(t["label"])} <span>（{h(t["level"])}）</span></a></li>' for t in TOPICS if t['grade']==grade)
  groups.append(f'<section><h3>小学{grade}年生</h3><ul>{links}</ul></section>')
 presets='<div class="grade-buttons" id="gradePresets">'+''.join(f'<button type="button" data-grade="{key}" aria-pressed="false">{label}</button>' for key,label in [('pre','年長'),('1','小1'),('2','小2'),('3','小3'),('4','小4'),('5','小5・6')])+'</div>'
 return '<details id="topics" class="secondary-section"><summary>学年から探す</summary><div class="grade-directory">'+''.join(groups)+'</div><h3>学年の目安で設定する</h3>'+presets+'<p class="curriculum-note">学習進度に合わせて設定を変更できます。小5・6は整数の復習用です。</p></details>'
def answer(t,a,b):
 op=t['settings']['op']
 return str(a+b) if op=='add' else str(a-b) if op=='sub' else str(a*b) if op=='mul' else str(a//b)+(f' あまり {a%b}' if a%b else '')
def render_topic(home,t):
 title=t['title']+'｜無料・答えつきPDF印刷｜ぷりぽんっ'
 desc=f'{t["title"]}を無料で作成。{t["level"]}、{t["scope"]}。答えつきの横式20問をA4 PDFですぐ保存・印刷できます。問題数の変更・同じ条件で再生成も可能。登録不要。'
 s=home.replace('<body class="simple-ui">','<body class="simple-ui topic-page">')
 s=re.sub(r'<title>.*?</title>',f'<title>{h(title)}</title>',s)
 for attr,key,value in [('name','description',desc),('property','og:title',title),('property','og:description',desc),('property','og:url',SITE+t['slug']+'/'),('name','twitter:title',title),('name','twitter:description',desc)]:
  s=re.sub(rf'<meta {attr}="{key}" content="[^"]*">',f'<meta {attr}="{key}" content="{h(value)}">',s)
 s=re.sub(r'<link rel="canonical" href="[^"]*">',f'<link rel="canonical" href="{SITE}{h(t["slug"])}/">',s)
 intro=f'<section class="page-intro" aria-labelledby="hero-title"><a class="back-link" href="/">← 自由に設定する</a><h1 id="hero-title">{h(t["title"])}</h1><p>{h(t["level"])}・無料・登録不要</p></section>'
 s=re.sub(r'<!-- PAGE_INTRO_START -->.*?<!-- PAGE_INTRO_END -->',intro,s,count=1,flags=re.S)
 s=s.replace('<!-- TOPIC_DIRECTORY -->','')
 fixed=f'<p class="unit-setting">{h(t["level"])}<br><span>{h(t["scope"])}</span></p><div hidden>'
 fixed+=''.join(f'<input type="radio" name="operation" value="{v}"'+(' checked' if v==t['settings']['op'] else '')+'>' for v in ['mix','add','sub','mul','div'])
 fixed+='<fieldset id="remainderGroup">'+''.join(f'<input type="radio" name="remainderMode" value="{v}"'+(' checked' if v=='none' else '')+'>' for v in ['none','only','mixed'])+'</fieldset>'
 fixed+=''.join(f'<select id="{key}">'+''.join(f'<option value="{n}">{n}</option>' for n in [1,2,3])+'</select>' for key in ['leftDigits','rightDigits'])+'</div>'
 s=re.sub(r'<!-- OPERATION_SETTINGS_START -->.*?<!-- OPERATION_SETTINGS_END -->',fixed,s,count=1,flags=re.S)
 count='<select id="questionCount">'+''.join(f'<option value="{n}"'+(' selected' if n==20 else '')+f'>{n}問</option>' for n in t['counts'])+'</select>'
 s=re.sub(r'<select id="questionCount">.*?</select>',count,s,count=1,flags=re.S)
 symbol={'add':'＋','sub':'−','mul':'×','div':'÷'}[t['settings']['op']]
 questions=''.join(f'<li>{a} {symbol} {b} = ______'+(' あまり ______' if t['settings']['op']=='div' and a%b else '')+'</li>' for a,b in t['samples'])
 answers='、'.join(f'{a} {symbol} {b} = {answer(t,a,b)}' for a,b in t['samples'])
 info=f'<details class="secondary-section unit-information"><summary>この単元について・問題例</summary><section class="unit-content"><p>{h(t["intro"])}</p><h2>問題例</h2><ol class="sample-questions">{questions}</ol><details><summary>問題例の答え</summary><p>{h(answers)}</p></details><h2>学習のポイント</h2><p>{h(t["tip"])}</p><h2>出題範囲・注意点</h2><p>{h(t["note"])}</p></section></details>'
 related=[x for x in TOPICS if x['slug']!=t['slug'] and x['grade']==t['grade']]
 if t['grade']==3:related += [x for x in TOPICS if x['slug']=='grade-2/multiplication-table']
 if t['grade']==4:related += [x for x in TOPICS if x['slug']=='grade-3/division']
 info+='<details class="secondary-section related-topics"><summary>ほかの単元を探す</summary><ul>'+''.join(f'<li><a href="/{h(x["slug"])}/">{h(x["title"])}</a></li>' for x in related)+'</ul><a href="/#topics">学年から探す</a></details>'
 s=s.replace('<!-- UNIT_INFORMATION -->',info)
 conf={k:t[k] for k in ['slug','grade','label','settings']}
 s=s.replace('  <script src="/generator.js"',f'  <script id="topicConfig" type="application/json">{json.dumps(conf,ensure_ascii=False)}</script>\n  <script src="/generator.js"')
 return s

def build():
 expected=set(json.loads((ROOT/'tools/print-pon/recovered-release.json').read_text())['files'])|{'404.html','analytics.js'}
 actual={str(p.relative_to(SOURCE)) for p in SOURCE.rglob('*') if p.is_file() and p.name!='AGENTS.md'}
 assert actual==expected, 'Unexpected or missing source files'
 out=ROOT/'dist'
 if out.exists():shutil.rmtree(out)
 shutil.copytree(SOURCE,out,ignore=shutil.ignore_patterns('AGENTS.md'))
 template=(SOURCE/'index.html').read_text().replace('<html lang="ja">','<html lang="ja" data-events="'+('enabled' if EVENTS else 'disabled')+'">')
 (out/'index.html').write_text(template.replace('<!-- TOPIC_DIRECTORY -->',directory()))
 for t in TOPICS:
  dest=out/t['slug']/'index.html';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(render_topic(template,t))
 urls=['','about/','privacy/','terms/']+[t['slug']+'/' for t in TOPICS]
 (out/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>{SITE}{u}</loc></url>\n' for u in urls)+'</urlset>\n')
 worker=(ROOT/'tools/print-pon/event-worker.mjs').read_text().replace('__TOPIC_IDS__',json.dumps([t['slug'] for t in TOPICS]))
 if EVENTS:
  (out/'_worker.js').write_text(worker)
  (out/'_routes.json').write_text(json.dumps({'version':1,'include':['/api/events'],'exclude':[]}))
 privacy=out/'privacy/index.html'
 state='現在、操作回数の匿名集計は有効です。' if EVENTS else '現在、操作回数の匿名集計は無効で、操作イベントは送信していません。ページ閲覧のWeb Analyticsは継続しています。'
 privacy.write_text(privacy.read_text().replace('<!-- EVENT_STATUS -->','<p>'+state+'</p>'))
 for html in out.rglob('*.html'):
  html.write_text(html.read_text().replace('</body>','<script defer src="/analytics.js"></script></body>'))
 print(f'Print PON: {len(TOPICS)} static topic pages, sitemap, action events {'enabled' if EVENTS else 'disabled'} in dist/')
if __name__=='__main__':build()
