/* Content powered by public GitHub repository edited with Pages CMS. */
const CMS_OWNER='rayrayeee262626', CMS_REPO='rarirurero-nedoko';
const GH_ROOT=`https://api.github.com/repos/${CMS_OWNER}/${CMS_REPO}/contents/`;
const BASE_PROJECTS=[
 {title:'ぷりぽんっ -Print PON!-',status:'published',visible:true,url:'https://print-pon.pages.dev/',description:'小学生向けの計算プリントを自動生成して印刷できる無料Webサービス。'},
 {title:'牌尽',status:'published',visible:true,url:'https://play.google.com/store/apps/details?id=com.haijin.app',description:'共通の配牌とツモ山から最速和了巡目を競う麻雀ゲーム。'},
 {title:'SEVEN DROP（仮）',status:'developing',visible:true,description:'クラップスをベースにサイコロの出目と強化を楽しむゲーム構想。'},
 {title:'GREEDY JACK 50',status:'developing',visible:true,description:'ステージ制のカードゲーム。得点と強化の組み合わせを考える。'},
 {title:'Kugelsturm',status:'developing',visible:true,description:'パチンコとタワーディフェンスを組み合わせたゲーム。'},
 {title:'ぷりぽんっ の拡張',status:'developing',visible:true,description:'漢字プリントなどへの拡張構想。'}
];
const BASE_WRITINGS=[
 {title:'LEDマスクでシワは減るのか？',visible:true,url:'https://note.com/rcp262626/n/n8b2dba7c09a6',description:'医師の視点でLEDフェイスマスクのエビデンスを調べた記事。'},
 {title:'サンタクロースは息子が本当に欲しい物の夢を見るか',visible:true,url:'https://note.com/rcp262626/n/ne8218f98aae9',description:'子どものクリスマスプレゼントをめぐる話。'},
 {title:'人生設計ゼロの心臓血管外科医の話 第一章',visible:true,url:'https://note.com/rcp262626',description:'医師になり心臓血管外科を選んだ経緯について。'}
];
const LABEL={blog:'ブログ',medical:'医学メモ',medicine:'医学メモ',thoughts:'考えたこと',memo:'備忘録',published:'公開中',developing:'制作中',paused:'休止中',completed:'完成'};
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeUrl(v){try{const u=new URL(String(v||''));return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
function truth(v,defaultValue=true){if(v===undefined||v===null)return defaultValue;return v===true||v==='true'||v===1}
function parseScalar(v){v=v.trim();if(v==='true')return true;if(v==='false')return false;if(v==='null')return null;if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))){try{return v[0]==='"'?JSON.parse(v):v.slice(1,-1).replace(/''/g,"'")}catch{return v.slice(1,-1)}}return v}
function parseMarkdown(source){
 const match=source.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
 const raw=match?source.slice(match[0].length):source,meta={};
 if(match){let key=null,multiline=false;for(const line of match[1].split(/\r?\n/)){
  const found=line.match(/^([\w-]+):\s*(.*)$/);
  if(found){key=found[1];multiline=/^[>|][-+]?\s*$/.test(found[2]);meta[key]=multiline?'':parseScalar(found[2]);}
  else if(multiline&&key&&/^\s+/.test(line))meta[key]+=line.trim()+'\n';
 }}return {...meta,body:raw || meta.body || ''};
}
const folderRequests=new Map();
function getFolder(folder){if(!folderRequests.has(folder))folderRequests.set(folder,fetchFolder(folder));return folderRequests.get(folder)}
async function fetchFolder(folder){
 try{const r=await fetch(GH_ROOT+encodeURIComponent('content')+'/'+folder+'?ref=main',{headers:{Accept:'application/vnd.github+json'}});
 if(r.status===404)return [];if(!r.ok)throw Error('GitHub '+r.status);
 const files=await r.json();const markdown=(Array.isArray(files)?files:[]).filter(f=>f.type==='file'&&/\.md$/i.test(f.name));
 const all=await Promise.all(markdown.map(async f=>{try{const rr=await fetch(f.download_url);if(!rr.ok)throw Error('file');return {...parseMarkdown(await rr.text()),_file:f.name}}catch{return null}}));
 return all.filter(Boolean);
 }catch(e){console.warn('Could not load CMS items',folder,e);return null}
}
function mergeDefaults(defaults,items){const map=new Map(defaults.map(v=>[v.title,v]));for(const item of items||[]){const old=map.get(item.title)||{};map.set(item.title,{...old,...item})}return [...map.values()]}
function postDate(item){const date=String(item.date||'').slice(0,10);const fileDate=String(item._file||'').match(/^(\d{4}-\d{2}-\d{2})-/)?.[1];return /^\d{4}-\d{2}-\d{2}$/.test(date)?date:fileDate||''}
function newestFirst(a,b){return postDate(b).localeCompare(postDate(a))||String(a._file||'').localeCompare(String(b._file||''))}
function excerpt(item){const text=String(item.description||item.body||'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/https?:\/\/\S+/g,'').replace(/[#*_>`]/g,'').replace(/\s+/g,' ').trim();return [...text].slice(0,90).join('')+([...text].length>90?'…':'')}
function card(item,tag='',article=false){const link=article?`article.html?file=${encodeURIComponent(item._file||'')}`:safeUrl(item.url),title=escapeHTML(item.title||'無題');const date=article?postDate(item):'';const body=`<div class="kicker">${escapeHTML(tag)}</div>${date?`<time class="card-date" datetime="${escapeHTML(date)}">${escapeHTML(date)}</time>`:''}<h2>${title}</h2><p>${escapeHTML(article?excerpt(item):item.description||'')}</p><span class="action">${link?'詳しく見る ↗':''}</span>`;return link?`<a class="item-card" href="${escapeHTML(link)}"${article?'':' target="_blank" rel="noopener noreferrer"'}>${body}</a>`:`<article class="item-card">${body}</article>`}
function showEmpty(el,msg){el.innerHTML=`<p class="mini">${escapeHTML(msg)}</p>`}
async function renderHome(){
 const recent=document.querySelector('#cms-recent'),featured=document.querySelector('#cms-featured');
 if(!recent||!featured)return;
 await Promise.all([
  (async()=>{const posts=await getFolder('posts');if(posts===null){showEmpty(recent,'新着記事を読み込めませんでした。時間をおいて再読み込みしてください。');return}const entries=posts.filter(p=>truth(p.published,false)).sort(newestFirst).slice(0,3);recent.innerHTML=entries.map(p=>card(p,LABEL[p.category]||'記事',true)).join('')||'<p class="mini">記事は準備中です。作品やnoteも覗いてみてください。</p>'})(),
  (async()=>{const projects=await getFolder('projects');if(projects===null){showEmpty(featured,'作品を読み込めませんでした。時間をおいて再読み込みしてください。');return}const entries=mergeDefaults(BASE_PROJECTS,projects).filter(p=>truth(p.visible,true)&&['published','completed'].includes(p.status)).slice(0,2);featured.innerHTML=entries.map(p=>card(p,LABEL[p.status]||p.status)).join('')||'<p class="mini">公開中の作品は準備中です。</p>'})()
 ]);
}
async function renderProjects(id){const el=document.querySelector('#cms-'+id);if(!el)return;
 const items=await getFolder('projects');if(items===null){el.innerHTML='<p class="mini">最新データを読み込めませんでした。しばらくしてから再読み込みしてください。</p>';return}
 const entries=mergeDefaults(BASE_PROJECTS,items).filter(p=>truth(p.visible,true)&&(['published','completed'].includes(p.status)?id==='works':id==='projects'));
 el.innerHTML=entries.map(x=>card(x,LABEL[x.status]||x.status)).join('')||'<p class="mini">現在、掲載中の作品はありません。</p>';
}
async function renderWritings(){const el=document.querySelector('#cms-writings');if(!el)return;
 const [posts,writings]=await Promise.all([getFolder('posts'),getFolder('writings')]);if(posts===null||writings===null){showEmpty(el,'記事を読み込めませんでした。再読み込みしてください。');return}
 const publishedPosts=posts.filter(p=>truth(p.published,false)&&p.category==='blog').sort(newestFirst);
 const all=[...publishedPosts.map(x=>card(x,'寝床のブログ',true)),...mergeDefaults(BASE_WRITINGS,writings).filter(x=>truth(x.visible,true)).map(x=>card(x,'NOTE'))];
 el.innerHTML=all.join('')||'<p class="mini">記事はまだありません。</p>';
}
async function renderNotes(){const el=document.querySelector('#cms-notes');if(!el)return;const posts=await getFolder('posts');if(posts===null){showEmpty(el,'記事を読み込めませんでした。再読み込みしてください。');return}
 const entries=posts.filter(x=>truth(x.published,false)&&x.category!=='blog').sort(newestFirst);
 const filters=document.querySelector('#cms-filters');const categories=[...new Set(entries.map(x=>x.category||'memo'))];
 const draw=cat=>{el.innerHTML=entries.filter(x=>cat==='all'||x.category===cat).map(x=>card(x,LABEL[x.category]||x.category,true)).join('')||'<p class="mini">この分類にはまだ記事がありません。</p>'};
 filters.innerHTML=['all',...categories].map((x,i)=>`<button class="filter" data-category="${escapeHTML(x)}" aria-pressed="${i===0}">${escapeHTML(x==='all'?'全部':LABEL[x]||x)}</button>`).join('');
 filters.addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;filters.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw(b.dataset.category)});draw('all');
}
// Pages CMS may save pasted rich-text links as '"Label" (https://...)'
// rather than Markdown '[Label](https://...)'. Support both, angle-bracket URLs,
// and ordinary pasted URLs. Never treat untrusted article text as raw HTML.
function inlineMarkdown(text){
 const source=String(text||'');
 const formatPlain=s=>escapeHTML(s).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
 const pattern=/\[([^\]\n]+)\]\(\s*<?(https?:\/\/[^\s)>]+)>?\s*\)|["“]([^"”\n]+)["”]\s*\(\s*(https?:\/\/[^\s)]+)\s*\)|(https?:\/\/[^\s<>"')）]+)/g;
 let out='',offset=0,match;
 while((match=pattern.exec(source))!==null){
  out+=formatPlain(source.slice(offset,match.index));
  let url=match[2]||match[4]||match[5]||'';
  let label=match[1]||match[3]||url;
  // Punctuation after a bare URL belongs to the sentence, not the link.
  let punctuation='';
  if(match[5]){const m=url.match(/[.,;:!?。、「」]+$/);if(m){punctuation=m[0];url=url.slice(0,-punctuation.length);label=url}}
  const safe=safeUrl(url);
  out+=safe?`<a href="${escapeHTML(safe)}" target="_blank" rel="noopener noreferrer">${formatPlain(label)}</a>`:formatPlain(match[0]);
  out+=formatPlain(punctuation);
  offset=pattern.lastIndex;
 }
 return out+formatPlain(source.slice(offset));
}
function simpleMarkdown(body){
 const lines=String(body||'').replace(/\r/g,'').split('\n');let out='',inList=false;
 for(const line of lines){
  if(/^\s*[-*] /.test(line)){if(!inList){out+='<ul>';inList=true}out+='<li>'+inlineMarkdown(line.replace(/^\s*[-*] /,''))+'</li>';continue}
  if(inList){out+='</ul>';inList=false}
  if(/^#{1,3} /.test(line)){const level=line.match(/^#+/)[0].length;out+=`<h${level}>${inlineMarkdown(line.slice(level+1))}</h${level}>`}
  else if(line.trim())out+='<p>'+inlineMarkdown(line)+'</p>';
 }
 if(inList)out+='</ul>';return out;
}
async function renderArticle(){const title=document.querySelector('#article-title');if(!title)return;const file=new URLSearchParams(location.search).get('file')||'';if(!/^[a-zA-Z0-9_.-]+\.md$/.test(file)){title.textContent='記事が見つかりません';return}const items=await getFolder('posts');const p=items?.find(x=>x._file===file);if(!p||!truth(p.published,false)){title.textContent='この記事は公開されていません';return}title.textContent=p.title||'無題';document.title=title.textContent+' | らりるれろの寝床';document.querySelector('#article-meta').textContent=[LABEL[p.category]||p.category,postDate(p)].filter(Boolean).join(' · ');const back=document.querySelector('#article-back');if(back&&p.category!=='blog'){back.href='notes.html';back.textContent='← 医学メモ・考察に戻る'}document.querySelector('#article-body').innerHTML=simpleMarkdown(p.body)}
renderHome();renderProjects('works');renderProjects('projects');renderWritings();renderNotes();renderArticle();
