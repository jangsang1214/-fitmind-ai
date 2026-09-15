'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8778,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');const date=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,180));}throw new Error('GARANG Today preview server did not start');}
function seed(){const today=date();return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Today Flow',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[{id:'seed-workout',date:today,name:'벤치프레스',sets:3,reps:8,weight:60,rpe:7,duration:45}],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[{name:'coach_recommendation_shown',date:today,props:{screen:'coach',date:today}}]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
const visiblePrimary=page=>page.locator('#garangTodayFlow .gtf-next[data-gsn-action],#garangTodayFlow [data-garang-checkin-access="1"]').evaluateAll(nodes=>nodes.filter(el=>{const s=getComputedStyle(el),b=el.getBoundingClientRect();return !el.hidden&&s.display!=='none'&&s.visibility!=='hidden'&&b.width>0&&b.height>0;}).length);
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},seed());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  await page.waitForFunction(()=>window.GarangTodayMorningOrchestratorV1?.version==='1.2.0'&&window.GarangProductConsolidationV1?.version==='garang-product-consolidation-v1.1.0',{timeout:9000});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.gpcToday==='1'&&document.querySelector('#garangTodayFlow')?.dataset?.gtoPhase==='precheckin',null,{timeout:9000});
  const flow=page.locator('#garangTodayFlow');await flow.waitFor({state:'visible',timeout:5000});
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today');
  assert.equal(await page.locator('#main').getAttribute('data-garang-decision-owner'),'coach','Today shows the deterministic judgment summary while Coach remains the canonical decision disclosure owner');
  assert.equal(await flow.getAttribute('data-decision-owner'),'coach');
  assert.match(await flow.getAttribute('aria-label'),/GARANG 판단/);
  assert.equal(await flow.locator('.gtf-decision').isVisible(),true,'Today must answer what GARANG thinks today');
  assert.equal(await flow.locator('.gtf-disclosure').isHidden(),true,'detailed rationale must remain progressive and Coach-owned');
  assert.equal(await flow.locator('.gpc-coach-explain').isVisible(),true,'Today must offer one quiet explanation entry');
  assert.equal(await flow.locator('.gpc-today-plan .gtf-track').count(),3,'Today plan must retain Training, Recovery and Nutrition');
  assert.equal(await page.locator('#garangTodayBrandHero').isHidden(),true,'decorative hero must not compete with Today question');
  assert.equal(await page.locator('#garangTodayDensity').isHidden(),true,'duplicate metric density must not compete with Today judgment');

  const checkin=flow.locator('[data-garang-checkin-access="1"]');await checkin.waitFor({state:'visible',timeout:5000});assert.match(await checkin.innerText(),/오늘 상태/);assert.equal(await flow.locator('.gtf-action').isHidden(),true,'before recovery evidence only check-in may own the next action');assert.equal(await visiblePrimary(page),1,'pre-check-in Today must expose one primary action');
  await checkin.click();const save=page.locator('.modal #saveCheckin');await save.waitFor({state:'visible',timeout:3000});await page.locator('#ciSleep').fill('5.5');await page.locator('#ciEnergy').fill('2');await page.locator('#ciStress').fill('4');await page.locator('#ciSoreness').fill('5');await page.locator('#ciMinutes').fill('35');await save.click();
  await page.waitForFunction(today=>{const s=window.GarangAgentStateBridge?.getState?.();return [...(s?.dailyCheckins||[]),...(s?.checkins||[])].some(row=>String(row?.date||'').slice(0,10)===today);},date(),{timeout:5000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayFlow')?.dataset?.gtoPhase==='checked'&&document.querySelector('#garangTodayFlow .gtf-next[data-gsn-action="coach"][data-gsn-step="plan"]'),null,{timeout:9000});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangDecisionOwner==='coach',null,{timeout:3000});
  await page.waitForFunction(()=>{const plan=document.querySelector('#garangTodayFlow .gpc-today-plan');if(!plan)return false;const style=getComputedStyle(plan),box=plan.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.height>0;},null,{timeout:3000});
  assert.equal(await flow.locator('.gtf-decision').isVisible(),true,'post-check-in GARANG judgment must stay visible on Today');
  assert.equal(await flow.locator('.gpc-today-plan').isVisible(),true,'plan remains visible between judgment and action');
  assert.equal(await flow.locator('.gtf-action').isVisible(),true,'canonical next action must return after check-in');
  assert.equal(await checkin.isHidden(),true,'state edit becomes secondary while another next action owns Today');
  assert.equal(await visiblePrimary(page),1,'Today still exposes exactly one primary action after check-in');
  const next=flow.locator('.gtf-next[data-gsn-action="coach"][data-gsn-step="plan"]');assert.match(await next.innerText(),/Coach/,'planning must still route through Coach proposal/confirmation boundary');
  await flow.locator('.gpc-coach-explain').click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='coach',{timeout:5000});assert.equal(await page.locator('.garang-coach-v2').count(),1);
  await page.locator('#bottomNav [data-page="today"]').click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.gpcToday==='1',null,{timeout:7000});
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,`Today consolidation must not overflow mobile viewport: ${JSON.stringify(width)}`);
  assert.deepEqual(errors,[],`Today consolidation browser errors:\n${errors.join('\n')}`);await context.close();console.log('browser-today-action-flow state -> judgment -> plan -> single action: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});