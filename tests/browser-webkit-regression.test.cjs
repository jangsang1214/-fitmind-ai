'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8768,baseURL=`http://127.0.0.1:${port}`;
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('WebKit GARANG server did not start');}
async function tap(page,selector){const loc=page.locator(selector);await loc.waitFor({state:'visible',timeout:7000});const box=await loc.boundingBox();assert.ok(box,`${selector} must have touch box`);const hit=await loc.evaluate(el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,h=document.elementFromPoint(x,y);return !!h&&(h===el||el.contains(h));});assert.equal(hit,true,`${selector} must own hit point`);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
(async()=>{
 const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:serveRoot,stdio:'ignore'});let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});
  await context.addInitScript(()=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify({meta:{schemaVersion:5,updatedAt:'2026-09-06T00:00:00Z'},profile:{name:'WebKit',weight:70},onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},workouts:[null,{id:'w1',date:'2026-09-06',name:'Squat'}],meals:[null,{id:'m1',date:'2026-09-06',name:'Meal',items:[null,{id:'f1',name:'Egg',grams:100,kcal:150,protein:13,carbs:1,fat:10}]}],runs:[],body:[],planner:[],checkins:[],aiChat:[],actionLog:[],errors:[],memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},analytics:{events:[]},plan:'FREE'}));});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:10000});
  const layout=await page.evaluate(()=>{const main=document.getElementById('main'),s=getComputedStyle(main);return {x:s.overflowX,y:s.overflowY,max:s.maxHeight,cards:[...document.querySelectorAll('.quick-visual')].map(x=>x.getBoundingClientRect().height)};});
  assert.equal(layout.x,'visible');assert.equal(layout.y,'visible');assert.equal(layout.max,'none');assert.ok(layout.cards.length>=4&&layout.cards.every(h=>h>40));
  await tap(page,'[data-today-view="back"]');await page.waitForFunction(()=>document.querySelector('[data-today-view="back"]')?.classList.contains('active'));
  await tap(page,'[data-today-view="front"]');await tap(page,'#menuBtn');await page.locator('.garang-more-sheet').waitFor({state:'visible'});await tap(page,'.garang-more-sheet [data-route="running"]');
  for(const route of ['today','coach','today','workout','body','progress']){await tap(page,`#bottomNav button[data-page="${route}"]`);await page.waitForFunction(r=>document.querySelector(`#bottomNav button[data-page="${r}"]`)?.classList.contains('active'),route);}
  assert.deepEqual(errors,[],`WebKit runtime errors:\n${errors.join('\n')}`);console.log('browser-webkit-regression: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
