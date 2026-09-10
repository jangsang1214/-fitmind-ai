'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8778,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');
const date=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('GARANG Today preview server did not start');}
function state(){const d=date();return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Today Flow',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},planner:[{id:'p1',date:d,time:'08:00',type:'nutrition',title:'아침 식단',completed:true,source:'user'},{id:'p2',date:d,time:'18:00',type:'workout',title:'상체 50분',completed:false,source:'user'}],workouts:[],meals:[{id:'m1',date:d,name:'오늘 식단',kcal:2200,protein:120,carbs:250,fat:60,items:[{id:'f1',name:'오늘 식단',grams:500,kcal:2200,protein:120,carbs:250,fat:60}]}],runs:[],body:[],checkins:[{id:'c1',date:d,sleep:7.5,energy:4,stress:2,soreness:2}],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},state());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  const flow=page.locator('#garangTodayFlow');await flow.waitFor({state:'visible',timeout:7000});
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today');
  assert.equal(await page.locator('#main').getAttribute('data-gtf-c'),'1','C direction must own Today');
  const text=await flow.innerText();assert.match(text,/PLAN 50% · 1 \/ 2/);assert.match(text,/계획 이어가기/);assert.match(text,/상체 50분/);
  assert.equal(await flow.getAttribute('data-body-evidence'),'0','normal soreness must not promote body evidence');
  assert.equal(await page.locator('.today-body-panel').count(),1,'existing Today anatomy must remain for rollback/evidence');
  assert.equal(await page.locator('.visual-today-hero').isHidden(),true,'body anatomy must not be the default Today hero');
  assert.equal(await page.locator('.today-snapshot').count(),1,'existing Today snapshot must remain');
  assert.ok(await page.locator('button.primary[data-action="apply-coach-plan"]').count()>=1,'existing apply-plan action must remain');
  assert.ok(await page.locator('[data-pagego="coach"]').count()>=1,'existing Coach analysis route must remain');
  assert.ok(await page.locator('[data-action="open-checkin"]').count()>=1,'existing check-in action must remain');
  const drop=flow.locator('[data-gtf-details]'),box=await drop.boundingBox();assert.ok(box&&box.width>=40&&box.height>=40,'decision detail control must remain touchable');assert.equal(await drop.getAttribute('aria-expanded'),'false');
  assert.equal(await flow.locator('[data-gtf-detail]').isHidden(),true);await drop.click();assert.equal(await drop.getAttribute('aria-expanded'),'true');
  const detail=await flow.locator('[data-gtf-detail]').innerText();assert.match(detail,/계획\s*1 \/ 2/);assert.match(detail,/운동\s*기록 없음/);assert.match(detail,/2,200 kcal · 120g/);assert.match(detail,/수면 7\.5h/);assert.doesNotMatch(detail,/신뢰도|confidence/i);assert.equal(await flow.locator('.gtf-body-hint').count(),0,'body evidence copy must stay absent when soreness is not decision evidence');assert.equal(await page.locator('.visual-today-hero').isHidden(),true,'expanding reasons alone must not reveal the body model');
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,`Today action flow must not overflow mobile viewport: ${JSON.stringify(width)}`);
  const next=flow.locator('[data-gtf-route="planner"]');await next.click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='planner',{timeout:5000});assert.equal(await page.locator('#addPlan').count(),1,'next action must use the existing Planner flow');
  await page.locator('#bottomNav [data-page="today"]').click();await flow.waitFor({state:'visible',timeout:5000});assert.equal(await page.locator('.today-body-panel').count(),1,'Today anatomy must survive route round-trip');assert.equal(await page.locator('.visual-today-hero').isHidden(),true,'route round-trip must return to the no-body C hero');
  assert.deepEqual(errors,[],`Today action flow browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-today-action-flow C-direction WebKit mobile: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
