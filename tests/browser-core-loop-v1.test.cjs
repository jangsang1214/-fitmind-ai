'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8780,baseURL=`http://127.0.0.1:${port}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitForServer(){const end=Date.now()+15000;while(Date.now()<end){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await sleep(180);}throw new Error('core-loop server did not start');}
async function tap(page,selector){const loc=page.locator(selector);await loc.waitFor({state:'visible',timeout:7000});await loc.scrollIntoViewIfNeeded();const box=await loc.boundingBox();assert.ok(box,`${selector} needs touch box`);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});
  await context.addInitScript(()=>{const d=new Date(),today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,y=new Date(d);y.setDate(y.getDate()-1);const yesterday=`${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify({meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Core Loop',age:23,height:174,weight:67,goal:'퍼포먼스 향상'},onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},planner:[{id:'p1',date:today,title:'하체',completed:false,status:'confirmed'}],workouts:[{id:'w1',date:yesterday,name:'스쿼트',sets:4,reps:6,weight:82.5,rpe:8,duration:50}],meals:[{id:'m1',date:yesterday,name:'닭가슴살 식사',kcal:620,protein:52,items:[{name:'닭가슴살',grams:180,kcal:300,protein:48,carbs:0,fat:6}]}],runs:[{id:'r1',date:yesterday,distance:5,duration:30}],body:[{id:'b1',date:yesterday,weight:67,muscle:31,fatPercent:14}],checkins:[],aiChat:[],memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},actionLog:[],errors:[],analytics:{events:[]},plan:'FREE'}));});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});await page.waitForFunction(()=>window.GarangCoreLoopV1?.version==='garang-core-loop-v1.0.0',null,{timeout:7000});
  await page.locator('#garangCoreToday').waitFor({state:'visible',timeout:7000});assert.match(await page.locator('#garangCoreToday').innerText(),/남은 계획|방향/);
  await tap(page,'#bottomNav button[data-page="log"]');await page.locator('[data-gcl-recent]').waitFor({state:'visible',timeout:5000});assert.ok(await page.locator('[data-gcl-reuse]').count()>=4);
  await tap(page,'[data-gcl-reuse="0"]');await page.waitForFunction(()=>document.getElementById('main')?.dataset.garangScreen==='workout',null,{timeout:5000});await page.waitForFunction(()=>document.getElementById('wName')?.value==='스쿼트',null,{timeout:3000});assert.equal(await page.locator('#wWeight').inputValue(),'82.5');assert.equal(await page.locator('#wSets').inputValue(),'4');
  await tap(page,'#bottomNav button[data-page="coach"]');await page.waitForFunction(()=>document.getElementById('main')?.dataset.garangScreen==='coach',null,{timeout:5000});await page.locator('[data-gcl-coach-actions]').waitFor({state:'visible',timeout:7000});assert.ok(await page.locator('[data-gcl-coach]').count()>=2);
  await tap(page,'#bottomNav button[data-page="progress"]');await page.waitForFunction(()=>document.getElementById('main')?.dataset.garangScreen==='progress',null,{timeout:5000});await page.locator('#garangAccumulationOverview').waitFor({state:'visible',timeout:5000});assert.match(await page.locator('#garangAccumulationOverview').innerText(),/30 DAY|누적/);
  const ownership=await page.evaluate(()=>({primary:[...document.querySelectorAll('#bottomNav [data-garang-primary-nav="1"]')].map(x=>x.dataset.page),legacyLog:typeof window.GarangRouter?.navigate==='function',today:!!document.querySelector('.today-body-panel')}));assert.deepEqual(ownership.primary,['today','log','coach','progress']);assert.equal(ownership.legacyLog,true);assert.deepEqual(errors,[]);
  console.log('browser-core-loop-v1 WebKit mobile: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});if(server.exitCode===null)server.kill('SIGTERM');}
})().catch(e=>{console.error(e);process.exit(1);});
