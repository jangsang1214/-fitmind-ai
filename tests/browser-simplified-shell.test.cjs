'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.join(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8781,baseURL=`http://127.0.0.1:${port}`;
function dateOffset(offset){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,180));}throw new Error('GARANG consolidated shell preview server did not start');}
function demoState(){const today=dateOffset(0),yesterday=dateOffset(-1),older=dateOffset(-20);return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Shell',age:28,height:174,weight:70,gender:'male',goal:'퍼포먼스 향상'},onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[{id:'w1',date:yesterday,name:'스쿼트',sets:4,reps:6,weight:82.5,rpe:8,duration:50}],meals:[{id:'m1',date:yesterday,name:'닭가슴살 식사',kcal:620,protein:52,carbs:45,fat:12,items:[{name:'닭가슴살',grams:180,kcal:300,protein:48,carbs:0,fat:6}]}],runs:[{id:'r1',date:yesterday,distance:5,duration:30}],body:[{id:'b0',date:older,weight:71,muscle:31,fatPercent:15},{id:'b1',date:yesterday,weight:70,muscle:31.5,fatPercent:14.5}],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[{name:'coach_recommendation_shown',date:today,props:{date:today}}]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
async function route(page,screen){const ok=await page.evaluate(next=>window.GarangRouter?.navigate?.(next,{source:'product-consolidation-test',force:true}),screen);assert.equal(ok,true,`${screen} must remain canonically routable`);await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,screen,{timeout:6000});await page.waitForTimeout(600);}
async function waitControl(page,screen,selector){await page.waitForFunction(({screen,selector})=>document.getElementById('main')?.dataset?.garangScreen===screen&&!!document.querySelector(selector),{screen,selector},{timeout:5000});assert.equal(await page.locator(selector).count(),1,`${screen} canonical control ${selector} must remain attached`);}
async function openRecord(page){await page.locator('#bottomNav [data-page="log"]').click();const sheet=page.locator('[data-garang-record-sheet="1"]');await sheet.waitFor({state:'visible',timeout:4000});await page.waitForFunction(()=>document.querySelectorAll('.garang-record-sheet [data-garang-record-route]').length===4&&document.querySelector('.garang-record-sheet [data-garang-record-action="recovery"]'),null,{timeout:4000});return sheet;}
async function verifyCapabilityRoute(page,screen,selector){const ok=await page.evaluate(next=>window.GarangRouter?.navigate?.(next,{source:'product-consolidation-capability-preservation',force:true}),screen);assert.equal(ok,true,`${screen} capability route must remain available`);await page.waitForFunction(({screen,selector})=>document.getElementById('main')?.dataset?.garangScreen===screen&&!!document.querySelector(selector),{screen,selector},{timeout:6000});await page.waitForTimeout(700);assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),screen,`${screen} must remain the active capability screen after runtime reconciliation`);assert.equal(await page.locator(selector).count(),1,`${screen} canonical control ${selector} must remain attached after runtime reconciliation`);}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await installAuthenticatedFirebaseMock(context);
  await context.addInitScript(payload=>{localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload));},demoState());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
  await page.waitForFunction(()=>window.GarangProductConsolidationV1?.version==='garang-product-consolidation-v1.1.0'&&window.GarangSimplifiedShell&&window.GarangRouter,null,{timeout:8000});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.gpcToday==='1',null,{timeout:8000});

  const nav=page.locator('#bottomNav [data-garang-primary-nav="1"]');assert.equal(await nav.count(),4,'only four primary product surfaces may remain');
  assert.deepEqual(await nav.evaluateAll(nodes=>nodes.map(x=>x.dataset.page)),['today','log','coach','progress']);
  const labels=await nav.locator('b').allTextContents();assert.deepEqual(labels.slice(0,3),['Today','Record','Coach']);assert.match(labels[3]||'',/^(?:Progress|누적\.?)$/,'Progress label may localize while the canonical page identity remains progress');
  assert.equal(await page.locator('.quick-visual-grid').isHidden(),true,'Today duplicate quick-record grid must stay internalized');
  assert.equal(await page.locator('.status-visual-card').isHidden(),true,'legacy Today state owner must stay internalized');
  assert.ok(await page.locator('.status-visual-card [data-action="open-checkin"]').count()>=1,'canonical check-in write owner must remain in DOM');
  assert.equal(await page.locator('#garangTodayBrandHero').isHidden(),true,'decorative brand hero must be internalized, not deleted');
  assert.equal(await page.locator('#garangTodayDensity').isHidden(),true,'duplicate Today density dashboard must be internalized');

  const today=page.locator('#garangTodayFlow');await today.waitFor({state:'visible',timeout:5000});
  assert.equal(await today.locator('.gtf-decision').isVisible(),true,'Today must show the deterministic GARANG judgment summary');
  assert.equal(await today.locator('.gpc-today-plan').count(),1,'Today must expose one consolidated plan section');
  assert.equal(await today.locator('.gpc-today-plan .gtf-track').count(),3,'Training, Recovery and Nutrition must remain visible in Today plan');
  assert.equal(await today.locator('.gpc-coach-explain').count(),1,'Today must provide one natural entry to Coach rationale');
  assert.equal(await page.locator('#main').getAttribute('data-garang-decision-owner'),'coach','Today may show a judgment summary while Coach remains the canonical decision disclosure owner');
  assert.equal(await today.locator('.gtf-disclosure').isHidden(),true,'detailed rationale stays out of Today');
  await today.locator('.gpc-coach-explain').click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='coach',null,{timeout:5000});
  assert.equal(await page.locator('.garang-coach-v2').count(),1,'Coach remains the explanation/exploration/action surface');
  await route(page,'today');

  let sheet=await openRecord(page);
  assert.equal(await sheet.locator('[data-garang-record-route]').count(),4,'four canonical record routes must remain unchanged');
  assert.equal(await sheet.locator('[data-garang-record-action="recovery"]').count(),1,'Recovery must join the Record mental model without a new route');
  assert.equal(await sheet.locator('.garang-record-route').count(),5,'Record must present five human recording domains');
  await sheet.locator('[data-garang-record-action="recovery"]').click();
  await page.locator('.modal #saveCheckin').waitFor({state:'visible',timeout:5000});assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today','Recovery Record must reuse Today canonical check-in owner');await page.locator('.modal-close').click();

  for(const [recordRoute,selector] of [['workout','#addWorkout'],['nutrition','#saveMeal'],['running','#runStart'],['body','#saveBody']]){
    sheet=await openRecord(page);await sheet.locator(`[data-garang-record-route="${recordRoute}"]`).click();await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,recordRoute,{timeout:5000});assert.equal(await page.locator(selector).count(),1,`${recordRoute} canonical flow must remain reachable`);
  }
  await route(page,'workout');assert.equal(await page.locator('.gws-panel[data-garang-workout-surface]').count(),3,'Workout overview/exercise/log surfaces must remain intact');assert.equal(await page.locator('#wName').count(),1,'Workout inputs must not be duplicated');

  await verifyCapabilityRoute(page,'planner','#addPlan');
  await verifyCapabilityRoute(page,'memory','#saveMemory');
  await verifyCapabilityRoute(page,'settings','#savePreferences');

  await route(page,'today');await page.locator('#menuBtn').click();await page.waitForTimeout(250);
  assert.equal(await page.locator('.garang-more-sheet [data-route="planner"]:visible,.garang-more-sheet [data-pagego="planner"]:visible').count(),0,'Planner must not compete as a first-level product');
  assert.equal(await page.locator('.garang-more-sheet [data-route="memory"]:visible,.garang-more-sheet [data-pagego="memory"]:visible').count(),0,'Memory must read as a capability, not a product surface');
  await page.keyboard.press('Escape').catch(()=>{});

  await route(page,'progress');await page.waitForFunction(()=>document.querySelector('#garangAccumulationOverview')?.dataset?.gpcProgress==='1',null,{timeout:6000});
  assert.equal(await page.locator('#garangAccumulationOverview').isVisible(),true,'canonical Progress interpretation surface must remain visible');
  assert.equal(await page.locator('.progress-tabs').isHidden(),true,'legacy range/dashboard chrome must be internalized');
  assert.equal(await page.locator('.grid.grid-4').isHidden(),true,'legacy metric wall must be internalized rather than deleted');
  const meaning=await page.locator('#garangAccumulationOverview [data-gx-meaning-loop] .gx-insight>span').allTextContents();assert.deepEqual(meaning,['실제 기록','GARANG이 배운 것','다음 판단'],'Progress must read as record -> learning -> next judgment');
  assert.match(await page.locator('#main>.page-head').innerText(),/나의 변화/);

  assert.equal(await page.locator('#planBadge').isHidden(),true,'membership chrome must not compete in the primary shell');
  assert.equal(await page.locator('#logoutBtn').isHidden(),true,'logout remains a Settings utility, not primary chrome');
  await route(page,'settings');await waitControl(page,'settings','#settingsLogout');
  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(overflow.scroll<=overflow.client+1,`consolidated shell must not horizontally overflow: ${JSON.stringify(overflow)}`);
  assert.deepEqual(errors,[],`consolidated shell browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-simplified-shell four-surface product consolidation: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
