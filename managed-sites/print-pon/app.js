/* ぷりぽんっ -Print PON!- | All exercises and PDFs are generated locally. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const el={left:$('#leftDigits'),right:$('#rightDigits'),count:$('#questionCount'),answers:$('#includeAnswers'),preview:$('#previewSheet'),notice:$('#notice'),hint:$('#previewHint'),print:$('#printArea'),pdf:$('#pdfBtn'),printBtn:$('#printBtn'),gen:$('#generateBtn'),tabProblem:$('#previewProblemTab'),tabAnswer:$('#previewAnswerTab'),preset:$('#gradePresets'),remainderGroup:$('#remainderGroup')};
const {makeProblems}=globalThis.PrintPonGenerator;
const topic=JSON.parse(document.querySelector('#topicConfig')?.textContent||'null');
const URL_SITE='https://print-pon.pages.dev/'+(topic?topic.slug+'/':'');
const worksheetTitle=topic?`小${topic.grade} ${topic.label}`:'けいさん プリント';
function track(event){
  if(document.documentElement.dataset.events!=='enabled'||navigator.doNotTrack==='1'||navigator.globalPrivacyControl)return;
  // Fixed action and public page ID only: no cookies, settings, problems or identifiers.
  fetch('/api/events',{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({event,page:topic?topic.slug:'home'})}).catch(()=>{});
}
let questions=[],previewMode='problem';
const grades={
 'pre':{op:'add',left:1,right:1,count:10,remainderMode:'none'},
 '1':{op:'add',left:1,right:1,count:20,remainderMode:'none'},
 '2':{op:'sub',left:2,right:1,count:20,remainderMode:'none'},
 '3':{op:'mul',left:2,right:1,count:20,remainderMode:'mixed'},
 '4':{op:'div',left:3,right:1,count:20,remainderMode:'mixed'},
 '5':{op:'mix',left:3,right:2,count:30,remainderMode:'mixed'}
};
function selectedOperation(){return document.querySelector('input[name="operation"]:checked').value;}
function updateRemainderVisibility(){el.remainderGroup.hidden=selectedOperation()!=='div';}
function settings(){const op=selectedOperation();return {op,left:+el.left.value,right:+el.right.value,count:+el.count.value,answers:el.answers.checked,remainderMode:op==='mix'?'mixed':document.querySelector('input[name="remainderMode"]:checked').value,...(topic?.settings.maxQuotient?{maxQuotient:topic.settings.maxQuotient}:{})};}
function clearPreset(){el.preset.querySelectorAll('[data-grade]').forEach(btn=>{btn.classList.remove('active');btn.setAttribute('aria-pressed','false');});}
function status(message,type=''){el.notice.textContent=message;el.notice.className='notice'+(type?' '+type:'');}
function groups(){const mid=Math.ceil(questions.length/2);return [questions.slice(0,mid),questions.slice(mid)];}
function qText(q,isAnswer){
  const hasRemainder=q.op==='div'&&q.remainder>0;
  const result=isAnswer?(hasRemainder?`${q.answer} あまり ${q.remainder}`:String(q.answer)):(hasRemainder?'___ あまり ___':'______');
  return q.display+' = '+result;
}
function footerDOM(className){const f=document.createElement('div');f.className=className;
  const txt=document.createElement('span');txt.textContent='何度でも無料｜ぷりぽんっ -Print PON!-｜print-pon.pages.dev';
  const img=document.createElement('img');img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(globalThis.PRINT_PON_QR_SVG);img.alt='ぷりぽんっのQRコード';img.width=40;img.height=40;
  f.append(txt,img);return f;
}
function renderPreview(){el.tabAnswer.disabled=!el.answers.checked;el.tabAnswer.setAttribute('aria-selected',String(previewMode==='answer'));
  el.tabProblem.setAttribute('aria-selected',String(previewMode==='problem'));
  if(!el.answers.checked)previewMode='problem';
  el.tabAnswer.disabled=!el.answers.checked;
  el.tabProblem.classList.toggle('is-selected',previewMode==='problem');el.tabAnswer.classList.toggle('is-selected',previewMode==='answer');
  el.tabProblem.setAttribute('aria-selected',String(previewMode==='problem'));el.tabAnswer.setAttribute('aria-selected',String(previewMode==='answer'));
  el.preview.replaceChildren();el.preview.className='preview-sheet count-'+questions.length;
  if(!questions.length)return;
  const top=document.createElement('div');top.className='sheet-top';top.innerHTML='<span>ぷりぽんっ - Print PON! -</span><span>計算プリント</span>';el.preview.appendChild(top);
  const title=document.createElement('div');title.className='sheet-heading';title.textContent=previewMode==='answer'?worksheetTitle+'｜こたえ':worksheetTitle;el.preview.appendChild(title);
  const info=document.createElement('div');info.className='sheet-ident';info.innerHTML='<span>なまえ __________________</span><span></span>';info.lastChild.textContent=previewMode==='answer'?'【解答】':'てんすう ______ / '+questions.length;el.preview.appendChild(info);
  const grid=document.createElement('div');grid.className='sheet-questions';const split=groups();split.forEach((col,idx)=>{
    const wrap=document.createElement('div');wrap.className='sheet-question-col';col.forEach((q,i)=>{
      const item=document.createElement('div');item.className='sheet-question'+(q.remainder>0?' has-remainder':'');item.textContent='('+(idx*split[0].length+i+1)+') '+qText(q,previewMode==='answer');wrap.appendChild(item);
    });grid.appendChild(wrap);
  });el.preview.appendChild(grid);el.preview.appendChild(footerDOM('sheet-footer'));
  el.hint.textContent=`${questions.length}問の計算プリントができたよ！${el.answers.checked?' 答えつき':''}`;
}
function renderPrintPage(withAnswers){const page=document.createElement('section');page.className='print-page count-'+questions.length;
  const top=document.createElement('div');top.className='print-masthead';top.innerHTML='<span>ぷりぽんっ -Print PON!-</span><span>小学生のための計算プリント</span>';page.appendChild(top);
  const title=document.createElement('div');title.className='print-title';title.textContent=withAnswers?worksheetTitle+'｜こたえ':worksheetTitle;page.appendChild(title);
  const info=document.createElement('div');info.className='print-info';info.innerHTML='<span>なまえ __________________________________</span><span></span>';info.lastChild.textContent=withAnswers?'【解答】':'てんすう ______ / '+questions.length;page.appendChild(info);
  const grid=document.createElement('div');grid.className='print-grid';let split=groups();split.forEach((col,idx)=>{const wrap=document.createElement('div');wrap.className='print-col';col.forEach((q,i)=>{
    const item=document.createElement('div');item.className='print-q'+(q.remainder>0?' has-remainder':'');item.textContent='('+(idx*split[0].length+i+1)+')　'+qText(q,withAnswers);wrap.appendChild(item);
  });grid.appendChild(wrap);});page.appendChild(grid);page.appendChild(footerDOM('print-foot'));return page;
}
function renderPrintable(){el.print.replaceChildren();if(!questions.length)return;el.print.appendChild(renderPrintPage(false));if(el.answers.checked)el.print.appendChild(renderPrintPage(true));}
function generate(action=false){try{questions=makeProblems(settings());renderPreview();renderPrintable();el.pdf.disabled=false;el.printBtn.disabled=false;status('見本の問題で、すぐPDF保存・印刷できます。','success');if(action)track('generate');return true;}
  catch(error){questions=[];el.print.replaceChildren();el.preview.replaceChildren();el.pdf.disabled=true;el.printBtn.disabled=true;el.hint.textContent='この条件では作れません。設定を見直してね。';status(error.message,'error');return false;}
}
function drawQr(ctx,x,y,side){const matrix=globalThis.PRINT_PON_QR;const size=matrix.length,pad=4,unit=side/(size+pad*2);
  ctx.fillStyle='#fff';ctx.fillRect(x,y,side,side);ctx.fillStyle='#202024';for(let row=0;row<size;row++)for(let col=0;col<size;col++)if(matrix[row][col]==='1')ctx.fillRect(x+(col+pad)*unit,y+(row+pad)*unit,Math.ceil(unit*100)/100,Math.ceil(unit*100)/100);
}
function drawPdfPage(withAnswers){const scale=2.6,W=595.28,H=841.89;const canvas=document.createElement('canvas');canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);
  const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#181818';ctx.textBaseline='middle';
  const sans='"Yu Gothic","Hiragino Kaku Gothic ProN","Meiryo",sans-serif';
  const text=(s,x,y,size=13,weight='400',align='left')=>{ctx.fillStyle='#181818';ctx.font=`${weight} ${size}px ${sans}`;ctx.textAlign=align;ctx.fillText(s,x,y);};
  const line=(x,y,x2,y2,color='#ddd')=>{ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=.65;ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();};
  const margin=42,contentW=W-margin*2; text('ぷりぽんっ  - Print PON! -',margin,39,10,'600');text('小学生のための計算プリント',W-margin,39,9,'400','right');line(margin,53,W-margin,53,'#888');
  text(withAnswers?worksheetTitle+'｜こたえ':worksheetTitle,W/2,87,20,'900','center');
  text('なまえ _________________________',margin,128,11);text(withAnswers?'【解答】':`てんすう ______ / ${questions.length}`,W-margin,128,11,'400','right');
  const split=groups(),perColumn=split[0].length,startY=172,available=H-startY-83;
  const step=Math.min(118,available/perColumn),fontSize=perColumn<=5?19:perColumn<=10?16:perColumn<=15?14:12.5;
  split.forEach((col,idx)=>{const x=margin+idx*(contentW/2+4);col.forEach((q,i)=>{const n=idx*perColumn+i+1,s='('+n+')  '+qText(q,withAnswers);
    let fitted=fontSize;const maxWidth=contentW/2-10;
    ctx.font=`400 ${fitted}px ${sans}`;
    while(fitted>8&&ctx.measureText(s).width>maxWidth){fitted-=.5;ctx.font=`400 ${fitted}px ${sans}`;}
    text(s,x,startY+i*step,fitted);});});
  line(margin,H-69,W-margin,H-69);text('何度でも無料｜ぷりぽんっ -Print PON!-',margin,H-46,9);text('print-pon.pages.dev',margin,H-30,9);
  drawQr(ctx,W-margin-52,H-65,52);return canvas;
}
function b64ToBytes(b64){let bin=atob(b64),data=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)data[i]=bin.charCodeAt(i);return data;}
function buildPdf(canvases){const enc=new TextEncoder();let out=[],offset=0,xref=[0];const put=(str)=>{const b=enc.encode(str);out.push(b);offset+=b.length;};const push=(bytes)=>{out.push(bytes);offset+=bytes.length;};const addObj=(n,head,bytes=null,foot='')=>{xref[n]=offset;put(`${n} 0 obj\n`);put(head);if(bytes)push(bytes);if(foot)put(foot);put('\nendobj\n');};
 put('%PDF-1.4\n%PrintPON\n');let pagesIds=[];let images=canvases.map(c=>{let data=c.toDataURL('image/jpeg',.91);return{bytes:b64ToBytes(data.split(',')[1]),w:c.width,h:c.height};});let count=2+images.length*3;
 addObj(1,'<< /Type /Catalog /Pages 2 0 R >>');
 images.forEach((_,i)=>pagesIds.push(`${5+i*3} 0 R`));
 addObj(2,`<< /Type /Pages /Kids [${pagesIds.join(' ')}] /Count ${images.length} >>`);
 images.forEach((im,i)=>{let img=3+i*3,content=img+1,page=img+2;addObj(img,`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`,im.bytes,'\nendstream');let stream=enc.encode('q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n');addObj(content,`<< /Length ${stream.length} >>\nstream\n`,stream,'endstream');addObj(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${img} 0 R >> >> /Contents ${content} 0 R >>`);});
 let start=offset;put(`xref\n0 ${count+1}\n0000000000 65535 f \n`);for(let i=1;i<=count;i++)put(`${String(xref[i]).padStart(10,'0')} 00000 n \n`);put(`trailer\n<< /Size ${count+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`);
 return new Blob(out,{type:'application/pdf'});}

function downloadPdf(){if(!questions.length&&!generate())return;el.pdf.disabled=true;el.pdf.textContent='PDFを作成中…';
  try{const canvases=[drawPdfPage(false)];if(el.answers.checked)canvases.push(drawPdfPage(true));const blob=buildPdf(canvases);const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=(topic?topic.slug.replaceAll('/','-'):'puripon-keisan')+'-'+new Date().toISOString().slice(0,10)+'.pdf';document.body.appendChild(link);link.click();track('pdf');link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),15000);status('PDFを保存しました。ダウンロードフォルダを確認してね。','success');}
  catch(error){console.error(error);status('PDFの作成に失敗しました。印刷画面から「PDFに保存」も試してね。','error');}
  finally{el.pdf.disabled=false;el.pdf.innerHTML='<span aria-hidden="true">↓</span> PDFを保存';}
}
function shareText(){return '計算プリントを無料で作れる「ぷりぽんっ」｜登録不要・PDF印刷OK';}
const shareUrl=encodeURIComponent(URL_SITE);
for(const a of document.querySelectorAll('[data-share="line"]')){a.href='https://social-plugins.line.me/lineit/share?url='+shareUrl;}
for(const a of document.querySelectorAll('[data-share="x"]')){a.href='https://twitter.com/intent/tweet?text='+encodeURIComponent(shareText())+'&url='+shareUrl;}
for(const btn of document.querySelectorAll('[data-share="copy"]'))btn.addEventListener('click',async()=>{
  try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(URL_SITE);else{
    const input=document.createElement('textarea');input.value=URL_SITE;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();if(!document.execCommand('copy'))throw Error('コピーできません');input.remove();
  }btn.textContent='✓ コピーしました';setTimeout(()=>btn.textContent='🔗 リンクをコピー',2300);}
  catch(error){status('コピーできませんでした。URLを長押ししてコピーしてください：'+URL_SITE,'error');}
});
for(const control of document.querySelectorAll('input[name="operation"], input[name="remainderMode"], #leftDigits, #rightDigits, #questionCount'))control.addEventListener('change',()=>{updateRemainderVisibility();clearPreset();generate(true);});
for(const btn of el.preset.querySelectorAll('[data-grade]'))btn.addEventListener('click',()=>{
  const p=grades[btn.dataset.grade];document.querySelector('input[name="operation"][value="'+p.op+'"]').checked=true;el.left.value=p.left;el.right.value=p.right;el.count.value=p.count;document.querySelector('input[name="remainderMode"][value="'+p.remainderMode+'"]').checked=true;updateRemainderVisibility();
  clearPreset();btn.classList.add('active');btn.setAttribute('aria-pressed','true');generate(true);
});
el.tabProblem.addEventListener('click',()=>{previewMode='problem';renderPreview();});
el.tabAnswer.addEventListener('click',()=>{if(!el.answers.checked)return;previewMode='answer';renderPreview();});
el.answers.addEventListener('change',()=>{renderPreview();renderPrintable();});
el.gen.addEventListener('click',()=>{generate(true);});el.pdf.addEventListener('click',downloadPdf);
let lastPrintAt=0;el.printBtn.addEventListener('click',()=>{const now=Date.now();if(now-lastPrintAt<800)return;lastPrintAt=now;if(!questions.length&&!generate())return;renderPrintable();track('print');window.print();});
if(topic){const p=topic.settings;document.querySelector(`input[name="operation"][value="${p.op}"]`).checked=true;el.left.value=p.left;el.right.value=p.right;el.count.value=p.count;document.querySelector(`input[name="remainderMode"][value="${p.remainderMode}"]`).checked=true;}
$('#year').textContent=new Date().getFullYear();updateRemainderVisibility();generate();
})();
