'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8796,baseURL=`http://127.0.0.1:${port}`;
function isoDate(offset=0){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function demoState(){const yesterday=isoDate(-1);return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'V4',age:29,height:176,weight:73,gender:'male',goal:'퍼포먼스 향상'},onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',equipmentProfile:'full_gym',weeklyFrequency:4,availableMinutes:55},preferences:{language:'ko',unit:'metric'},settings:{},privacy:{consent:{analytics:false}},planner:[],workouts:[{id:'w-prev',date:yesterday,name:'바벨 벤치프레스',sets:4,reps:8,weight:72.5,rpe:8,duration:48,setDetails:[{weight:72.5,reps:8,rpe:8}]}],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],physiologicalSignals:[],aiChat:[{role:'assistant',text:'오늘의 다음 행동을 준비했습니다.',at:new Date().toISOString()}],memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},foodIdentity:{barcodes:[],misses:[],corrections:[]},actionLog:[],analytics:{events:[]},errors:[],plan:'FREE'};}
async function waitServer(){const until=Date.now()+15000;while(Date.now()<until){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,150));}throw new Error('presentation v4 preview server did not start');}
async function route(page,next){const ok=await page.evaluate(screen=>window.GarangRouter?.navigate?.(screen,{source:'presentation-v4-test',force:true}),next);assert.equal(ok,true,`${next} route must stay canonical`);await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,next,{timeout:7000});await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangPresentation==='v4',null,{timeout:5000});await page.waitForTimeout(180);}
async function noOverflow(page,label){const m=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth}));assert.ok(m.doc<=m.w+2,`${label} document overflow ${JSON.stringify(m)}`);assert.ok(m.body<=m.w+2,`${label} body overflow ${JSON.stringify(m)}`);}
(async()=>{const server=startStaticServer(serveRoot,port);let browser;try{
 await waitServer();browser=await webkit.launch({headless:true});
 for(const width of [320,360,390,430]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await installAuthenticatedFirebaseMock(context);
  await context.addInitScript(payload=>localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload)),demoState());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
  await page.waitForFunction(()=>window.GarangPresentationV4?.version==='garang-presentation-v4.0.2',null,{timeout:8000});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangPresentation==='v4',null,{timeout:8000});

  assert.equal(await page.locator('link[data-garang-presentation-v4]').count(),1,'v4 stylesheet must load once');
  assert.equal(await page.locator('script[data-garang-presentation-v4]').count(),1,'v4 adapter must load once');
  assert.equal(await page.locator('link[data-garang-reference-ui-v2]').count(),0,'legacy v2 presentation stylesheet must not load');
  assert.equal(await page.locator('.g4-today-shell>#garangTodayFlow').count(),1,'Today must reuse one canonical decision owner');
  assert.equal(await page.locator('#garangTodayFlow').isVisible(),true,'Today canonical decision must remain visible');
  await noOverflow(page,`Today ${width}`);

  await route(page,'workout');
  assert.equal(await page.locator('.g4-workout-shell .workout-session-bar').count(),1,'Workout must retain one session owner');
  assert.equal(await page.locator('#addWorkout').count(),1,'Workout add owner must remain singular');
  const exerciseTab=page.locator('[data-gws-step="exercise"]').first();if(await exerciseTab.count()){await exerciseTab.click();await page.waitForTimeout(160);}
  const start=page.locator('#startWorkoutSession');await start.waitFor({state:'visible',timeout:6000});await start.click();
  await page.waitForFunction(()=>document.querySelector('.workout-session-bar')?.classList.contains('is-live'),null,{timeout:4000});
  const current=page.locator('#workoutSetDetails .execution-set-row.current-set').first();await current.waitFor({state:'visible',timeout:5000});
  const complete=current.locator('[data-execution-set-complete]').first();await complete.waitFor({state:'visible',timeout:4000});const cb=await complete.boundingBox();assert.ok(cb&&cb.height>=50,`Complete Set must remain touch safe at ${width}`);await complete.click();
  const rest=page.locator('#workoutExecutionRest');await rest.waitFor({state:'visible',timeout:4000});assert.equal(await rest.evaluate(el=>el.classList.contains('g4-rest-portal')),true,'Rest must use canonical timer as focused v4 portal');const rb=await page.locator('#workoutExecutionRestClock').boundingBox();assert.ok(rb&&rb.height>=180,`Rest clock must dominate at ${width}`);await page.locator('#skipWorkoutRest').click();await noOverflow(page,`Workout ${width}`);

  await route(page,'nutrition');
  assert.equal(await page.locator('.g4-nutrition-shell>.meal-scan-card').count(),1,'Nutrition must reuse canonical Meal Scan card');
  const mealBg=await page.locator('.meal-scan-empty').first().evaluate(el=>getComputedStyle(el).backgroundImage).catch(()=> '');assert.equal(mealBg.includes('url('),false,'Empty Meal Scan must not show fake food photography');await noOverflow(page,`Nutrition ${width}`);

  await route(page,'body');
  assert.equal(await page.locator('.g4-body-shell>.body-hero').count(),1,'Body must reuse canonical anatomy hero');
  const anatomy=page.locator('.body-hero-anatomy').first();await anatomy.waitFor({state:'visible',timeout:5000});const opacity=Number(await anatomy.evaluate(el=>getComputedStyle(el).opacity));assert.ok(opacity>=.99,'Body presentation surface must remain visible');
  const pair=page.locator('.body-hero-anatomy>.g4-body-anatomy-pair');await pair.waitFor({state:'visible',timeout:5000});assert.equal(await pair.locator('img').count(),2,'Body v4 must use GARANG front/back anatomy pair');assert.equal(await page.locator('.body-hero-anatomy>.mini-body-svg:not([hidden])').count(),0,'legacy decorative mini mannequin must not compete with v4 anatomy');await noOverflow(page,`Body ${width}`);

  await route(page,'coach');assert.ok(await page.locator('.g4-coach-shell').count()>=1,'Coach must retain canonical conversation shell');await noOverflow(page,`Coach ${width}`);
  assert.equal(errors.length,0,`Presentation v4 must not introduce page errors at ${width}: ${errors.join('\n')}`);
  await context.close();
 }
 console.log('browser-presentation-v4 clean canonical presentation 320/360/390/430: PASS');
}catch(error){console.error(error);process.exitCode=1;}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}})();
