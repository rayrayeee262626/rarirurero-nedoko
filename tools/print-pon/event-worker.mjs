// Aggregate actions only. No visitor identifiers, cookies, IP, UA, referrer or worksheet data.
const pages=new Set(['home',...__TOPIC_IDS__]);
const events=new Set(['generate','pdf','print']);
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname!=='/api/events')return env.ASSETS.fetch(request);
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  if(request.method!=='POST')return new Response(null,{status:405,headers:{...headers,Allow:'POST'}});
  if(request.headers.get('Origin')!==url.origin)return new Response(null,{status:403,headers});
  if(request.headers.get('DNT')==='1'||request.headers.get('Sec-GPC')==='1')return new Response(null,{status:204,headers});
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return new Response(null,{status:415,headers});
  if(Number(request.headers.get('Content-Length'))>256)return new Response(null,{status:413,headers});
  let raw='';
  const reader=request.body?.getReader();
  if(!reader)return new Response(null,{status:400,headers});
  const decoder=new TextDecoder();let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>256){await reader.cancel();return new Response(null,{status:413,headers});}raw+=decoder.decode(value,{stream:true});}
  let data;try{data=JSON.parse(raw);}catch{return new Response(null,{status:400,headers});}
  if(!data||Array.isArray(data)||Object.keys(data).sort().join(',')!=='event,page'||!pages.has(data.page)||(!events.has(data.event)&&data.event!=='health'))return new Response(null,{status:400,headers});
  if(!env.PRINT_PON_EVENTS?.writeDataPoint)return new Response(null,{status:503,headers});
  // Deployment health checks verify the binding but never inflate action counts.
  if(data.event==='health')return new Response(null,{status:204,headers});
  try{env.PRINT_PON_EVENTS.writeDataPoint({indexes:['print_pon'],blobs:[data.event,data.page],doubles:[1]});}
  catch{return new Response(null,{status:503,headers});}
  return new Response(null,{status:204,headers});
 }
};
