'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8778,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');
const date=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('GARANG Today preview server did not start');}
function state(){const today=date();return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Today Flow',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[{id:'seed-workout',date:today,name:'벤치프레스',sets:3,reps:8,weight:60,rpe:7,duration:45}],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[{name:'coach_recommendation_shown',date:today,props:{screen:'coach',date:today}}]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},state());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  const flow=page.locator('#garangTodayFlow');await flow.waitFor({state:'attached',timeout:7000});
  const surface=page.locator('#garangTodayRebuild');await surface.waitFor({state:'visible',timeout:7000});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.gto==='1'&&window.GarangTodayMorningOrchestratorV1?.version==='1.2.0',{timeout:7000});
  await page.waitForFunction(()=>{const f=document.querySelector('#garangTodayFlow'),m=document.getElementById('main');return f?.dataset?.gtoPhase==='precheckin'&&f?.dataset?.gtoChecked==='0'&&m?.dataset?.gpStep==='plan'&&m?.dataset?.gsnAction==='checkin';},{timeout:7000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayRebuild .gtr1-next-card')?.dataset?.gtr1CanonicalAction==='checkin',null,{timeout:7000});

  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today');
  assert.equal(await page.locator('#main').getAttribute('data-garang-decision-owner'),'coach','Coach must remain the single decision owner');
  assert.equal(await flow.getAttribute('aria-hidden'),'true','legacy Today contract must stay mounted but presentation-hidden');
  assert.ok((await flow.getAttribute('class')||'').includes('gtr1-legacy-hidden'),'legacy Today must not compete visually');
  assert.equal(await page.locator('[data-golden-path-surface]').count(),0,'Golden Path must not own a parallel visible surface');
  assert.ok(await page.locator('[data-action="open-checkin"]').count()>=1,'canonical app check-in action must remain');

  const tracks=surface.locator('.gtr1-track');assert.equal(await tracks.count(),3,'rebuilt Today must show three canonical domains');
  for(const domain of ['training','recovery','nutrition'])assert.equal(await surface.locator(`.gtr1-track[data-domain="${domain}"]`).count(),1,`${domain} must remain glanceable`);
  const next=surface.locator('.gtr1-next-card');await next.waitFor({state:'visible',timeout:5000});
  assert.equal(await next.getAttribute('data-gtr1-canonical-action'),'checkin','pre-check-in Golden Path action must own rebuilt Today');
  assert.match(await next.innerText(),/오늘 상태 체크인/,'rebuilt Today must expose the canonical check-in action');
  assert.equal(await page.locator('#garangTodayFlow [data-garang-checkin-access="1"]:visible').count(),0,'legacy action must remain visually internalized');
  assert.equal(await page.locator('.gtr1-next-card:visible').count(),1,'rebuilt Today must expose exactly one visible next action');

  await next.click();const saveCheckin=page.locator('.modal #saveCheckin');await saveCheckin.waitFor({state:'visible',timeout:3000});
  await page.locator('#ciSleep').fill('5.5');await page.locator('#ciEnergy').fill('2');await page.locator('#ciStress').fill('4');await page.locator('#ciSoreness').fill('5');await page.locator('#ciMinutes').fill('35');await saveCheckin.click();
  await page.waitForFunction(today=>{const s=window.GarangAgentStateBridge?.getState?.();return [...(s?.dailyCheckins||[]),...(s?.checkins||[])].some(row=>String(row?.date||'').slice(0,10)===today);},date(),{timeout:5000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayFlow')?.dataset?.gtoPhase==='checked',null,{timeout:7000});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.gsnAction==='coach'&&document.querySelector('#garangTodayFlow .gtf-next[data-gsn-action="coach"][data-gsn-step="plan"]'),null,{timeout:7000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayRebuild .gtr1-next-card')?.dataset?.gtr1CanonicalAction==='coach',null,{timeout:7000});

  const coachNext=page.locator('#garangTodayRebuild .gtr1-next-card');assert.match(await coachNext.innerText(),/Coach/,'post-check-in plan step must route through Coach');
  assert.equal(await page.locator('.gtr1-next-card:visible').count(),1,'post-check-in Today must still expose exactly one visible next action');
  assert.equal(await page.locator('#garangTodayFlow .gtf-next[data-gsn-action="coach"]:visible').count(),0,'legacy Golden Path button stays presentation-hidden');
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,`rebuilt Today must not overflow mobile viewport: ${JSON.stringify(width)}`);

  await coachNext.click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='coach',{timeout:5000});
  await page.locator('.garang-coach-v2').waitFor({state:'visible',timeout:5000});
  await page.locator('#bottomNav [data-page="today"]').click();await page.locator('#garangTodayRebuild').waitFor({state:'visible',timeout:7000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayRebuild .gtr1-next-card')?.dataset?.gtr1CanonicalAction==='coach',null,{timeout:7000});
  assert.equal(await page.locator('.gtr1-next-card:visible').count(),1,'single visible action ownership must survive route round-trip');
  assert.equal(await page.locator('[data-golden-path-surface]').count(),0);
  assert.deepEqual(errors,[],`Today rebuild flow browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-today-action-flow rebuilt Today check-in -> canonical Coach next action: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
