/* Keep the existing Web Analytics property across Pages deployment modes. */
(()=>{
 'use strict';
 const src='https://static.cloudflareinsights.com/beacon.min.js';
 function ensureBeacon(){
  if([...document.scripts].some(s=>s.src.startsWith(src)))return;
  const script=document.createElement('script');
  script.src=src;script.defer=true;
  script.dataset.cfBeacon=JSON.stringify({token:'60038f3f421648d3bc5ecf09f3cd4061'});
  document.body.appendChild(script);
 }
 if(document.readyState==='complete')ensureBeacon();
 else window.addEventListener('load',ensureBeacon,{once:true});
})();
