/* Print PON! arithmetic engine. All calculations run locally. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  if(root)root.PrintPonGenerator=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const symbols={add:'＋',sub:'−',mul:'×',div:'÷'};
  const remainderModes=['none','only','mixed'];
  function range(d){if(!Number.isInteger(d)||d<1||d>3)throw Error('けた数は1〜3から選んでね。');return {min:d===1?1:10**(d-1),max:10**d-1};}
  function rand(lo,hi,random){return lo+Math.floor(random()*(hi-lo+1));}
  function shuffle(items,random){for(let i=items.length-1;i>0;i--){const j=rand(0,i,random);[items[i],items[j]]=[items[j],items[i]];}return items;}
  function make(op,a,b){
    const remainder=op==='div'?a%b:0;
    const ans=op==='add'?a+b:op==='sub'?a-b:op==='mul'?a*b:Math.floor(a/b);
    return {op,a,b,answer:ans,remainder,display:`${a} ${symbols[op]} ${b}`};
  }
  // 3-digit ÷ 3-digit: omit quotient 1 to prevent n ÷ n dominating the sheet.
  function minQuotient(left,right){return left===3&&right===3?2:1;}
  function remainderBounds(A,b,q){return [Math.max(1,A.min-b*q),Math.min(b-1,A.max-b*q)];}
  function divisionCapacity(left,right,mode,maxQuotient=Infinity){
    const A=range(left),B=range(right),qFloor=minQuotient(left,right);
    let exact=0,withRemainder=0;
    for(let b=B.min;b<=B.max;b++){
      if(mode!=='only'){
        const low=Math.max(qFloor,Math.ceil(A.min/b)),high=Math.min(maxQuotient,Math.floor(A.max/b));
        if(high>=low)exact+=high-low+1;
      }
      if(mode!=='none'&&b>1){
        const low=Math.max(qFloor,Math.floor(A.min/b)),high=Math.min(maxQuotient,Math.floor(A.max/b));
        for(let q=low;q<=high;q++){
          const [rLo,rHi]=remainderBounds(A,b,q);
          if(rHi>=rLo)withRemainder+=rHi-rLo+1;
        }
      }
    }
    return {exact,withRemainder,total:exact+withRemainder};
  }
  function capacity(op,left,right,remainderMode='none',maxQuotient=Infinity){
    const A=range(left),B=range(right);
    if(op==='add'||op==='mul')return(A.max-A.min+1)*(B.max-B.min+1);
    if(op==='sub'){let total=0;for(let b=B.min;b<=Math.min(B.max,A.max);b++)total+=A.max-Math.max(A.min,b)+1;return total;}
    if(op==='div')return divisionCapacity(left,right,remainderMode,maxQuotient).total;
    throw Error('計算の種類を選んでね。');
  }
  // A bucket stores one entry per exact expression or per possible quotient/divisor
  // combination with nonzero remainder. We sample remainder values lazily, avoiding
  // hundreds of thousands of objects for the 3-digit/3-digit case.
  function divisionPools(left,right,mode,random,maxQuotient=Infinity){
    const A=range(left),B=range(right),qFloor=minQuotient(left,right);
    const pools={exact:new Map(),remainder:new Map()};
    function bucket(type,q){if(!pools[type].has(q))pools[type].set(q,[]);return pools[type].get(q);}
    for(let b=B.min;b<=B.max;b++){
      if(mode!=='only'){
        const qMin=Math.max(qFloor,Math.ceil(A.min/b)),qMax=Math.min(maxQuotient,Math.floor(A.max/b));
        for(let q=qMin;q<=qMax;q++)bucket('exact',q).push(make('div',b*q,b));
      }
      if(mode!=='none'&&b>1){
        const qMin=Math.max(qFloor,Math.floor(A.min/b)),qMax=Math.min(maxQuotient,Math.floor(A.max/b));
        for(let q=qMin;q<=qMax;q++){
          const [lo,hi]=remainderBounds(A,b,q);
          if(lo<=hi)bucket('remainder',q).push({b,q,lo,hi,used:new Set()});
        }
      }
    }
    for(const map of Object.values(pools))for(const pool of map.values())shuffle(pool,random);
    return pools;
  }
  function otherPool(op,left,right,random){const A=range(left),B=range(right),out=[];
    for(let a=A.min;a<=A.max;a++)for(let b=B.min;b<=B.max;b++){
      if(op==='sub'&&a<b)continue;
      out.push(make(op,a,b));
    }
    return shuffle(out,random);
  }
  function makeProblems(settings,random=Math.random){
    const {op,left,right,count}=settings;
    const remainderMode=settings.remainderMode||'none';
    const maxQuotient=settings.maxQuotient??Infinity;
    if(maxQuotient!==Infinity&&(!Number.isInteger(maxQuotient)||maxQuotient<1))throw Error('商の上限を確認してください。');
    if(!['add','sub','mul','div','mix'].includes(op))throw Error('計算の種類を選んでね。');
    if(![10,20,30,50].includes(count))throw Error('問題数を選んでね。');
    if(!remainderModes.includes(remainderMode))throw Error('あまりの設定を選んでね。');
    const operations=op==='mix'?['add','sub','mul','div']:[op];
    const possible=operations.filter(k=>capacity(k,left,right,remainderMode,maxQuotient)>0);
    const total=possible.reduce((sum,k)=>sum+capacity(k,left,right,remainderMode,maxQuotient),0);
    if(!possible.length)throw Error('このけた数では条件に合う問題を作れません。わられる数を大きくするか、わる数を小さくしてね。');
    if(total<count)throw Error(`この設定で重複なしに作れる問題は最大${total}問です。問題数を減らすか、けた数・あまりの設定を変えてね。`);
    const pools=possible.includes('div')?divisionPools(left,right,remainderMode,random,maxQuotient):null;
    const used=new Set(),output=[],nonDivPools=new Map();
    const divTypeCount={exact:0,remainder:0},divQuotCount={exact:new Map(),remainder:new Map()};
    function pullDivision(){
      let types=Object.keys(pools).filter(type=>[...pools[type].values()].some(arr=>arr.length));
      if(!types.length)return null;
      const min=Math.min(...types.map(t=>divTypeCount[t]));
      types=types.filter(t=>divTypeCount[t]===min);
      const type=types[rand(0,types.length-1,random)];
      const viable=[...pools[type].entries()].filter(([,arr])=>arr.length>0);
      const minQ=Math.min(...viable.map(([q])=>divQuotCount[type].get(q)||0));
      const candidates=viable.filter(([q])=>(divQuotCount[type].get(q)||0)===minQ);
      const [q,arr]=candidates[rand(0,candidates.length-1,random)];
      let item;
      if(type==='exact')item=arr.pop();
      else{
        const desc=arr[rand(0,arr.length-1,random)];
        let r=rand(desc.lo,desc.hi,random),tries=0;
        while(desc.used.has(r)&&tries++<16)r=rand(desc.lo,desc.hi,random);
        if(desc.used.has(r)){
          for(r=desc.lo;desc.used.has(r)&&r<=desc.hi;r++);
        }
        if(r>desc.hi)throw Error('内部エラー：あまりの重複検出に失敗しました。');
        desc.used.add(r);
        item=make('div',desc.b*desc.q+r,desc.b);
        if(desc.used.size===desc.hi-desc.lo+1)arr.splice(arr.indexOf(desc),1);
      }
      divTypeCount[type]++;
      divQuotCount[type].set(q,(divQuotCount[type].get(q)||0)+1);
      return item;
    }
    function pullOther(kind){
      const cap=capacity(kind,left,right);
      if(cap<=2200){
        if(!nonDivPools.has(kind))nonDivPools.set(kind,otherPool(kind,left,right,random));
        return nonDivPools.get(kind).pop()||null;
      }
      const A=range(left),B=range(right);
      for(let tries=0;tries<600;tries++){
        let a,b;
        if(kind==='sub'){
          b=rand(B.min,Math.min(B.max,A.max),random);
          a=rand(Math.max(A.min,b),A.max,random);
        }else{a=rand(A.min,A.max,random);b=rand(B.min,B.max,random);}
        if(!used.has(`${kind}-${a}-${b}`))return make(kind,a,b);
      }
      const rest=otherPool(kind,left,right,random).filter(x=>!used.has(`${kind}-${x.a}-${x.b}`));
      return rest.pop()||null;
    }
    for(let i=0;i<count;i++){
      let chosen=null;
      const rotation=possible.map((_,offset)=>possible[(i+offset)%possible.length]);
      for(const kind of rotation){chosen=kind==='div'?pullDivision():pullOther(kind);if(chosen)break;}
      if(!chosen)throw Error('条件に合う問題が足りません。問題数を減らすか、けた数を変えてね。');
      const key=`${chosen.op}-${chosen.a}-${chosen.b}`;
      if(used.has(key))throw Error('内部エラー：問題が重複しました。設定を変えて試してください。');
      used.add(key);output.push(chosen);
    }
    return output;
  }
  return {range,capacity,divisionCapacity,makeProblems};
});
