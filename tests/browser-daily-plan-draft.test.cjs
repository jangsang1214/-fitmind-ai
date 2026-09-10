'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8786,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,180));}throw new Error('daily-plan browser server did not start');}
function demoState(){return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Daily Draft',age:29,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},demoState());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  await page.waitForFunction(()=>window.GarangDailyPlanV1?.VERSION==='garang-daily-plan-v1.0.0'&&window.GarangAgentStateBridge?.ready?.(),null,{timeout:10000});
  await page.waitForFunction(date=>window.GarangAgentStateBridge.getLiveState()?.meta?.dailyPlanDrafts?.[date]?.status==='draft',today(),{timeout:7000});
  const date=today();const first=await page.evaluate(date=>{const s=window.GarangAgentStateBridge.getLiveState(),g=s.meta.dailyPlanDrafts[date];return {draftCount:Object.keys(s.meta.dailyPlanDrafts).length,items:g.items.length,planner:s.planner.length,outcome:window.GarangDailyPlanV1.outcome(s,date)};},date);
  assert.equal(first.draftCount,1);assert.ok(first.items>=1&&first.items<=3);assert.equal(first.planner,0,'automatic draft must not silently confirm into Planner');assert.equal(first.outcome.kept,false);assert.equal(first.outcome.status,'draft_only');
  await page.locator('#garangTodayFlow').waitFor({state:'visible',timeout:7000});await page.waitForFunction(()=>document.querySelector('#garangTodayFlow')?.dataset.dailyDraft==='1',null,{timeout:5000});assert.match(await page.locator('#garangTodayFlow .gtf-next').innerText(),/오늘 초안 확인/);
  await page.locator('#garangTodayFlow .gtf-next').click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='planner',null,{timeout:5000});
  const draft=page.locator('[data-garang-daily-plan-draft="1"]');await draft.waitFor({state:'visible',timeout:5000});assert.match(await draft.innerText(),/오늘 계획은 미리 준비했습니다/);
  const firstItem=draft.locator('[data-gdp-item]').first();await firstItem.locator('[data-gdp-title]').fill('사용자 수정 근력 42분');await firstItem.locator('[data-gdp-time]').fill('19:20');await firstItem.locator('[data-gdp-duration]').fill('42');
  await draft.locator('[data-gdp-save]').click();await page.waitForFunction(date=>window.GarangAgentStateBridge.getLiveState().meta.dailyPlanDrafts[date].items[0].title==='사용자 수정 근력 42분',date,{timeout:3000});
  const afterSave=await page.evaluate(date=>window.GarangAgentStateBridge.getLiveState().meta.dailyPlanDrafts[date].items[0],date);assert.equal(afterSave.time,'19:20');assert.equal(afterSave.duration,42);
  await page.locator('[data-garang-daily-plan-draft="1"] [data-gdp-confirm]').click();await page.waitForFunction(date=>{const s=window.GarangAgentStateBridge.getLiveState();return s.meta.dailyPlanDrafts[date].status==='confirmed'&&s.planner.some(p=>p.origin==='garang-daily-plan'&&p.title==='사용자 수정 근력 42분');},date,{timeout:5000});
  const confirmed=await page.evaluate(date=>{const s=window.GarangAgentStateBridge.getLiveState(),rows=s.planner.filter(p=>p.date===date&&p.origin==='garang-daily-plan');return {count:rows.length,draft:s.meta.dailyPlanDrafts[date],planner:s.planner};},date);assert.ok(confirmed.count>=1);assert.equal(confirmed.draft.status,'confirmed');assert.equal(confirmed.planner.find(p=>p.title==='사용자 수정 근력 42분').completed,false);
  await page.evaluate(()=>window.GarangRouter.navigate('today',{source:'daily-plan-browser',force:true}));await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='today');await page.waitForTimeout(250);
  const noDup=await page.evaluate(date=>{const s=window.GarangAgentStateBridge.getLiveState();return {drafts:Object.keys(s.meta.dailyPlanDrafts).filter(d=>d===date).length,rows:s.planner.filter(p=>p.date===date&&p.origin==='garang-daily-plan').length};},date);assert.equal(noDup.drafts,1,'same-day generator must remain idempotent');assert.equal(noDup.rows,confirmed.count,'route round-trip must not duplicate confirmed rows');
  assert.deepEqual(errors,[],`daily plan browser errors:\n${errors.join('\n')}`);await context.close();console.log('browser-daily-plan-draft WebKit mobile: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
