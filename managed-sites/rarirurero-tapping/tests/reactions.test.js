import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseReaction,pointPosition,MOTIONS,createReactions} from '../dist/reactions.js';
test('small reactions dominate; large reaction chance grows with time and all motions are reachable',()=>{
 let early=0,late=0;
 for(let i=0;i<1000;i++){early+=chooseReaction(0,()=>i/1000).big;late+=chooseReaction(1,()=>i/1000).big;}
 assert.equal(early,120);assert.equal(late,300);
 for(let i=0;i<MOTIONS.length;i++){let n=0;const r=chooseReaction(.5,()=>n++===0?0:(i+.5)/MOTIONS.length);assert.equal(r.motion,MOTIONS[i]);}
});
test('random point origins stay readable within mobile widths and vary across lanes',()=>{
 for(const w of [280,320,375,450]){const xs=new Set();for(let i=0;i<1000;i++){const p=pointPosition(w,288,i);assert.ok(p.x>=42&&p.x<=w-42);assert.ok(p.y>=65&&p.y<=130);xs.add(Math.floor(p.x/30));}assert.ok(xs.size>=5);}
});
class El {
 constructor(){this.children=[];this.style={setProperty(){}};this.anims=[];}
 get childElementCount(){return this.children.length;}get firstChild(){return this.children[0];}
 append(...els){for(const e of els){e.remove();e.parent=this;this.children.push(e);}}
 prepend(e){e.remove();e.parent=this;this.children.unshift(e);}
 remove(){if(this.parent){this.parent.children=this.parent.children.filter(e=>e!==this);this.parent=null;}}
 replaceChildren(){for(const c of this.children)c.parent=null;this.children=[];}
 setAttribute(){}getBoundingClientRect(){return {width:320,height:288};}
 animate(){const a={cancel:()=>{this.anims=this.anims.filter(x=>x!==a);a.oncancel?.();}};this.anims.push(a);return a;}
 getAnimations(){return this.anims;}
}
test('rapid taps keep effects bounded; round cleanup removes animations and overlays',()=>{
 globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 globalThis.document={createElement:()=>new El()};globalThis.matchMedia=()=>({matches:false});
 const nodes=Object.fromEntries(['character','robot','arena','machine','effects'].map(k=>[k,new El()]));nodes.robot.src='assets/normal.png';
 const fx=createReactions(nodes);
 for(let i=0;i<500;i++)fx.tap(i/500,i*20);
 const motion=nodes.character.children[0],back=motion.children[0],front=motion.children[2];
 assert.ok(back.childElementCount<=12);assert.ok(front.childElementCount<=12);
 fx.clear();assert.equal(back.childElementCount,0);assert.equal(front.childElementCount,0);
 for(const e of [nodes.robot,motion,nodes.machine])assert.equal(e.getAnimations().length,0);
});
