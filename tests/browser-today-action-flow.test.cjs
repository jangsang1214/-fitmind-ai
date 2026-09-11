'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8778,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');
const date=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('GARANG Today preview server did not start');}
function state(){return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Today Flow',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},state());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  const flow=page.locator('#garangTodayFlow');await flow.waitFor({state:'visible',timeout:7000});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.gto==='1'&&window.GarangTodayMorningOrchestratorV1?.version==='1.1.1',{timeout:7000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayFlow')?.dataset?.gtoPhase==='precheckin',{timeout:7000});
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today');
  assert.equal(await page.locator('#main').getAttribute('data-gtf-c'),'1','C direction must own Today');
  assert.equal(await flow.getAttribute('data-gto-checked'),'0','Today must begin in pre-check-in hierarchy when no recovery state exists');
  assert.equal(await flow.getAttribute('data-gto-phase'),'precheckin');
  assert.equal(await page.locator('#garangCoreToday').isHidden(),true,'accumulation whisper must be internalized on Today instead of competing with the decision surface');
  assert.equal(await flow.locator('.gtf-context').isHidden(),true,'draft context must merge into the single Today decision surface');
  assert.equal(await flow.locator('.gtf-decision>p').isHidden(),true,'decision rationale must stay behind progressive disclosure');
  assert.equal(await flow.getAttribute('data-body-evidence'),'0','missing check-in must not promote body evidence by itself');
  assert.equal(await page.locator('.today-body-panel').count(),1,'existing Today anatomy must remain for rollback/evidence');
  assert.equal(await page.locator('.visual-today-hero').isHidden(),true,'body anatomy must not be the default Today hero');
  assert.equal(await page.locator('.today-snapshot').count(),1,'existing Today snapshot must remain as an internal data owner');
  assert.ok(await page.locator('button.primary[data-action="apply-coach-plan"]').count()>=1,'existing apply-plan action must remain');
  assert.ok(await page.locator('[data-pagego="coach"]').count()>=1,'existing Coach route must remain');
  assert.ok(await page.locator('[data-action="open-checkin"]').count()>=1,'canonical app check-in action must remain');

  const checkinAccess=flow.locator('[data-garang-checkin-access="1"]');await checkinAccess.waitFor({state:'visible',timeout:5000});
  assert.equal(await checkinAccess.getAttribute('data-gto-priority'),'1','pre-check-in control must own the primary visual hierarchy');
  const checkinText=await checkinAccess.innerText();assert.match(checkinText,/오늘 상태/);assert.match(checkinText,/30초/);assert.match(checkinText,/운동 · 회복 · 식단 자동 조정/);
  const checkinBox=await checkinAccess.boundingBox();assert.ok(checkinBox&&checkinBox.height>=44,'Today check-in access must remain touchable on mobile');
  assert.equal(await flow.locator('.gtf-action').isHidden(),true,'before check-in, the plan action must not compete with the primary morning action');

  const impactPending=flow.locator('[data-gto-impact="1"]');await impactPending.waitFor({state:'visible',timeout:5000});
  assert.equal(await impactPending.getAttribute('data-state'),'pending');
  const pendingText=await impactPending.innerText();assert.match(pendingText,/AFTER CHECK-IN/);assert.match(pendingText,/운동 · 회복 · 식단/);assert.equal(await impactPending.locator('[data-domain]').count(),0,'pre-check-in must not render three separate track cards');

  const firstViewport=await page.evaluate(()=>{
    const f=document.querySelector('#garangTodayFlow'),state=f?.querySelector('.gtf-state'),decision=f?.querySelector('.gtf-decision'),checkin=f?.querySelector('[data-garang-checkin-access="1"]');
    return {stateBottom:state?.getBoundingClientRect().bottom||0,decisionBottom:decision?.getBoundingClientRect().bottom||0,checkinBottom:checkin?.getBoundingClientRect().bottom||0,height:innerHeight,visibleSections:[state,decision,checkin].filter(el=>el&&getComputedStyle(el).display!=='none').length};
  });
  assert.equal(firstViewport.visibleSections,3,'pre-check-in first hierarchy must reduce to STATE, DECISION and CHECK-IN');
  assert.ok(firstViewport.checkinBottom<=firstViewport.height+1,`primary morning action must remain in the first mobile viewport: ${JSON.stringify(firstViewport)}`);

  await checkinAccess.click();const saveCheckin=page.locator('.modal #saveCheckin');await saveCheckin.waitFor({state:'visible',timeout:3000});
  await page.locator('#ciSleep').fill('5.5');await page.locator('#ciEnergy').fill('2');await page.locator('#ciStress').fill('4');await page.locator('#ciSoreness').fill('5');await page.locator('#ciMinutes').fill('35');await saveCheckin.click();
  await page.waitForFunction(today=>{const s=window.GarangAgentStateBridge?.getState?.();return [...(s?.dailyCheckins||[]),...(s?.checkins||[])].some(row=>String(row?.date||'').slice(0,10)===today);},date(),{timeout:5000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayFlow')?.dataset?.gtoPhase==='checked'&&document.querySelector('[data-gto-impact="1"]')?.dataset?.state==='complete',null,{timeout:7000});
  await page.waitForFunction(today=>Number(window.GarangAgentStateBridge?.getState?.()?.meta?.dailyPlanDrafts?.[today]?.revision||0)>=2,date(),{timeout:7000});
  const stateEdit=flow.locator('[data-garang-checkin-access="1"]');assert.match(await stateEdit.innerText(),/상태 수정/,'saved check-in must collapse into a quiet state-edit affordance');assert.match(await stateEdit.innerText(),/수면 5\.5h/);assert.equal(await stateEdit.getAttribute('data-gto-priority'),'0');
  assert.match(await flow.locator('.gtf-decision>span').innerText(),/CHECK-IN REFLECTED/,'Today decision must become the single merged Coach/Today decision summary after check-in');

  const impact=flow.locator('[data-gto-impact="1"]');await impact.waitFor({state:'visible',timeout:5000});const impactText=await impact.innerText();
  assert.match(impactText,/TODAY ADJUSTMENT/);assert.match(impactText,/운동/);assert.match(impactText,/회복/);assert.match(impactText,/식단/);
  assert.equal(await impact.locator('.gto-impact-chip').count(),3,'post-check-in impact must remain one compact three-segment strip');
  assert.ok(await impact.locator('[data-change="changed"]').count()>=1,'low recovery check-in must visibly show at least one adapted track');
  assert.equal(await flow.locator('.gtf-action').isVisible(),true,'after check-in the single next action may return');

  const drop=flow.locator('[data-gtf-details]'),box=await drop.boundingBox();assert.ok(box&&box.width>=40&&box.height>=40,'decision detail control must remain touchable');assert.equal(await drop.getAttribute('aria-expanded'),'false');await drop.click();assert.equal(await drop.getAttribute('aria-expanded'),'true');
  const detail=await flow.locator('[data-gtf-detail]').innerText();assert.match(detail,/수면 5\.5h/);assert.doesNotMatch(detail,/신뢰도|confidence/i);assert.equal(await page.locator('.visual-today-hero').isHidden(),false,'high soreness may reveal the body map only as conditional evidence after opening the decision reasons');
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,`Today quiet flow must not overflow mobile viewport: ${JSON.stringify(width)}`);

  const next=flow.locator('[data-gtf-route="planner"]');await next.click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='planner',{timeout:5000});
  const plannerDraft=page.locator('[data-garang-daily-plan-draft]');await plannerDraft.waitFor({state:'visible',timeout:5000});assert.equal(await plannerDraft.count(),1,'next action must open the existing three-track Planner draft instead of creating a parallel plan surface');
  await page.locator('#bottomNav [data-page="today"]').click();await flow.waitFor({state:'visible',timeout:5000});await page.waitForFunction(()=>document.getElementById('main')?.dataset?.gto==='1'&&document.querySelector('#garangTodayFlow')?.dataset?.gtoPhase==='checked',{timeout:5000});assert.match(await flow.locator('[data-garang-checkin-access="1"]').innerText(),/상태 수정/,'merged check-in/decision state must survive route round-trip');assert.equal(await page.locator('.today-body-panel').count(),1,'Today anatomy must survive route round-trip');
  assert.deepEqual(errors,[],`Today quiet flow browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-today-action-flow STATE -> DECISION -> CHECK-IN/NEXT compact mobile flow: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
