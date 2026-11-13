/** Cloudflare Pages advanced mode worker. Works with dashboard ZIP uploads. */
const HEADERS = {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
function out(obj,status=200){return new Response(JSON.stringify(obj),{status,headers:HEADERS});}
const decode = (s,n) => typeof s==='string'?s.trim().slice(0,n):'';
async function jsonBody(req){const text=await req.text();if(text.length>12000)throw new Error('入力が長すぎます');try{return JSON.parse(text);}catch{throw new Error('投稿の形式が正しくありません');}}
function sameOrigin(req){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
async function sha256(text){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');}
export default {
 async fetch(request, env, ctx){
  const url=new URL(request.url);
  if(url.pathname!=='/api/bbs'&&url.pathname!=='/api/bbs/config')return env.ASSETS.fetch(request);
  if(url.pathname==='/api/bbs/config'){
   if(request.method!=='GET')return out({error:'Method not allowed'},405);
   const ready=!!(env.DB&&env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET);
   return out({ready,siteKey:ready?env.TURNSTILE_SITE_KEY:null});
  }
  if(!env.DB)return out({error:'掲示板は初期設定中です。'},503);
  if(request.method==='GET'){
   const before=Number(url.searchParams.get('before'));
   if(url.searchParams.has('before')&&(!Number.isSafeInteger(before)||before<1))return out({error:'不正なページ指定です。'},400);
   try{
    const rootQuery=before?'SELECT id, name, message, created_at FROM bbs_posts WHERE parent_id IS NULL AND id < ? ORDER BY id DESC LIMIT 21':'SELECT id, name, message, created_at FROM bbs_posts WHERE parent_id IS NULL ORDER BY id DESC LIMIT 21';
    const res=await (before?env.DB.prepare(rootQuery).bind(before):env.DB.prepare(rootQuery)).all();
    const list=res.results||[];const hasMore=list.length>20;const posts=list.slice(0,20);
    let replies=[];
    if(posts.length){const ids=posts.map(p=>p.id),ph=ids.map(()=>'?').join(',');
     const rr=await env.DB.prepare(`SELECT id,parent_id,name,message,created_at FROM bbs_posts WHERE parent_id IN (${ph}) ORDER BY id ASC LIMIT 200`).bind(...ids).all();replies=rr.results||[];}
    return out({posts,replies,nextBefore:hasMore?posts[posts.length-1].id:null});
   }catch(e){return out({error:'掲示板を読み込めません。データベースの初期設定を確認してください。'},503);}
  }
  if(request.method==='POST'){
   if(!sameOrigin(request))return out({error:'投稿できません'},403);
   if(!env.TURNSTILE_SITE_KEY||!env.TURNSTILE_SECRET)return out({error:'投稿機能は準備中です'},503);
   let b;try{b=await jsonBody(request);}catch(e){return out({error:e.message},400);}
   if(b.company)return out({ok:true});
   const name=decode(b.name,24)||'通りすがりの名無し', message=typeof b.message==='string'?b.message.trim():'';
   if(!message||[...message].length>1200)return out({error:'本文は1〜1200文字で入力してください'},400);
   if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(message))return out({error:'使用できない文字が含まれています'},400);
   const token=decode(b.token,2500);
   if(!token)return out({error:'迷惑投稿防止の認証が必要です'},403);
   const ip=request.headers.get('CF-Connecting-IP')||'unknown';
   try{
    const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:token,remoteip:ip})});
    const checked=await verify.json();if(!checked.success)return out({error:'認証の有効期限が切れました。もう一度お試しください'},403);
    const hash=await sha256(ip+'|'+env.TURNSTILE_SECRET);
    const limit=await env.DB.prepare("SELECT COUNT(*) AS count, MAX(created_at) AS latest FROM bbs_posts WHERE ip_hash = ? AND created_at >= datetime('now','-1 hour')").bind(hash).first();
    if(Number(limit?.count)>=8)return out({error:'連続投稿の上限に達しました。少し時間をおいてください'},429);
    if(limit?.latest&&Date.now()-Date.parse(limit.latest.replace(' ','T')+'Z')<30000)return out({error:'30秒ほどあけて投稿してください'},429);
    let parentId=null;
    if(b.parentId!==null&&b.parentId!==undefined&&b.parentId!==''){
     parentId=Number(b.parentId);
     if(!Number.isSafeInteger(parentId)||parentId<1)return out({error:'返信先が正しくありません'},400);
     const root=await env.DB.prepare('SELECT id,parent_id FROM bbs_posts WHERE id = ?').bind(parentId).first();
     if(!root||root.parent_id!==null)return out({error:'返信先が見つかりません'},400);
    }
    const inserted=await env.DB.prepare('INSERT INTO bbs_posts (parent_id,name,message,ip_hash) VALUES (?,?,?,?)').bind(parentId,name,message,hash).run();
    return out({ok:true,id:inserted.meta.last_row_id},201);
   }catch(e){return out({error:'投稿に失敗しました。しばらくしてからお試しください'},503);}
  }
  if(request.method==='DELETE'){
   if(!sameOrigin(request))return out({error:'削除できません'},403);
   if(!env.BBS_ADMIN_KEY)return out({error:'管理人キーが未設定です'},503);
   const inputKey=request.headers.get('x-admin-key')||'';
   if(inputKey.length<16||inputKey.length>256||await sha256(inputKey)!==await sha256(env.BBS_ADMIN_KEY))return out({error:'管理人キーが正しくありません'},403);
   let b;try{b=await jsonBody(request);}catch(e){return out({error:e.message},400);}
   const id=Number(b.id);if(!Number.isSafeInteger(id)||id<=0)return out({error:'投稿番号が正しくありません'},400);
   try{await env.DB.prepare('DELETE FROM bbs_posts WHERE id = ? OR parent_id = ?').bind(id,id).run();return out({ok:true});}
   catch{return out({error:'削除できませんでした'},503);}
  }
  return out({error:'Method not allowed'},405);
 }
};
