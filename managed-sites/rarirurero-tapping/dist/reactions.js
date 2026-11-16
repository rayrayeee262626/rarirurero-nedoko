// Presentation only: never reads points, score, result form, or scoring RNG.
export const MOTIONS = ['squash','stretch','tilt','jump','tremble','spin','burst'];
export function chooseReaction(progress, random = Math.random) {
 const p=Math.max(0,Math.min(1,progress));
 const big=random()<.12+p*.18;
 return {big, motion:MOTIONS[Math.min(MOTIONS.length-1,Math.floor(random()*MOTIONS.length))], level:p>.7?2:p>.35?1:0};
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
 // One bounded spring per property: new taps add energy instead of cancelling motion.
 const state={x:0,y:0,r:0,s:0},velocity={x:0,y:0,r:0,s:0};
 let raf=0,previous=0,shake=0;
 const limit={x:7,y:17,r:11,s:.12};
 function step(time){
  const dt=Math.min(2,Math.max(.3,(time-previous)/16.667||1));previous=time;
  let active=false;
  for(const key of Object.keys(state)){
   velocity[key]=(velocity[key]-state[key]*.18*dt)*Math.pow(.72,dt);
   state[key]=Math.max(-limit[key],Math.min(limit[key],state[key]+velocity[key]*dt));
   if(Math.abs(state[key])+Math.abs(velocity[key])>(key==='s'?.0005:.02))active=true;
  }
  shake*=Math.pow(.75,dt);
  const jitter=Math.sin(time*.12)*shake;
  // Keep the image inside its stage even when impulses overlap.
  const w=motion.clientWidth||220,h=motion.clientHeight||240;
  const angle=state.r*Math.PI/180, sx=1+state.s,sy=1-state.s;
  const halfX=(Math.abs(w*sx*Math.cos(angle))+Math.abs(h*sy*Math.sin(angle)))/2;
  const halfY=(Math.abs(h*sy*Math.cos(angle))+Math.abs(w*sx*Math.sin(angle)))/2;
  const safeScale=Math.min(1,(arena.clientWidth-16)/(2*halfX),(arena.clientHeight-20)/(2*halfY));
  const maxX=Math.max(0,(arena.clientWidth-2*halfX*safeScale)/2-6);
  const maxY=Math.max(0,(arena.clientHeight-2*halfY*safeScale)/2-6);
  const tx=Math.max(-maxX,Math.min(maxX,state.x+jitter));
  // Centre of the fixed target relative to the stage's centre.
  const centreOffset=arena.clientHeight/2-12-h/2;
  const ty=Math.max(-maxY-centreOffset,Math.min(maxY-centreOffset,state.y));
  motion.style.transform=`translate(${tx}px,${ty}px) rotate(${state.r}deg) scale(${sx*safeScale},${sy*safeScale})`;
  if(active||shake>.03)raf=requestAnimationFrame(step);
  else {motion.style.transform='';raf=0;previous=0;}
 }
 function impulse(reaction){
  const dir=Math.random()<.5?-1:1, power=reaction.big?1.3:1;
  const add=(key,value)=>{velocity[key]=Math.max(-limit[key]*.9,Math.min(limit[key]*.9,velocity[key]+value*power));};
  switch(reaction.motion){
   case 'squash':add('s',.09);add('y',2);break;
   case 'stretch':add('s',-.075);add('y',-5);break;
   case 'tilt':add('r',dir*6);add('x',dir*2);break;
   case 'jump':add('y',-12);add('s',-.035);break;
   case 'tremble':shake=Math.min(3,shake+2);add('r',dir*2);break;
   case 'spin':add('r',dir*9);add('y',-3);break;
   case 'burst':add('r',dir*6);add('y',-8);add('s',.06);shake=Math.min(3,shake+1);break;
  }
  if(!raf)raf=requestAnimationFrame(step);
 }
 let lastBig=-Infinity,lastDecor=-Infinity,pointIndex=0,animations=new Set(),timers=new Set();
 function animate(el,frames,options){const a=el.animate(frames,options);animations.add(a);a.onfinish=a.oncancel=()=>animations.delete(a);return a;}
 function temporary(parent,cls,life=600){if(parent.childElementCount>=12)parent.firstChild.remove();const el=document.createElement('span');el.className=cls;parent.append(el);const timer=setTimeout(()=>{el.remove();timers.delete(timer);},life);timers.add(timer);return el;}
 function clear(){cancelAnimationFrame(raf);raf=previous=shake=0;for(const k of Object.keys(state)){state[k]=velocity[k]=0;}motion.style.transform='';for(const a of [...animations])a.cancel();for(const t of timers)clearTimeout(t);timers.clear();back.replaceChildren();front.replaceChildren();lastBig=lastDecor=-Infinity;pointIndex=0;}
 function tap(progress,now){
 const reaction=chooseReaction(progress);const rect=arena.getBoundingClientRect();
 const position=pointPosition(rect.width,rect.height,pointIndex++);
 if(reduced.matches)return position;
 impulse(reaction);
 const big=reaction.big&&now-lastBig>370;
 if(big){lastBig=now;
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
