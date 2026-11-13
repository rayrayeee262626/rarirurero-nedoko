'use strict';
(() => {
 const el = (id) => document.getElementById(id);
 const threads = el('bbs-threads');
 const status = el('bbs-status');
 const formStatus = el('bbs-form-status');
 const more = el('bbs-more');
 const adminKey = el('bbs-admin-key');
 let nextBefore = null, postingReady = false, widgetId = null, turnstileToken = '';
 const displayDate = (s) => { try { return new Date(s.replace(' ','T')+'Z').toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}); } catch { return s; } };
 async function json(url, opts) { const r=await fetch(url,{cache:'no-store',...opts});let x;try{x=await r.json();}catch{x={error:'通信エラーが発生しました'};}if(!r.ok)throw new Error(x.error||`エラー ${r.status}`);return x;}
 function make(tag,cls,txt){const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node;}
 function postNode(p,reply=false){
  const post=make('article','bbs-post'+(reply?' reply':''));
  const head=make('div','bbs-posthead');
  const name=make('span','bbs-postname',p.name);const info=make('span','bbs-postdate',`No.${p.id}  ${displayDate(p.created_at)}`);head.append(name,info);
  post.append(head,make('div','bbs-posttext',p.message));
  const actions=make('div','bbs-actions');
  if(!reply){const respond=make('button','',`↳ 返信する`);respond.type='button';respond.addEventListener('click',()=>{el('bbs-parent').value=p.id;el('bbs-form-title').textContent=`No.${p.id} への返信`;el('bbs-cancel-reply').style.display='inline';el('bbs-message').focus();el('bbs-form-title').scrollIntoView({behavior:'smooth',block:'start'});});actions.append(respond);}
  const deleteBtn=make('button','bbs-delete','削除');deleteBtn.type='button';deleteBtn.hidden=!adminKey.value;
  deleteBtn.addEventListener('click',async()=>{if(!confirm('この投稿を削除しますか？返信も削除されます。'))return;try{await json('/api/bbs',{method:'DELETE',headers:{'content-type':'application/json','x-admin-key':adminKey.value},body:JSON.stringify({id:p.id})});await load(true);}catch(e){alert(e.message);}});
  actions.append(deleteBtn);post.append(actions);return post;
 }
 async function load(reset=false){
  if(reset){threads.replaceChildren();nextBefore=null;more.style.display='none';}
  status.textContent='投稿を読み込んでいます…';
  try{const qs=nextBefore?'?before='+encodeURIComponent(nextBefore):'';
   const data=await json('/api/bbs'+qs);
   for(const p of data.posts){const wrap=make('div','bbs-thread');wrap.append(postNode(p));for(const r of (data.replies||[]).filter(x=>x.parent_id===p.id))wrap.append(postNode(r,true));threads.append(wrap);}
   nextBefore=data.nextBefore;
   more.style.display=nextBefore?'inline-flex':'none';
   status.textContent=threads.children.length?`投稿 ${threads.children.length} 件を表示中（返信は件数に含まれません）`:'まだ投稿がありません。最初のカキコをどうぞ！';
  }catch(e){status.textContent=e.message;}
 }
 function endReply(){el('bbs-parent').value='';el('bbs-cancel-reply').style.display='none';el('bbs-form-title').textContent='新しくカキコする';}
 async function setup(){
  try{const config=await json('/api/bbs/config');
   if(!config.ready){formStatus.className='bbs-warning';formStatus.textContent='現在、掲示板の初期設定中です。投稿はまだできません。';el('bbs-submit').disabled=true;await load(true);return;}
   postingReady=true;
   const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=()=>{widgetId=window.turnstile.render('#bbs-turnstile',{sitekey:config.siteKey,callback:token=>{turnstileToken=token;},'expired-callback':()=>{turnstileToken='';}});};s.onerror=()=>{formStatus.textContent='迷惑投稿防止の認証を読み込めませんでした。';};document.head.append(s);
  }catch(e){formStatus.className='bbs-warning';formStatus.textContent='現在、掲示板の初期設定中です。';el('bbs-submit').disabled=true;}
  await load(true);
 }
 el('bbs-cancel-reply').addEventListener('click',endReply);
 more.addEventListener('click',()=>load());
 adminKey.addEventListener('input',()=>document.querySelectorAll('.bbs-delete').forEach(b=>b.hidden=!adminKey.value));
 el('bbs-form').addEventListener('submit',async ev=>{
  ev.preventDefault();if(!postingReady){formStatus.textContent='掲示板はまだ準備中です。';return;}
  if(!turnstileToken){formStatus.textContent='迷惑投稿防止の確認が完了してから投稿してください。';return;}
  const btn=el('bbs-submit');btn.disabled=true;formStatus.textContent='送信中…';formStatus.className='bbs-meta';
  try{await json('/api/bbs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:el('bbs-name').value,message:el('bbs-message').value,parentId:el('bbs-parent').value||null,token:turnstileToken,company:el('bbs-company').value})});
   el('bbs-message').value='';endReply();formStatus.className='bbs-success';formStatus.textContent='カキコありがとう！反映しました。';await load(true);
  }catch(e){formStatus.className='bbs-warning';formStatus.textContent=e.message;}
  finally{btn.disabled=false;turnstileToken='';if(widgetId!==null&&window.turnstile)window.turnstile.reset(widgetId);}
 });
 setup();
})();
