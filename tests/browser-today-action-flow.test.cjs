'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8778,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');
const date=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('GARANG Today preview server did not start');}
function state(){const d=date();return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Today Flow',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},state());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  const flow=page.locator('#garangTodayFlow');await flow.waitFor({state:'visible',timeout:7000});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.gto==='1'&&window.GarangTodayMorningOrchestratorV1?.version==='1.0.0',{timeout:7000});
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today');
  assert.equal(await page.locator('#main').getAttribute('data-gtf-c'),'1','C direction must own Today');
  assert.equal(await flow.getAttribute('data-gto-checked'),'0','Today must begin in pre-check-in hierarchy when no recovery state exists');
  assert.equal(await page.locator('#garangCoreToday').isHidden(),true,'accumulation whisper must be internalized on Today instead of competing with the decision surface');
  assert.equal(await flow.locator('.gtf-context').isHidden(),true,'draft context must merge into the single Today decision surface');
  assert.equal(await flow.getAttribute('data-body-evidence'),'0','missing check-in must not promote body evidence by itself');
  assert.equal(await page.locator('.today-body-panel').count(),1,'existing Today anatomy must remain for rollback/evidence');
  assert.equal(await page.locator('.visual-today-hero').isHidden(),true,'body anatomy must not be the default Today hero');
  assert.equal(await page.locator('.today-snapshot').count(),1,'existing Today snapshot must remain as an internal data owner');
  assert.ok(await page.locator('button.primary[data-action="apply-coach-plan"]').count()>=1,'existing apply-plan action must remain');
  assert.ok(await page.locator('[data-pagego="coach"]').count()>=1,'existing Coach route must remain');
  assert.ok(await page.locator('[data-action="open-checkin"]').count()>=1,'canonical app check-in action must remain');

  await page.waitForFunction(()=>document.querySelector('[data-gto-impact="1"]')?.dataset?.state==='pending',{timeout:5000});
  const impactPending=flow.locator('[data-gto-impact="1"]');assert.equal(await impactPending.isHidden(),true,'pre-check-in three-track preview must stay internalized so the home hierarchy remains compact');

  const checkinAccess=flow.locator('[data-garang-checkin-access="1"]');await checkinAccess.waitFor({state:'visible',timeout:5000});
  assert.equal(await checkinAccess.getAttribute('data-gto-priority'),'1','pre-check-in control must own the primary visual hierarchy');
  const checkinText=await checkinAccess.innerText();assert.match(checkinText,/오늘 상태/);assert.match(checkinText,/30초/);assert.match(checkinText,/계획 자동 조정/);
  const checkinBox=await checkinAccess.boundingBox();assert.ok(checkinBox&&checkinBox.height>=44,'Today check-in access must remain touchable on mobile');
  const nextBefore=flow.locator('[data-gtf-route="planner"]');await nextBefore.waitFor({state:'visible',timeout:5000});assert.match(await nextBefore.innerText(),/3영역 초안 확인/,'Planner remains available but secondary before check-in');

  await checkinAccess.click();const saveCheckin=page.locator('.modal #saveCheckin');await saveCheckin.waitFor({state:'visible',timeout:3000});
  await page.locator('#ciSleep').fill('5.5');await page.locator('#ciEnergy').fill('2');await page.locator('#ciStress').fill('4');await page.locator('#ciSoreness').fill('5');await page.locator('#ciMinutes').fill('35');await saveCheckin.click();
  await page.waitForFunction(today=>{const state=window.GarangAgentStateBridge?.getState?.();return [...(state?.dailyCheckins||[]),...(state?.checkins||[])].some(row=>String(row?.date||'').slice(0,10)===today);},date(),{timeout:5000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayFlow')?.dataset?.gtoChecked==='1'&&document.querySelector('[data-gto-impact="1"]')?.dataset?.state==='complete',null,{timeout:7000});
  await page.waitForFunction(today=>Number(window.GarangAgentStateBridge?.getState?.()?.meta?.dailyPlanDrafts?.[today]?.revision||0)>=2,date(),{timeout:7000});
  assert.match(await flow.locator('[data-garang-checkin-access="1"]').innerText(),/오늘 상태 반영 완료/,'saved state must collapse into a quiet reflected-state control');
  assert.match(await flow.locator('[data-garang-checkin-access="1"]').innerText(),/수면 5\.5h/);
  assert.equal(await flow.locator('[data-garang-checkin-access="1"]').getAttribute('data-gto-priority'),'0');
  assert.match(await flow.locator('.gtf-decision>span').innerText(),/CHECK-IN REFLECTED/,'Today decision must become the single merged Coach/Today decision summary after check-in');

  const impact=flow.locator('[data-gto-impact="1"]');await impact.waitFor({state:'visible',timeout:5000});const impactText=await impact.innerText();
  assert.match(impactText,/3-TRACK IMPACT/);assert.match(impactText,/체크인을 반영해/);assert.match(impactText,/운동/);assert.match(impactText,/회복/);assert.match(impactText,/식단/);assert.match(impactText,/변경/,'low recovery check-in must visibly show at least one adapted track');
  const changedRows=impact.locator('[data-change="changed"]');assert.ok(await changedRows.count()>=1,'three-track impact must compare the pre-check-in draft with the adapted draft');

  const drop=flow.locator('[data-gtf-details]'),box=await drop.boundingBox();assert.ok(box&&box.width>=40&&box.height>=40,'decision detail control must remain touchable');assert.equal(await drop.getAttribute('aria-expanded'),'false');await drop.click();assert.equal(await drop.getAttribute('aria-expanded'),'true');
  const detail=await flow.locator('[data-gtf-detail]').innerText();assert.match(detail,/수면 5\.5h/);assert.doesNotMatch(detail,/신뢰도|confidence/i);assert.equal(await page.locator('.visual-today-hero').isHidden(),false,'high soreness may reveal the body map only as conditional evidence after opening the decision reasons');
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,`Today morning flow must not overflow mobile viewport: ${JSON.stringify(width)}`);

  const next=flow.locator('[data-gtf-route="planner"]');await next.click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='planner',{timeout:5000});
  const plannerDraft=page.locator('[data-garang-daily-plan-draft]');await plannerDraft.waitFor({state:'visible',timeout:5000});assert.equal(await plannerDraft.count(),1,'next action must open the existing three-track Planner draft instead of creating a parallel plan surface');
  await page.locator('#bottomNav [data-page="today"]').click();await flow.waitFor({state:'visible',timeout:5000});await page.waitForFunction(()=>document.getElementById('main')?.dataset?.gto==='1'&&document.querySelector('#garangTodayFlow')?.dataset?.gtoChecked==='1',{timeout:5000});assert.match(await flow.locator('[data-garang-checkin-access="1"]').innerText(),/상태 반영 완료/,'merged check-in/decision state must survive route round-trip');assert.equal(await page.locator('.today-body-panel').count(),1,'Today anatomy must survive route round-trip');
  assert.deepEqual(errors,[],`Today morning flow browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-today-action-flow compact morning check-in -> three-track impact + merged decision: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
