'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8765,baseURL=`http://127.0.0.1:${port}`;
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('built GARANG server did not start');}
const dirtyState=()=>({
  meta:{schemaVersion:5,updatedAt:'2026-09-06T00:00:00.000Z'},profile:{name:'Regression User',goal:'퍼포먼스 향상',weight:70},
  onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},
  workouts:[null,'bad',{id:'w-safe',date:'2026-09-06',name:'스쿼트',weight:80,reps:5,sets:3,updatedAt:'2026-09-06T00:00:00.000Z'}],
  meals:[null,{id:'m-safe',date:'2026-09-06',name:'아침',items:[null,{id:'food-safe',name:'계란',grams:100,kcal:150,protein:13,carbs:1,fat:10}],updatedAt:'2026-09-06T00:00:00.000Z'}],
  checkins:[null,{id:'c-safe',date:'2026-09-06',sleep:7,energy:3,stress:2,soreness:2,updatedAt:'2026-09-06T00:00:00.000Z'}],
  runs:[null],body:[null],planner:[null],aiChat:[null],actionLog:[null],errors:[null],memory:null,analytics:null,plan:'FREE'
});
async function tap(page,locator,touch,label='target'){
  if(!touch){await locator.click();return;}
  await locator.waitFor({state:'visible',timeout:5000});
  await locator.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));
  await page.waitForTimeout(24);
  const box=await locator.boundingBox();
  assert.ok(box,`${label} must have a touch box`);
  const ownsPoint=await locator.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!hit&&(hit===el||el.contains(hit));});
  assert.equal(ownsPoint,true,`${label} must own its physical touch point`);
  await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
}
async function assertOwnsPoint(page,selector){
  const locator=page.locator(selector);await locator.waitFor({state:'visible',timeout:5000});
  await locator.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));await page.waitForTimeout(24);
  const ok=await locator.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!hit&&(hit===el||el.contains(hit));});
  assert.equal(ok,true,`${selector} must own its hit-test point`);
}
async function assertTodayStable(page,label){
  await page.locator('#garangTodayRebuild').waitFor({state:'visible',timeout:7000});
  const d=await page.evaluate(()=>{
    const main=document.getElementById('main'),surface=document.querySelector('#garangTodayRebuild'),legacy=document.querySelector('#garangTodayFlow'),grid=main?.querySelector('.quick-visual-grid')||null;
    const fixed=[...document.querySelectorAll('body *')].map(el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();return {el,cs,r};})
      .filter(x=>x.cs.display!=='none'&&x.cs.visibility!=='hidden'&&x.cs.position==='fixed'&&x.r.width>=innerWidth*.75&&x.r.height>=120)
      .map(x=>({id:x.el.id||'',cls:String(x.el.className||''),top:Math.round(x.r.top),bottom:Math.round(x.r.bottom)}));
    return {
      screen:main?.dataset?.garangScreen||'',hasCoach:!!document.querySelector('.garang-coach-v2'),surfaceVisible:!!surface&&getComputedStyle(surface).display!=='none',
      decision:surface?.querySelector('.gtr1-hero h1')?.textContent?.trim()||'',tracks:surface?.querySelectorAll('.gtr1-track').length||0,next:!!surface?.querySelector('.gtr1-next-card'),detail:!!surface?.querySelector('[data-gtr1-detail]'),
      legacyExists:!!legacy,legacyAriaHidden:legacy?.getAttribute('aria-hidden')||null,legacyHidden:!!legacy?.classList.contains('gtr1-legacy-hidden'),
      quickGrid:{exists:!!grid,count:grid?.querySelectorAll('.quick-visual').length||0,ariaHidden:grid?.getAttribute('aria-hidden')||null},motionCanvas:document.querySelectorAll('.gtd3-motion-canvas').length,
      fixed,viewportHeight:innerHeight
    };
  });
  assert.equal(d.screen,'today',`${label}: Today screen ownership must remain`);
  assert.equal(d.hasCoach,false,`${label}: Today must not retain Coach root`);
  assert.equal(d.surfaceVisible,true,`${label}: rebuilt Today surface must be visible`);
  assert.ok(d.decision.length>0,`${label}: GARANG decision must render`);
  assert.equal(d.tracks,3,`${label}: training/recovery/nutrition tracks must render`);
  assert.equal(d.next,true,`${label}: one next action must render`);
  assert.equal(d.detail,true,`${label}: progressive evidence disclosure must remain`);
  assert.equal(d.legacyExists,true,`${label}: canonical legacy Today contract must remain mounted for rollback/action compatibility`);
  assert.equal(d.legacyAriaHidden,'true',`${label}: canonical legacy presentation must be internalized`);
  assert.equal(d.legacyHidden,true,`${label}: canonical legacy presentation must not compete visually`);
  assert.equal(d.quickGrid.exists,true,`${label}: legacy quick-record capabilities must remain in DOM`);
  assert.equal(d.quickGrid.count,4,`${label}: all four quick-record capabilities must remain available to the canonical shell`);
  assert.equal(d.motionCanvas,0,`${label}: removed ink-water motion must not render`);
  const suspicious=d.fixed.filter(x=>!x.cls.includes('garang-more-sheet')&&!x.cls.includes('garang-record-backdrop')&&!x.id.includes('bottomNav')&&x.bottom>0&&x.top<d.viewportHeight);
  assert.equal(suspicious.length,0,`${label}: unexpected fixed layer can cover Today content: ${JSON.stringify(suspicious)}`);
}
async function armRouteCompletion(page,route){
  await page.evaluate(r=>{window.__garangBrowserInteractionRoute=null;const old=window.__garangBrowserInteractionRouteListener;if(old)window.removeEventListener('garang:route-completed',old);const done=event=>{if(event?.detail?.route!==r)return;window.__garangBrowserInteractionRoute={route:r};window.removeEventListener('garang:route-completed',done);window.__garangBrowserInteractionRouteListener=null;};window.__garangBrowserInteractionRouteListener=done;window.addEventListener('garang:route-completed',done);},route);
}
async function openRecordRoute(page,route,touch,label){
  const record=page.locator('#bottomNav button[data-page="log"]');await tap(page,record,touch,`${label}: Record`);
  const sheet=page.locator('[data-garang-record-sheet="1"]');await sheet.waitFor({state:'visible',timeout:3000});const target=sheet.locator(`[data-garang-record-route="${route}"]`);
  await armRouteCompletion(page,route);await tap(page,target,touch,`${label}: ${route}`);
  await page.waitForFunction(r=>window.__garangBrowserInteractionRoute?.route===r,route,{timeout:5000});await page.waitForFunction(r=>document.getElementById('main')?.dataset?.garangScreen===r,route,{timeout:5000});
  assert.equal(await page.locator('#bottomNav button[data-page="log"]').getAttribute('aria-current'),'page',`${label}: Record must own ${route}`);
}

(async()=>{
  const server=startStaticServer(serveRoot,port);let browser;
  try{
    await waitForServer();browser=await chromium.launch({headless:true});
    for(const mode of [{name:'desktop',viewport:{width:1280,height:900},touch:false},{name:'mobile',viewport:{width:390,height:844},touch:true}]){
      const context=await browser.newContext({viewport:mode.viewport,isMobile:mode.touch,hasTouch:mode.touch});
      await context.addInitScript(state=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(state));},dirtyState());
      const page=await context.newPage(),pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e?.stack||e?.message||e)));
      await page.goto(`${baseURL}/?mode=${mode.name}`,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
      await page.locator('#garangTodayRebuild').waitFor({state:'visible',timeout:10000});

      const repaired=await page.evaluate(()=>JSON.parse(localStorage.getItem('garang_demo_state_v3')));
      assert.equal(repaired.workouts.length,1,`${mode.name}: malformed workouts must be removed`);assert.equal(repaired.meals.length,1);assert.equal(repaired.meals[0].items.length,1);assert.equal(repaired.checkins.length,1);assert.ok(repaired.memory&&Array.isArray(repaired.memory.entries));assert.ok(repaired.analytics&&Array.isArray(repaired.analytics.events));

      await assertTodayStable(page,`${mode.name} initial Today`);
      await assertOwnsPoint(page,'#menuBtn');await assertOwnsPoint(page,'#bottomNav button[data-page="coach"]');await assertOwnsPoint(page,'#bottomNav button[data-page="log"]');await assertOwnsPoint(page,'.gtr1-next-card');
      const detail=page.locator('[data-gtr1-detail]');await tap(page,detail,mode.touch,`${mode.name}: evidence toggle`);assert.equal(await detail.getAttribute('aria-expanded'),'true',`${mode.name}: evidence must expand`);

      const menu=page.locator('#menuBtn');await tap(page,menu,mode.touch,`${mode.name}: hamburger`);await page.locator('.garang-more-sheet').waitFor({state:'visible',timeout:3000});
      for(const route of ['workout','nutrition','running','body'])assert.equal(await page.locator(`.garang-more-sheet [data-route="${route}"]:visible`).count(),0,`${mode.name}: ${route} must not duplicate Record in More`);
      await page.evaluate(()=>window.GarangRouter?.cleanup?.());assert.equal(await page.locator('.garang-more-sheet').count(),0,`${mode.name}: transient More sheet must close cleanly`);

      await openRecordRoute(page,'running',mode.touch,mode.name);assert.equal(await page.locator('#runStart').count(),1,`${mode.name}: Running feature must remain reachable`);
      await openRecordRoute(page,'workout',mode.touch,mode.name);assert.equal(await page.locator('#saveWorkoutSession').count(),1,`${mode.name}: Workout feature must remain reachable`);
      await openRecordRoute(page,'body',mode.touch,mode.name);assert.equal(await page.locator('#saveBody').count(),1,`${mode.name}: Body feature must remain reachable`);

      for(const route of ['today','coach','today','progress']){const button=page.locator(`#bottomNav button[data-page="${route}"]`);await tap(page,button,mode.touch,`${mode.name}: bottom nav ${route}`);await page.waitForFunction(r=>document.querySelector(`#bottomNav button[data-page="${r}"]`)?.classList.contains('active'),route);assert.ok((await page.locator('#main').innerText()).trim().length>0,`${mode.name}: ${route} must render`);if(route==='today')await assertTodayStable(page,`${mode.name} returned Today`);}
      assert.deepEqual(pageErrors,[],`${mode.name} browser runtime errors:\n${pageErrors.join('\n')}`);await context.close();
    }
    console.log('browser-interaction desktop+mobile rebuilt-Today+feature-reachability: PASS');
  }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
