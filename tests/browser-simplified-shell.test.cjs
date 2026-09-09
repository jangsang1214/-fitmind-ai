'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8781,baseURL=`http://127.0.0.1:${port}`;
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('GARANG simplified shell preview server did not start');}
function dateOffset(offset){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function demoState(){const today=dateOffset(0),yesterday=dateOffset(-1),older=dateOffset(-20);return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Shell',age:28,height:174,weight:70,gender:'male',goal:'퍼포먼스 향상'},onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},planner:[{id:'p1',date:today,title:'하체',completed:false,status:'confirmed'}],workouts:[{id:'w1',date:yesterday,name:'스쿼트',sets:4,reps:6,weight:82.5,rpe:8,duration:50}],meals:[{id:'m1',date:yesterday,name:'닭가슴살 식사',kcal:620,protein:52,carbs:45,fat:12,items:[{name:'닭가슴살',grams:180,kcal:300,protein:48,carbs:0,fat:6}]}],runs:[{id:'r1',date:yesterday,distance:5,duration:30}],body:[{id:'b0',date:older,weight:71,muscle:31,fatPercent:15},{id:'b1',date:yesterday,weight:70,muscle:31.5,fatPercent:14.5}],checkins:[{id:'c1',date:yesterday,sleep:7.2,energy:4}],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
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
  await page.waitForFunction(()=>window.GarangSimplifiedShell?.version==='1.1.1'&&window.GarangCoreLoopV1?.version==='garang-core-loop-v1.0.0'&&window.GarangRouter?.version==='garang-router-v1.3.0'&&window.GarangScreens?.version==='1.2.1',{timeout:7000});
  const nav=page.locator('#bottomNav [data-garang-primary-nav="1"]');assert.equal(await nav.count(),4,'only four primary navigation items may remain');
  const navPages=await nav.evaluateAll(nodes=>nodes.map(x=>x.dataset.page));assert.deepEqual(navPages,['today','log','coach','progress']);
  const labels=await nav.locator('b').allTextContents();assert.deepEqual(labels,['Today','Record','Coach','누적.']);
  const bridges=page.locator('#bottomNav [data-garang-route-bridge="1"]');
  assert.ok(await bridges.count()<=1,'runtime must never duplicate the single internal app bridge');
  assert.equal(await bridges.evaluateAll(nodes=>nodes.every(x=>x.hidden&&x.getAttribute('aria-hidden')==='true'&&getComputedStyle(x).display==='none')),true,'any surviving internal app bridge must stay invisible and non-interactive');
  assert.equal(await page.locator('.quick-visual-grid').isHidden(),true,'Today duplicate quick-record grid must be hidden');
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today');
  await page.locator('#garangCoreToday').waitFor({state:'visible',timeout:5000});
  assert.match(await page.locator('#garangCoreToday').innerText(),/남은 계획|방향/,'Today must surface the next useful state, not another dashboard');

  await page.locator('#bottomNav [data-garang-primary-nav="1"][data-page="log"]').click();
  const firstSheet=page.locator('[data-garang-record-sheet="1"]');await firstSheet.waitFor({state:'visible',timeout:3000});
  assert.equal(await firstSheet.locator('[data-garang-record-route]').count(),4,'Record must expose the four existing recording routes');
  assert.doesNotMatch(await firstSheet.innerText(),/All\s*Log/i,'legacy All Log must not be exposed');
  await firstSheet.locator('[data-gcl-recent]').waitFor({state:'visible',timeout:3000});
  assert.ok(await firstSheet.locator('[data-gcl-reuse]').count()>=4,'Record must expose reusable recent values without auto-saving them');
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today','opening Record must not navigate to the legacy LOG page');
  const lock=await page.evaluate(()=>getComputedStyle(document.body).overflowY);assert.equal(lock,'hidden','Record sheet must lock background vertical scrolling');
  await firstSheet.locator('[data-gcl-reuse="0"]').click();
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='workout',{timeout:5000});
  await page.waitForFunction(()=>document.getElementById('wName')?.value==='스쿼트'&&document.getElementById('wWeight')?.value==='82.5'&&document.getElementById('wSets')?.value==='4',{timeout:3000});
  assert.equal(await page.locator('#wWeight').inputValue(),'82.5','recent workout reuse must prefill existing Workout form');
  assert.equal(await page.locator('#wSets').inputValue(),'4','recent workout reuse must keep sets');
  assert.equal(await page.locator('#bottomNav [data-garang-primary-nav="1"][data-page="log"]').getAttribute('aria-current'),'page','Record nav must own workout sub-route');
  const workoutSurfaces=page.locator('[data-garang-workout-surface]');
  assert.equal(await workoutSurfaces.count(),3,'Workout must be split into exactly three structural surfaces');
  assert.equal(await page.locator('.gws-nav').count(),1,'Workout must expose one canonical surface navigation');
  assert.equal(await page.locator('.gwf-nav').count(),0,'legacy overlay navigation must not remain beside the canonical surface navigation');
  assert.deepEqual(await workoutSurfaces.evaluateAll(nodes=>nodes.map(node=>node.dataset.garangWorkoutSurface)),['overview','exercise','log'],'Workout surfaces must have stable overview/exercise/log identities');
  assert.equal(await page.locator('.gws-panel[data-garang-workout-surface="overview"]').isVisible(),true,'Overview must be the initial visible surface');
  assert.equal(await page.locator('.gws-panel[data-garang-workout-surface="exercise"]').isVisible(),false,'Exercise must stay hidden until selected');
  assert.equal(await page.locator('.gws-panel[data-garang-workout-surface="log"]').isVisible(),false,'Log must stay hidden until selected');
  await page.locator('[data-gws-step="exercise"]').click();
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangWorkoutSurface==='exercise',{timeout:2000});
  assert.equal(await page.locator('.gws-panel[data-garang-workout-surface="exercise"]').isVisible(),true,'Exercise surface must open in place');
  assert.equal(await page.locator('.exercise-visual-library').isVisible(),true,'Exercise library must belong to the Exercise surface');
  assert.equal(await page.locator('.workout-builder').isVisible(),false,'Log builder must not remain on the Exercise surface');
  await page.locator('[data-gws-step="log"]').click();
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangWorkoutSurface==='log',{timeout:2000});
  assert.equal(await page.locator('.gws-panel[data-garang-workout-surface="log"]').isVisible(),true,'Log surface must open in place');
  assert.equal(await page.locator('#addWorkout').isVisible(),true,'Existing workout add action must remain on the Log surface');
  assert.equal(await page.locator('.gws-panel[data-garang-workout-surface="overview"]').isVisible(),false,'Overview must not be duplicated below Log');
  await page.locator('[data-gws-next="overview"]').click();
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangWorkoutSurface==='overview',{timeout:2000});
  assert.equal(await page.locator('.gws-panel[data-garang-workout-surface="overview"]').isVisible(),true,'Workout flow must cycle back to Overview');

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
  await page.locator('[data-gcl-coach-actions]').waitFor({state:'visible',timeout:7000});
  assert.ok(await page.locator('[data-gcl-coach]').count()>=2,'Coach must expose contextual actions while preserving approval ownership');
  const quietCoach=await page.evaluate(()=>{
    const root=document.querySelector('.garang-coach-v2');
    const strip=root?.querySelector('.g4-prompt-strip');
    const legacy=[...(strip?.children||[])].filter(el=>el.matches?.('[data-garang-prompt-id]'));
    const visibleLegacy=legacy.filter(el=>getComputedStyle(el).display!=='none').length;
    const actions=[...(root?.querySelectorAll('[data-gcl-coach]')||[])];
    const more=root?.querySelector('[data-garang-coach-more]');
    const empty=root?.querySelector('.g2-empty-chat');
    const mark=empty?.querySelector('.gcs-empty-mark');
    const buttons=[...(strip?.querySelectorAll('button')||[])];
    return {
      marked:root?.dataset.garangCoachQuietSurface||'',
      role:strip?.getAttribute('role')||'',
      visibleLegacy,
      actionCount:actions.length,
      moreDisplay:more?getComputedStyle(more).display:'none',
      moreVisible:!!more&&more.getBoundingClientRect().width>0&&more.getBoundingClientRect().height>0,
      overflowX:strip?getComputedStyle(strip).overflowX:'',
      maxButtonHeight:buttons.reduce((max,button)=>Math.max(max,button.getBoundingClientRect().height),0),
      hasEmpty:!!empty,
      emptyMarkDisplay:mark?getComputedStyle(mark).display:'none'
    };
  });
  assert.equal(quietCoach.marked,'garang-coach-quiet-surface-v1.0.0','Coach must use the quiet presentation layer');
  assert.equal(quietCoach.role,'group','Coach quick actions must be one grouped surface');
  assert.equal(quietCoach.visibleLegacy,0,'legacy prompt pills must stay behind the Coach disclosure by default');
  assert.ok(quietCoach.actionCount>=2,'contextual Coach actions must remain visible');
  assert.notEqual(quietCoach.moreDisplay,'none','existing Coach prompts must remain discoverable through More');
  assert.equal(quietCoach.moreVisible,true,'Coach More disclosure must expose a real touch box');
  assert.equal(quietCoach.overflowX,'auto','Coach actions must use a horizontal mobile surface');
  assert.ok(quietCoach.maxButtonHeight<=42,'Coach action pills must not become oversized vertical controls: '+JSON.stringify(quietCoach));
  if(quietCoach.hasEmpty)assert.equal(quietCoach.emptyMarkDisplay,'none','empty Coach branding must stay compact');
  await page.locator('[data-garang-coach-more]').click();
  await page.waitForFunction(()=>document.querySelector('.g4-prompt-strip')?.classList.contains('gcs-show-legacy'),{timeout:2000});
  assert.ok(await page.locator('.g4-prompt-strip > [data-garang-prompt-id]:visible').count()>=5,'existing Coach prompts must remain reachable after disclosure');
  await page.locator('[data-garang-coach-more]').click();
  await page.waitForFunction(()=>!document.querySelector('.g4-prompt-strip')?.classList.contains('gcs-show-legacy'),{timeout:2000});

  await page.locator('#bottomNav [data-garang-primary-nav="1"][data-page="progress"]').click();
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='progress',{timeout:5000});
  assert.equal(await page.locator('.progress-tabs').count(),1,'existing Progress/Accumulation feature must remain reachable');
  await page.locator('#garangAccumulationOverview').waitFor({state:'visible',timeout:5000});
  assert.match(await page.locator('#garangAccumulationOverview').innerText(),/30 DAY|누적/,'Accumulation must lead with meaningful recent change');

  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,`Simplified shell must not overflow mobile viewport: ${JSON.stringify(width)}`);
  assert.deepEqual(errors,[],`Simplified shell browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-simplified-shell WebKit mobile + core-loop: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
