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
const visibleCount=page=>page.locator('#garangTodayFlow .gtf-next[data-gsn-action],#garangTodayFlow [data-garang-checkin-access="1"],[data-golden-path-surface]').evaluateAll(nodes=>nodes.filter(el=>{const style=getComputedStyle(el),box=el.getBoundingClientRect();return !el.hidden&&style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.height>0;}).length);
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
  await page.waitForFunction(()=>{const f=document.querySelector('#garangTodayFlow');return f?.dataset?.gtoPhase==='precheckin'&&f?.dataset?.gtoChecked==='0';},{timeout:7000});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.gpStep==='plan',null,{timeout:7000});

  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today');
  assert.equal(await page.locator('#main').getAttribute('data-gtf-c'),'1','C direction must own Today');
  assert.equal(await page.locator('#main').getAttribute('data-garang-decision-owner'),'coach','Coach must remain the single user-facing decision owner');
  assert.equal(await flow.getAttribute('data-decision-owner'),'coach');
  assert.equal(await flow.getAttribute('aria-label'),'오늘 상태와 다음 행동');
  assert.equal(await flow.getAttribute('data-gto-checked'),'0');
  assert.equal(await flow.getAttribute('data-gto-phase'),'precheckin');
  assert.equal(await page.locator('#garangCoreToday').isHidden(),true,'accumulation whisper must stay internalized');
  assert.equal(await flow.locator('.gtf-context').isHidden(),true,'draft context must remain quiet on Today');
  assert.equal(await flow.locator('.gtf-decision').isHidden(),true,'Today must not render a second GARANG decision surface');
  assert.equal(await flow.locator('.gtf-disclosure').isHidden(),true,'decision rationale belongs to Coach');
  assert.equal(await page.locator('[data-golden-path-surface]').count(),0,'Golden Path must not own a parallel visible surface');
  assert.equal(await page.locator('.visual-today-hero').isHidden(),true,'body anatomy must not be the default Today hero');
  assert.ok(await page.locator('[data-action="open-checkin"]').count()>=1,'canonical app check-in action must remain');

  const visual=flow.locator('.gtf-track-visual');await visual.waitFor({state:'visible',timeout:5000});assert.equal(await visual.locator('.gtf-track').count(),3,'Today must show training, recovery and nutrition in one rail');
  for(const domain of ['training','recovery','nutrition'])assert.equal(await visual.locator(`.gtf-track[data-domain="${domain}"]`).count(),1,`${domain} must remain glanceable`);
  const signal=flow.locator('[data-garang-accumulation-symbol="1"]');assert.equal(await signal.count(),1);const signalBox=await signal.boundingBox();assert.ok(signalBox&&signalBox.width>=70,'accumulation symbol must remain glanceable');
  assert.match(await flow.locator('.gtf-state-copy').innerText(),/오늘/);

  const checkinAccess=flow.locator('[data-garang-checkin-access="1"]');await checkinAccess.waitFor({state:'visible',timeout:5000});
  assert.equal(await checkinAccess.getAttribute('data-gto-priority'),'1','pre-check-in control must own the primary hierarchy');
  const checkinText=await checkinAccess.innerText();assert.match(checkinText,/오늘 상태/);assert.match(checkinText,/30초/);assert.match(checkinText,/3영역/);
  assert.equal(await flow.locator('.gtf-action').isHidden(),true,'before recovery evidence no second action may compete');
  assert.equal(await visibleCount(page),1,'pre-check-in Today must expose one visible action owner');
  const checkinBox=await checkinAccess.boundingBox();assert.ok(checkinBox&&checkinBox.height>=44,'Today check-in must remain touchable');

  await checkinAccess.click();const saveCheckin=page.locator('.modal #saveCheckin');await saveCheckin.waitFor({state:'visible',timeout:3000});
  await page.locator('#ciSleep').fill('5.5');await page.locator('#ciEnergy').fill('2');await page.locator('#ciStress').fill('4');await page.locator('#ciSoreness').fill('5');await page.locator('#ciMinutes').fill('35');await saveCheckin.click();
  await page.waitForFunction(today=>{const s=window.GarangAgentStateBridge?.getState?.();return [...(s?.dailyCheckins||[]),...(s?.checkins||[])].some(row=>String(row?.date||'').slice(0,10)===today);},date(),{timeout:5000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayFlow')?.dataset?.gtoPhase==='checked',null,{timeout:7000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayFlow .gtf-next[data-gsn-action="coach"][data-gsn-step="plan"]'),null,{timeout:7000});

  assert.equal(await flow.locator('.gtf-decision').isHidden(),true,'post-check-in judgment must remain Coach-owned');
  assert.equal(await flow.locator('.gtf-disclosure').isHidden(),true,'Today must not reintroduce decision reasons');
  assert.equal(await flow.locator('.gtf-action').isVisible(),true,'after check-in the single Golden Path next action must return');
  assert.equal(await checkinAccess.isHidden(),true,'state edit becomes secondary while another next action owns Today');
  assert.equal(await page.locator('[data-golden-path-surface]').count(),0,'legacy Golden Path sibling surface must stay removed');
  assert.equal(await visibleCount(page),1,'post-check-in Today must still expose exactly one visible next-action owner');
  const next=flow.locator('.gtf-next[data-gsn-action="coach"][data-gsn-step="plan"]');
  assert.match(await next.innerText(),/Coach/,'the plan step must route through Coach rather than bypassing judgment');
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,`Today brand flow must not overflow mobile viewport: ${JSON.stringify(width)}`);

  await next.click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='coach',{timeout:5000});
  await page.locator('.garang-coach-v2').waitFor({state:'visible',timeout:5000});
  await page.locator('#bottomNav [data-page="today"]').click();await flow.waitFor({state:'visible',timeout:5000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayFlow .gtf-next[data-gsn-action="coach"][data-gsn-step="plan"]'),null,{timeout:7000});
  assert.equal(await visibleCount(page),1,'single action ownership must survive route round-trip');
  assert.equal(await page.locator('[data-golden-path-surface]').count(),0);
  assert.deepEqual(errors,[],`Today brand flow browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-today-action-flow Today check-in -> single Coach next action: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});