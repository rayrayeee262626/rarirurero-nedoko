const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../dist');
 const server=http.createServer(async(req,res)=>{try{const file=path.join(root,new URL(req.url,'http://local').pathname==='/'?'index.html':new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep))throw Error();const data=await fs.readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(data);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
 for(const viewport of [{width:360,height:640},{width:390,height:700}]){
  const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.fulfill({status:200,body:''}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.locator('#robot').evaluate(img=>img.decode());
  await page.locator('#start').tap();
  const target=await page.locator('#character').boundingBox();
  const cdp=await context.newCDPSession(page);
  const frames=[];
  for(let i=0;i<130;i++){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:target.x+target.width/2,y:target.y+target.height*.6}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   if(i%5===0)frames.push(await page.evaluate(()=>{const r=document.getElementById('robot').getBoundingClientRect(),a=document.getElementById('arena').getBoundingClientRect();return {transform:document.querySelector('.reaction-motion').style.transform,inside:r.left>=a.left-1&&r.right<=a.right+1&&r.top>=a.top-1&&r.bottom<=a.bottom+1,animations:document.getElementById('robot').getAnimations().length,effects:document.querySelectorAll('.reaction-back>* , .reaction-front>*').length};}));
   await page.waitForTimeout(16);
  }
  assert.ok(new Set(frames.map(f=>f.transform)).size>12,'Character must keep moving during rapid taps');
  assert.ok(frames.every(f=>f.inside),'Full character image stays within stage');
  assert.ok(frames.every(f=>f.effects<=24),'Effect count bounded');
  await page.waitForFunction(()=>document.querySelector('.machine.result'),{},{timeout:14000});
  assert.match(await page.locator('#message p').textContent(),/^130回タップ！/,'Each physical touch counts exactly once');
  const score=await page.locator('#score').textContent();
  await page.touchscreen.tap(target.x+target.width/2,target.y+target.height*.6);
  assert.equal(await page.locator('#score').textContent(),score,'Result cannot receive points');
  assert.equal(await page.locator('.reaction-motion').evaluate(e=>e.style.transform),'','Motion clears after finish');
  await page.locator('#start').tap();assert.equal(await page.locator('#score').textContent(),'0');
  assert.deepEqual(errors,[]);
  console.log(`PASS mobile touch ${viewport.width}x${viewport.height}: 130/130 taps, image visible, bounded effects, deadline, replay, no browser errors`);
  await context.close();
 }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
