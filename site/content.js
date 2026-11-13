/* Public catalog is generated from Git-managed project/note metadata at build time. */
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeUrl(value){try{const url=new URL(String(value||''));return ['https:','http:'].includes(url.protocol)?url.href:''}catch{return ''}}
const STATUS={published:'公開中',completed:'完成',developing:'制作中',paused:'休止中'};
let catalogRequest;
function getCatalog(){return catalogRequest??=(async()=>{const response=await fetch('catalog.json',{cache:'no-cache'});if(!response.ok)throw Error('catalog');const data=await response.json();if(!['works','projects','writings'].every(key=>Array.isArray(data[key])))throw Error('catalog format');return data})()}
function card(item,kind,heading='h2'){
 const link=safeUrl(item.url),note=kind==='writings';
 const tag=note?'NOTE':STATUS[item.status]||'';
 const body=`<div class="kicker">${escapeHTML(tag)}</div><${heading}>${escapeHTML(item.title)}</${heading}><p>${escapeHTML(item.description||'')}</p>${link?`<span class="action">${note?'noteで読む':'詳しく見る'} ↗</span>`:''}`;
 return link?`<a class="item-card" href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">${body}</a>`:`<article class="item-card">${body}</article>`;
}
async function renderList(id,kind,limit,heading='h2'){
 const element=document.getElementById(id);if(!element)return;
 try{const catalog=await getCatalog();const items=limit?catalog[kind].slice(0,limit):catalog[kind];element.innerHTML=items.map(item=>card(item,kind,heading)).join('')||'<p class="mini">ただいま準備中です。</p>'}
 catch{element.innerHTML='<p class="mini" role="status">一覧を読み込めませんでした。時間をおいて再読み込みしてください。</p>'}
}
renderList('cms-featured','works',2,'h3');
renderList('cms-works','works');
renderList('cms-projects','projects');
renderList('cms-writings','writings');
