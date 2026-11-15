export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeUrl(value){try{const url=new URL(String(value||''));return ['https:','http:'].includes(url.protocol)?url.href:''}catch{return ''}}
export const STATUS={published:'公開中',completed:'完成',developing:'制作中',paused:'休止中'};
export function card(item,kind,heading='h2'){
 const link=safeUrl(item.url),note=kind==='writings';
 const tag=note?'NOTE':STATUS[item.status]||'';
 const body=`<div class="kicker">${escapeHTML(tag)}</div><${heading}>${escapeHTML(item.title)}</${heading}><p>${escapeHTML(item.description||'')}</p>${link?`<span class="action">${note?'noteで読む':'詳しく見る'} ↗</span>`:''}`;
 return link?`<a class="item-card" href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">${body}</a>`:`<article class="item-card">${body}</article>`;
}

export const navItems=[['index.html','ホーム'],['works.html','作ったもの'],['https://note.com/rcp262626','書いたもの'],['projects.html','現在進行中'],['bbs.html','掲示板（BBS）'],['about.html','このサイト']];
export function headerMarkup(pathname){
const pathPage=pathname.split('/').pop()||'index';
const thisPage=pathPage.endsWith('.html')?pathPage:pathPage+'.html';
return `<div class="topbar"><div class="header wrap"><a class="brand" href="index.html"><span class="brand-icon">Zz</span><span>らりるれろの寝床</span></a><button class="nav-toggle" aria-label="メニューを開く" aria-expanded="false">☰</button><nav class="nav" aria-label="主要メニュー">${navItems.map(([href,label])=>`<a href="${href}"${thisPage===href?' aria-current="page"':''}${href.startsWith('https://')?' target="_blank" rel="noopener noreferrer"':''}>${label}</a>`).join('')}</nav></div></div>`;
}
export function footerMarkup(year){return `<footer class="foot"><div class="foot-wrap wrap"><p>© ${year} らりるれろの寝床　｜　作ったもの、書いたもの、現在進行中。</p><div class="social"><a href="https://x.com/rain_behindsun" target="_blank" rel="noopener noreferrer">X ↗</a><a href="https://note.com/rcp262626" target="_blank" rel="noopener noreferrer">note ↗</a><a href="about.html">運営者情報</a></div></div></footer>`;}
