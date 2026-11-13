/* Compatibility only: previously published articles. No new blog or CMS posting. */
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeUrl(value){try{const url=new URL(String(value||''));return ['https:','http:'].includes(url.protocol)?url.href:''}catch{return ''}}
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

async function showSavedArticle(){
 const title=document.getElementById('article-title'),list=document.getElementById('legacy-list');
 try{
  const response=await fetch('legacy-posts.json',{cache:'no-cache'});if(!response.ok)throw Error('archive');const posts=await response.json();if(!Array.isArray(posts))throw Error('archive format');
  if(list){list.innerHTML=posts.length?`<ul>${posts.map(post=>`<li><a href="article.html?file=${encodeURIComponent(post._file)}">${escapeHTML(post.title)}</a></li>`).join('')}</ul>`:'<p>保存されている公開記事はありません。</p>'}
  if(!title)return;
  const file=new URLSearchParams(location.search).get('file')||'';
  const post=posts.find(item=>item._file===file);
  if(!post){title.textContent='記事が見つかりません';return}
  title.textContent=post.title;document.title=post.title+'（保存版） | らりるれろの寝床';
  document.getElementById('article-meta').textContent=[post.date,'過去の公開記事・保存版'].filter(Boolean).join(' · ');
  document.getElementById('article-body').innerHTML=simpleMarkdown(post.body);
 }catch{if(title)title.textContent='保存記事を読み込めませんでした';if(list)list.textContent='保存記事を読み込めませんでした。時間をおいて再読み込みしてください。'}
}
showSavedArticle();
