// Presentation only: never reads points, score, result form, or scoring RNG.
export const MOTIONS = ['stretch','tilt','jump','tremble','burst'];
export function chooseReaction(progress, random = Math.random) {
 const p=Math.max(0,Math.min(1,progress));
 const big=random()<.12+p*.18;
 return {big, motion:big?MOTIONS[Math.min(4,Math.floor(random()*5))]:'small', level:p>.7?2:p>.35?1:0};
}
export function pointPosition(width,height,index,random=Math.random){
 // Shuffle across the upper band; independent of pointer position.
 const lane=(index+Math.floor(random()*4))%5;
 return {x:42+(Math.max(0,width-84))*(lane+.2+random()*.6)/5,y:65+random()*Math.min(65,height*.23)};
}
export function createReactions({character,robot,arena,machine,effects}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const motion=document.createElement('span');motion.className='reaction-motion';
 character.append(motion);motion.append(robot);
 const back=document.createElement('span');back.className='reaction-back';back.setAttribute('aria-hidden','true');motion.prepend(back);
 const front=document.createElement('span');front.className='reaction-front';front.setAttribute('aria-hidden','true');motion.append(front);
 let lastBig=-Infinity,lastDecor=-Infinity,pointIndex=0,animations=new Set(),timers=new Set();
 function animate(el,frames,options){const a=el.animate(frames,options);animations.add(a);a.onfinish=a.oncancel=()=>animations.delete(a);return a;}
 function temporary(parent,cls,life=600){if(parent.childElementCount>=12)parent.firstChild.remove();const el=document.createElement('span');el.className=cls;parent.append(el);const timer=setTimeout(()=>{el.remove();timers.delete(timer);},life);timers.add(timer);return el;}
 function clear(){for(const a of [...animations])a.cancel();for(const t of timers)clearTimeout(t);timers.clear();back.replaceChildren();front.replaceChildren();lastBig=lastDecor=-Infinity;pointIndex=0;}
 function tap(progress,now){
 const reaction=chooseReaction(progress);const rect=arena.getBoundingClientRect();
 const position=pointPosition(rect.width,rect.height,pointIndex++);
 if(reduced.matches)return position;
 robot.getAnimations().forEach(a=>a.cancel());
 animate(robot,[{transform:'scale(1)'},{transform:'scale(1.13,.84)'},{transform:'scale(.95,1.07)'},{transform:'scale(1)'}],{duration:180,easing:'ease-out'});
 const big=reaction.big&&now-lastBig>370;
 if(big){lastBig=now;const dir=Math.random()<.5?-1:1;
 const frames={
 stretch:['scale(1)','scale(1.08,.86)','translateY(-12px) scale(.88,1.13)','scale(1)'],
 tilt:['rotate(0deg)',`rotate(${dir*15}deg)` ,`rotate(${-dir*9}deg)`,'rotate(0deg)'],
 jump:['translateY(0) scale(1)','translateY(3px) scale(1.1,.9)','translateY(-29px) scale(.96,1.04)','translateY(0) scale(1.06,.94)','translateY(0) scale(1)'],
 tremble:['translateX(0)','translateX(-4px) rotate(-2deg)','translateX(4px) rotate(2deg)','translateX(-3px)','translateX(3px)','translateX(0)'],
 burst:['translate(0) rotate(0)','translate(-9px,-11px) rotate(-12deg)','translate(9px,-18px) rotate(12deg)','translate(-5px,-6px) rotate(-6deg)','translate(0) rotate(0)']
 };
 animate(motion,frames[reaction.motion].map(transform=>({transform})),{duration:350,easing:'ease-out'});
 temporary(back,'comic-impact',420);
 const ghosts=temporary(back,'afterimages',360);
 for(const sign of [-1,1]){const img=document.createElement('img');img.src=robot.src;img.alt='';img.draggable=false;ghosts.append(img);animate(img,[{transform:'translateX(0)',opacity:.23},{transform:`translateX(${sign*26}px)`,opacity:0}],{duration:330});}
 if(reaction.motion==='burst')animate(machine,[{transform:'translate(0)'},{transform:'translate(-2px,1px)'},{transform:'translate(2px,-1px)'},{transform:'translate(-1px,0)'},{transform:'translate(0)'}],{duration:230});
 }
 if(now-lastDecor> (reaction.level===2?125:220)){
 lastDecor=now;
 temporary(front,'eye-glow',230);
 const stars=temporary(front,'head-stars',580);
 for(let i=0;i<2+reaction.level;i++){const s=document.createElement('span');s.textContent=i%2?'✧':'✦';s.style.left=(12+Math.random()*76)+'%';s.style.top=(2+Math.random()*30)+'%';s.style.setProperty('--star-x',(Math.random()-.5)*40+'px');stars.append(s);}
 if(!big&&Math.random()<.15+progress*.25)temporary(back,'comic-impact small-impact',400);
 }
 return position;
 }
 return {tap,clear};
}
