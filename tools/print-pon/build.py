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
  cards=''.join(f'<li><a href="/{h(t["slug"])}/"><strong>{h(t["label"])}</strong><span>{h(t["level"])}</span></a></li>' for t in TOPICS if t['grade']==grade)
  groups.append(f'<section><h3>小学{grade}年生</h3><ul class="topic-cards">{cards}</ul></section>')
 return '<section id="topics" class="topic-directory" aria-labelledby="topics-title"><h2 id="topics-title">学年・単元からプリントを選ぶ</h2><p>学びたい内容を選ぶだけ。見本と答えつきのプリントをすぐに作れます。</p><div class="grade-directory">'+''.join(groups)+'</div><p class="curriculum-note">学年は学習の目安です。学校での進度に合わせて選んでください。小5・6の整数計算の復習にも使えます。小数・分数の問題はありません。</p></section>'
def answer(t,a,b):
 op=t['settings']['op']
 return str(a+b) if op=='add' else str(a-b) if op=='sub' else str(a*b) if op=='mul' else str(a//b)+(f' あまり {a%b}' if a%b else '')
def render_topic(home,t):
 title=t['title']+'｜無料・答えつきPDF印刷｜ぷりぽんっ'
 desc=f'{t["title"]}を無料で自動作成。{t["level"]}の問題を、答えつきA4 PDFで保存・印刷できます。{t["intro"]}登録不要。'
 s=home.replace('<body>','<body class="topic-page">')
 s=re.sub(r'<title>.*?</title>',f'<title>{h(title)}</title>',s)
 for attr,key,value in [('name','description',desc),('property','og:title',title),('property','og:description',desc),('property','og:url',SITE+t['slug']+'/'),('name','twitter:title',title),('name','twitter:description',desc)]:
  s=re.sub(rf'<meta {attr}="{key}" content="[^"]*">',f'<meta {attr}="{key}" content="{h(value)}">',s)
 s=re.sub(r'<link rel="canonical" href="[^"]*">',f'<link rel="canonical" href="{SITE}{h(t["slug"])}/">',s)
 hero=f'''<nav class="breadcrumbs" aria-label="パンくず"><a href="/">ホーム</a> › <a href="/#topics">小学{t['grade']}年生のプリント</a> › {h(t['label'])}</nav>
 <section class="topic-hero" aria-labelledby="hero-title"><p class="eyebrow">小学{t['grade']}年生・{h(t['level'])}</p><h1 id="hero-title">{h(t['title'])}<span>無料・答えつき・A4印刷</span></h1><p>{h(t['intro'])}</p><p class="quick-guide">① 問題数を選ぶ → ② 見本を確認 → ③ PDF保存・印刷。20問・答えつきで作成済みです。</p><a class="preview-jump" href="#pdfBtn">すぐに保存・印刷する ↓</a></section>'''
 s=re.sub(r'<section class="hero".*?</section>',hero,s,count=1,flags=re.S)
 s=s.replace('<!-- TOPIC_DIRECTORY -->','')
 fixed='<div hidden><div id="gradePresets"></div><fieldset id="remainderGroup">'+''.join(f'<input type="radio" name="remainderMode" value="{v}"'+(' checked' if v=='none' else '')+'>' for v in ['none','only','mixed'])+'</fieldset>'
 fixed+=''.join(f'<input type="radio" name="operation" value="{v}"'+(' checked' if v=='mix' else '')+'>' for v in ['mix','add','sub','mul','div'])
 fixed+=''.join(f'<select id="{key}">'+''.join(f'<option value="{n}">{n}</option>' for n in [1,2,3])+'</select>' for key in ['leftDigits','rightDigits'])+'</div>'
 fixed+=f'<p class="unit-setting"><strong>{h(t["level"])}</strong><br>この単元に合う条件を設定済みです。</p><div class="control-group"><label for="questionCount">1まいの問題数</label><select id="questionCount">'+''.join(f'<option value="{n}"'+(' selected' if n==20 else '')+f'>{n}問</option>' for n in t['counts'])+'</select></div>'
 s=re.sub(r'<section class="grade-picker".*?</details>',fixed,s,count=1,flags=re.S)
 s=s.replace('もんだいをえらぼう','問題数をえらぼう').replace('好きな計算と数字をえらんでね','計算の条件は設定済みです')
 symbol={'add':'＋','sub':'−','mul':'×','div':'÷'}[t['settings']['op']]
 questions=''.join(f'<li>{a} {symbol} {b} = ______'+(' あまり ______' if t['settings']['op']=='div' and a%b else '')+'</li>' for a,b in t['samples'])
 answers='、'.join(f'{a} {symbol} {b} = {answer(t,a,b)}' for a,b in t['samples'])
 samples=f'<section class="unit-content" aria-labelledby="sample-title"><h2 id="sample-title">{h(t["label"])}の問題例</h2><p>出題する式の例です。上の見本とPDFは、毎回ちがう組み合わせで作成します。</p><ol class="sample-questions">{questions}</ol><details><summary>問題例の答えを見る</summary><p>{h(answers)}</p></details><h2>学習のポイント</h2><p>{h(t["tip"])}</p><h2>このプリントの出題範囲</h2><p>{h(t["note"])}</p><h2>家庭学習・授業での使い方</h2><p>最初は10問から取り組み、答えのページで丸つけをします。間違えた式を一緒に確かめたら、「同じ条件でもう1枚つくる」で復習できます。このページをブックマークすると、次回も同じ単元から始められます。</p><p>問題は横式、答えは別ページです。登録なし・無料で、学校や塾での配布にも使えます。A4・倍率100%を目安に印刷してください。</p></section>'
 s=re.sub(r'<section class="about".*?</section>',samples,s,count=1,flags=re.S)
 # General division guidance must not contradict this page's fixed conditions.
 s=re.sub(r'<details><summary>わり算の余りはありますか？</summary>.*?</details>','',s,flags=re.S)
 related=[x for x in TOPICS if x['slug']!=t['slug'] and x['grade']==t['grade']]
 if t['grade']==3:related += [x for x in TOPICS if x['slug']=='grade-2/multiplication-table']
 if t['grade']==4:related += [x for x in TOPICS if x['slug']=='grade-3/division']
 related_html='<nav class="related-topics" aria-label="関連する単元"><h2>次の練習・復習に</h2><ul>'+''.join(f'<li><a href="/{h(x["slug"])}/">{h(x["title"])}</a></li>' for x in related)+'</ul><a href="/#topics">すべての学年・単元を見る</a> ／ <a href="/#worksheet">計算条件を自由に設定する</a></nav>'
 s=s.replace('  </main>',related_html+'\n  </main>')
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
