/* Local catalog hydrates the same cards pre-rendered in HTML at build time. */
import {card} from './site-view.js';
let catalogRequest;
function getCatalog(){return catalogRequest??=(async()=>{const response=await fetch('catalog.json',{cache:'no-cache'});if(!response.ok)throw Error('catalog');const data=await response.json();if(!['works','projects','writings'].every(key=>Array.isArray(data[key])))throw Error('catalog format');return data})()}
async function renderList(id,kind,limit,heading='h2'){
 const element=document.getElementById(id);if(!element)return;
 try{const catalog=await getCatalog();const items=limit?catalog[kind].slice(0,limit):catalog[kind];element.innerHTML=items.map(item=>card(item,kind,heading)).join('')||'<p class="mini">ただいま準備中です。</p>'}
 catch{if(element.dataset.prerendered==='true')return;element.innerHTML='<p class="mini" role="status">一覧を読み込めませんでした。時間をおいて再読み込みしてください。</p>'}
}
renderList('cms-featured','works',2,'h3');
renderList('cms-works','works');
renderList('cms-projects','projects');
renderList('cms-writings','writings');
