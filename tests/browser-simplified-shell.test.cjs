'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8781,baseURL=`http://127.0.0.1:${port}`;
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('GARANG simplified shell preview server did not start');}
function demoState(){return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Shell',age:28,height:174,weight:70,gender:'male',goal:'퍼포먼스 향상'},onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
async function openRecordRoute(page,route){
  await page.locator('#bottomNav [data-garang-primary-nav="1"][data-page="log"]').click();
  const sheet=page.locator('[data-garang-record-sheet="1"]');await sheet.waitFor({state:'visible',timeout:3000});
  await sheet.locator(`[data-garang-record-route="${route}"]`).click();
  await page.waitForFunction(r=>document.getElementById('main')?.dataset?.garangScreen===r,route,{timeout:5000});
  assert.equal(await page.locator('.garang-more-sheet').count(),0,`${route}: Record navigation must not reopen legacy More`);
}
async function routeWithRouter(page,route,selector,screen=route){
  const ok=await page.evaluate(r=>window.GarangRouter?.navigate?.(r,{source:'simplified-shell-test',force:true}),route);
  assert.equal(ok,true,`${route}: canonical Router must retain direct navigation`);
  await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,screen,{timeout:5000});
  assert.equal(await page.locator(selector).count(),1,`${route}: existing screen capability must remain reachable`);
  assert.equal(await page.locator('.garang-more-sheet').count(),0,`${route}: direct route must not create legacy More`);
}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},demoState());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  await page.waitForFunction(()=>window.GarangSimplifiedShell?.version==='1.1.0'&&window.GarangRouter?.version==='garang-router-v1.3.0'&&window.GarangScreens?.version==='1.2.1',{timeout:7000});
  const nav=page.locator('#bottomNav [data-garang-primary-nav="1"]');assert.equal(await nav.count(),4,'only four primary navigation items may remain');
  const navPages=await nav.evaluateAll(nodes=>nodes.map(x=>x.dataset.page));assert.deepEqual(navPages,['today','log','coach','progress']);
  const labels=await nav.locator('b').allTextContents();assert.deepEqual(labels,['Today','Record','Coach','누적.']);
  const bridges=page.locator('#bottomNav [data-garang-route-bridge="1"]');
  assert.ok(await bridges.count()<=1,'runtime must never duplicate the single internal app bridge');
  assert.equal(await bridges.evaluateAll(nodes=>nodes.every(x=>x.hidden&&x.getAttribute('aria-hidden')==='true'&&getComputedStyle(x).display==='none')),true,'any surviving internal app bridge must stay invisible and non-interactive');
  assert.equal(await page.locator('.quick-visual-grid').isHidden(),true,'Today duplicate quick-record grid must be hidden');
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today');

  await page.locator('#bottomNav [data-garang-primary-nav="1"][data-page="log"]').click();
  const firstSheet=page.locator('[data-garang-record-sheet="1"]');await firstSheet.waitFor({state:'visible',timeout:3000});
  assert.equal(await firstSheet.locator('[data-garang-record-route]').count(),4,'Record must expose the four existing recording routes');
  assert.doesNotMatch(await firstSheet.innerText(),/All\s*Log/i,'legacy All Log must not be exposed');
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today','opening Record must not navigate to the legacy LOG page');
  const lock=await page.evaluate(()=>getComputedStyle(document.body).overflowY);assert.equal(lock,'hidden','Record sheet must lock background vertical scrolling');
  await firstSheet.locator('.garang-record-close').click();await firstSheet.waitFor({state:'detached'});

  await openRecordRoute(page,'workout');assert.equal(await page.locator('#saveWorkoutSession').count(),1,'existing Workout feature must remain reachable');
  assert.equal(await page.locator('#bottomNav [data-garang-primary-nav="1"][data-page="log"]').getAttribute('aria-current'),'page','Record nav must own workout sub-route');
  await openRecordRoute(page,'nutrition');assert.equal(await page.locator('#saveMeal').count(),1,'existing Nutrition feature must remain reachable from another record screen');
  await openRecordRoute(page,'running');assert.equal(await page.locator('#runStart').count(),1,'existing Running feature must remain reachable from another record screen');
  await openRecordRoute(page,'body');assert.equal(await page.locator('#saveBody').count(),1,'existing Body feature must remain reachable from another record screen');

  await routeWithRouter(page,'planner','#addPlan');
  await routeWithRouter(page,'memory','#saveMemory');
  await routeWithRouter(page,'profile','#saveProfile');
  await routeWithRouter(page,'settings','#savePreferences');
  await routeWithRouter(page,'onboarding','#saveOnboarding','modeling');

  await page.locator('#bottomNav [data-garang-primary-nav="1"][data-page="coach"]').click();
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='coach',{timeout:5000});
  assert.ok(await page.locator('.garang-coach-v2,.coach-app-shell').count()>=1,'existing Coach feature must remain reachable');

  await page.locator('#bottomNav [data-garang-primary-nav="1"][data-page="progress"]').click();
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='progress',{timeout:5000});
  assert.equal(await page.locator('.progress-tabs').count(),1,'existing Progress/Accumulation feature must remain reachable');

  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,`Simplified shell must not overflow mobile viewport: ${JSON.stringify(width)}`);
  assert.deepEqual(errors,[],`Simplified shell browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-simplified-shell WebKit mobile: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
