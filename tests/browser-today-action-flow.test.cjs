'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8778,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');
const date=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('GARANG Today preview server did not start');}
function state(){const today=date();return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Today Flow',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[{id:'seed-workout',date:today,name:'벤치프레스',sets:3,reps:8,weight:60,rpe:7,duration:45}],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[{name:'screen_viewed',date:today,props:{screen:'coach',date:today}}]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},state());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  const flow=page.locator('#garangTodayFlow');await flow.waitFor({state:'visible',timeout:7000});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.gto==='1'&&window.GarangTodayMorningOrchestratorV1?.version==='1.2.0',{timeout:7000});
  await page.waitForTimeout(320);
  await page.waitForFunction(()=>{const f=document.querySelector('#garangTodayFlow');return f?.dataset?.gtoPhase==='precheckin'&&f?.dataset?.gtoChecked==='0';},{timeout:7000});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.gpStep==='plan',null,{timeout:7000});
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today');
  assert.equal(await page.locator('#main').getAttribute('data-gtf-c'),'1','C direction must own Today');
  assert.equal(await page.locator('#main').getAttribute('data-garang-decision-owner'),'coach','Coach must be the single user-facing decision owner');
  assert.equal(await flow.getAttribute('data-decision-owner'),'coach');
  assert.equal(await flow.getAttribute('aria-label'),'오늘 상태와 다음 행동');
  assert.equal(await flow.getAttribute('data-gto-checked'),'0','Today must begin in pre-check-in hierarchy when no recovery state exists');
  assert.equal(await flow.getAttribute('data-gto-phase'),'precheckin');
  assert.equal(await page.locator('#garangCoreToday').isHidden(),true,'accumulation whisper must stay internalized instead of competing with Today');
  assert.equal(await flow.locator('.gtf-context').isHidden(),true,'draft context must remain quiet on Today');
  assert.equal(await flow.locator('.gtf-decision').isHidden(),true,'Today must not render a second GARANG decision surface');
  assert.equal(await flow.locator('.gtf-disclosure').isHidden(),true,'decision rationale belongs to Coach, not a Today disclosure');
  assert.equal(await flow.locator('.gtf-detail').isHidden(),true,'Today decision detail must stay internalized');
  assert.equal(await page.locator('[data-golden-path-surface]').count(),0,'Golden Path must not render a second check-in prompt when Today already owns state entry');
  assert.equal(await flow.getAttribute('data-body-evidence'),'0','missing check-in must not promote body evidence by itself');
  assert.equal(await page.locator('.today-body-panel').count(),1,'existing Today anatomy must remain for rollback/evidence');
  assert.equal(await page.locator('.visual-today-hero').isHidden(),true,'body anatomy must not be the default Today hero');
  assert.equal(await page.locator('.today-snapshot').count(),1,'existing Today snapshot must remain as an internal data owner');
  assert.ok(await page.locator('button.primary[data-action="apply-coach-plan"]').count()>=1,'existing apply-plan action must remain');
  assert.ok(await page.locator('[data-pagego="coach"]').count()>=1,'existing Coach route must remain');
  assert.ok(await page.locator('[data-action="open-checkin"]').count()>=1,'canonical app check-in action must remain');

  const visual=flow.locator('.gtf-track-visual');await visual.waitFor({state:'visible',timeout:5000});assert.equal(await visual.locator('.gtf-track').count(),3,'Today must show training, recovery and nutrition in one visual rail');
  for(const domain of ['training','recovery','nutrition'])assert.equal(await visual.locator(`.gtf-track[data-domain="${domain}"]`).count(),1,`${domain} must stay glanceable without another card`);
  assert.equal(await flow.locator('[data-gto-impact="1"]').count(),0,'visual track rail must replace the extra AFTER CHECK-IN text section');
  const signal=flow.locator('[data-garang-accumulation-symbol="1"]');assert.equal(await signal.count(),1,'Today must expose one GARANG accumulation symbol');const signalBox=await signal.boundingBox();assert.ok(signalBox&&signalBox.width>=70,'accumulation symbol must be a real glanceable visual, not a tiny decoration');
  assert.match(await flow.locator('.gtf-state-copy').innerText(),/오늘/,'Korean Today state label must lead in Korean');assert.doesNotMatch(await flow.locator('.gtf-state-copy').innerText(),/^STATE/,'generic English state label must not lead the Korean surface');
  const trackShape=await visual.locator('.gtf-track-icon').first().evaluate(el=>getComputedStyle(el).borderRadius);assert.notEqual(trackShape,'50%','GARANG track glyphs must not collapse back to generic circular app icons');

  const checkinAccess=flow.locator('[data-garang-checkin-access="1"]');await checkinAccess.waitFor({state:'visible',timeout:5000});
  assert.equal(await checkinAccess.getAttribute('data-gto-priority'),'1','pre-check-in control must own the primary visual hierarchy');
  const checkinText=await checkinAccess.innerText();assert.match(checkinText,/오늘 상태/);assert.match(checkinText,/30초/);assert.match(checkinText,/3영역/);assert.doesNotMatch(checkinText,/MORNING|CHECK-IN/,'Korean check-in should not use generic English chrome');
  await checkinAccess.waitFor({state:'visible',timeout:5000});const checkinBox=await checkinAccess.boundingBox();assert.ok(checkinBox&&checkinBox.height>=44,'Today check-in access must remain touchable on mobile');
  assert.equal(await flow.locator('.gtf-action').isHidden(),true,'before check-in, the plan action must not compete with the single state-entry action');
  const visibleCheckinTriggers=await page.locator('[data-garang-checkin-access="1"],[data-action="open-checkin"],[data-gp-action="checkin"],.gtf-next[data-gtf-action="open-checkin"]').evaluateAll(nodes=>nodes.filter(el=>{const style=getComputedStyle(el),box=el.getBoundingClientRect();return !el.hidden&&style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.height>0;}).length);
  assert.equal(visibleCheckinTriggers,1,'Today must expose exactly one visible check-in/state-recording entry');

  const firstViewport=await page.evaluate(()=>{
    const f=document.querySelector('#garangTodayFlow'),state=f?.querySelector('.gtf-state'),decision=f?.querySelector('.gtf-decision'),checkin=f?.querySelector('[data-garang-checkin-access="1"]');
    return {stateBottom:state?.getBoundingClientRect().bottom||0,decisionDisplay:decision?getComputedStyle(decision).display:'missing',checkinBottom:checkin?.getBoundingClientRect().bottom||0,height:innerHeight,visibleSections:[state,decision,checkin].filter(el=>el&&getComputedStyle(el).display!=='none').length};
  });
  assert.equal(firstViewport.visibleSections,2,'pre-check-in hierarchy must reduce to STATE + one CHECK-IN control');
  assert.equal(firstViewport.decisionDisplay,'none','decision must not compete with Coach on Today');
  assert.ok(firstViewport.checkinBottom<=firstViewport.height+1,`single state-entry action must remain in the first mobile viewport: ${JSON.stringify(firstViewport)}`);

  await checkinAccess.click();const saveCheckin=page.locator('.modal #saveCheckin');await saveCheckin.waitFor({state:'visible',timeout:3000});
  await page.locator('#ciSleep').fill('5.5');await page.locator('#ciEnergy').fill('2');await page.locator('#ciStress').fill('4');await page.locator('#ciSoreness').fill('5');await page.locator('#ciMinutes').fill('35');await saveCheckin.click();
  await page.waitForFunction(today=>{const s=window.GarangAgentStateBridge?.getState?.();return [...(s?.dailyCheckins||[]),...(s?.checkins||[])].some(row=>String(row?.date||'').slice(0,10)===today);},date(),{timeout:5000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayFlow')?.dataset?.gtoPhase==='checked',null,{timeout:7000});
  await page.waitForFunction(today=>Number(window.GarangAgentStateBridge?.getState?.()?.meta?.dailyPlanDrafts?.[today]?.revision||0)>=2,date(),{timeout:7000});
  await page.waitForFunction(()=>document.querySelectorAll('#garangTodayFlow .gtf-track[data-change="changed"]').length>=1,null,{timeout:7000});
  const stateEdit=flow.locator('[data-garang-checkin-access="1"]');assert.match(await stateEdit.innerText(),/수정/,'saved check-in must collapse into a quiet state-edit affordance');assert.match(await stateEdit.innerText(),/수면 5\.5h/);assert.equal(await stateEdit.getAttribute('data-gto-priority'),'0');
  assert.equal(await flow.locator('.gtf-decision').isHidden(),true,'post-check-in judgment must still remain Coach-owned');
  assert.equal(await flow.locator('.gtf-disclosure').isHidden(),true,'Today must not reintroduce decision reasons after check-in');
  assert.equal(await flow.locator('.gtf-track[data-change]').count(),3,'check-in effect must stay merged into the same three-track visual');
  assert.ok(await flow.locator('.gtf-track[data-change="changed"]').count()>=1,'low recovery check-in must visibly mark at least one adapted track');
  assert.equal(await flow.locator('[data-gto-impact="1"]').count(),0,'post-check-in must not add another dashboard strip below the visual state');
  assert.equal(await flow.locator('.gtf-action').isVisible(),true,'after check-in the single next action may return');
  assert.equal(await page.locator('.visual-today-hero').isHidden(),true,'body evidence and decision explanation must stay in Coach rather than reopening a Today decision surface');
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,`Today brand flow must not overflow mobile viewport: ${JSON.stringify(width)}`);

  const next=flow.locator('[data-gtf-route="planner"]');await next.click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='planner',{timeout:5000});
  const plannerDraft=page.locator('[data-garang-daily-plan-draft]');await plannerDraft.waitFor({state:'visible',timeout:5000});assert.equal(await plannerDraft.count(),1,'next action must open the existing three-track Planner draft instead of creating a parallel plan surface');
  await page.locator('#bottomNav [data-page="today"]').click();await flow.waitFor({state:'visible',timeout:5000});await page.waitForFunction(()=>document.getElementById('main')?.dataset?.gto==='1'&&document.querySelector('#garangTodayFlow')?.dataset?.gtoPhase==='checked',{timeout:5000});assert.match(await flow.locator('[data-garang-checkin-access="1"]').innerText(),/수정/,'single check-in state must survive route round-trip');assert.equal(await flow.locator('.gtf-decision').isHidden(),true,'Coach decision ownership must survive route round-trip');assert.equal(await page.locator('.today-body-panel').count(),1,'Today anatomy must survive route round-trip');
  assert.deepEqual(errors,[],`Today brand flow browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-today-action-flow GARANG state -> single check-in -> next action; Coach owns decision: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});