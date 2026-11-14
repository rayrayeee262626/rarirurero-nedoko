import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../../',import.meta.url);
const topics=JSON.parse(fs.readFileSync(new URL('topics.json',import.meta.url)));
const sandbox={module:{exports:{}},Math};vm.runInNewContext(fs.readFileSync(new URL('dist/generator.js',root),'utf8'),sandbox);
const g=sandbox.module.exports;
let checks=0;
function rng(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function verify(s,random){const qs=g.makeProblems(s,random);assert.equal(qs.length,s.count);assert.equal(new Set(qs.map(q=>`${q.op}/${q.a}/${q.b}`)).size,s.count);
 for(const q of qs){assert(q.a>=g.range(s.left).min&&q.a<=g.range(s.left).max);assert(q.b>=g.range(s.right).min&&q.b<=g.range(s.right).max);
  if(q.op==='div'){assert.equal(q.answer*q.b+q.remainder,q.a);assert(q.remainder>=0&&q.remainder<q.b);if(s.remainderMode==='none')assert.equal(q.remainder,0);if(s.remainderMode==='only')assert(q.remainder>0);if(s.maxQuotient)assert(q.answer<=s.maxQuotient);}
  else{assert.equal(q.answer,q.op==='add'?q.a+q.b:q.op==='sub'?q.a-q.b:q.a*q.b);assert(q.answer>=0);}
 }checks++;
}
for(const op of ['add','sub','mul','div','mix'])for(let left=1;left<=3;left++)for(let right=1;right<=3;right++)for(const count of [10,20,30,50])for(const remainderMode of ['none','only','mixed']){
 const s={op,left,right,count,remainderMode};const operations=op==='mix'?['add','sub','mul','div']:[op];const capacity=operations.reduce((sum,k)=>sum+g.capacity(k,left,right,remainderMode),0);
 if(capacity<count)assert.throws(()=>g.makeProblems(s));else verify(s,rng(42));
}
for(const topic of topics){for(const count of topic.counts)for(let seed=1;seed<=10;seed++)verify({...topic.settings,count},rng(seed));
 for(const [a,b] of topic.samples){assert(a>=g.range(topic.settings.left).min&&a<=g.range(topic.settings.left).max);assert(b>=g.range(topic.settings.right).min&&b<=g.range(topic.settings.right).max);if(topic.settings.op==='div'){if(topic.settings.maxQuotient)assert(Math.floor(a/b)<=topic.settings.maxQuotient);if(topic.settings.remainderMode==='none')assert.equal(a%b,0);if(topic.settings.remainderMode==='only')assert(a%b>0);}}
 if(topic.grade===3&&topic.settings.op==='div')assert.equal(topic.settings.maxQuotient,9);
}
const workerSource=fs.readFileSync(new URL('event-worker.mjs',import.meta.url),'utf8').replace('__TOPIC_IDS__',JSON.stringify(topics.map(t=>t.slug)));
const worker=(await import('data:text/javascript;base64,'+Buffer.from(workerSource).toString('base64'))).default;
const writes=[];const env={PRINT_PON_EVENTS:{writeDataPoint:x=>writes.push(x)},ASSETS:{fetch:()=>new Response('static')}};
function req(data,options={}){return new Request('https://print-pon.pages.dev/api/events',{method:'POST',headers:{Origin:'https://print-pon.pages.dev','Content-Type':'application/json',...options.headers},body:JSON.stringify(data)});}
for(const event of ['generate','pdf','print'])assert.equal((await worker.fetch(req({event,page:topics[0].slug}),env)).status,204);
assert.equal(writes.length,3);assert.deepEqual(writes[0],{indexes:['print_pon'],blobs:['generate',topics[0].slug],doubles:[1]});
assert.equal((await worker.fetch(req({event:'health',page:'home'}),env)).status,204);assert.equal(writes.length,3);
for(const bad of [{event:'pdf',page:'home',name:'private'},{event:'email',page:'home'},{event:'pdf',page:'?name=private'},null,[],{event:'pdf',page:'home',settings:{count:20}}])assert.equal((await worker.fetch(req(bad),env)).status,400);
assert.equal((await worker.fetch(req({event:'pdf',page:'home'},{headers:{Origin:'https://other.example'}}),env)).status,403);
assert.equal((await worker.fetch(req({event:'pdf',page:'home'},{headers:{DNT:'1'}}),env)).status,204);assert.equal(writes.length,3);
assert.equal((await worker.fetch(req({event:'pdf',page:'home'},{headers:{'Sec-GPC':'1'}}),env)).status,204);assert.equal(writes.length,3);
assert.equal((await worker.fetch(req({event:'pdf',page:'home'}),{})).status,503);
assert.equal((await worker.fetch(new Request('https://print-pon.pages.dev/api/events'),env)).status,405);
assert.equal((await worker.fetch(req({event:'pdf',page:'x'.repeat(300)}),env)).status,413);
assert.equal(await (await worker.fetch(new Request('https://print-pon.pages.dev/grade-1/addition/'),env)).text(),'static');
console.log(`${checks} arithmetic/topic cases passed; event allowlist, privacy controls, limits and static passthrough passed.`);
