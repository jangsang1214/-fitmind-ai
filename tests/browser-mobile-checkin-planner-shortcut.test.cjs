'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8897,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');
const localDate=(offset=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,180));}throw new Error('GARANG mobile Check-in/Planner preview server did not start');}
function seed(){const today=localDate(),yesterday=localDate(-1),now=new Date().toISOString();return {meta:{schemaVersion:5,updatedAt:now},profile:{name:'Mobile UX',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},planner:[{id:'today-workout',date:today,time:'18:00',type:'workout',title:'전신 근력 36분',completed:false,source:'ai',createdAt:now}],workouts:[{id:'seed-workout',date:yesterday,name:'벤치프레스',sets:3,reps:8,weight:60,rpe:7,duration:45,createdAt:now}],meals:[],runs:[],body:[],checkins:[{id:'today-checkin',date:today,sleep:7.2,energy:4,stress:2,soreness:2,createdAt:now}],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[{name:'coach_recommendation_shown',date:today,at:now,props:{screen:'coach',date:today}}]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();
  browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await installAuthenticatedFirebaseMock(context);
  await context.addInitScript(payload=>{localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload));},seed());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  try{
    await page.waitForFunction(()=>window.GarangMobileCheckinPlannerShortcutV1?.version==='1.0.0',null,{timeout:8000});
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='today'&&document.querySelector('[data-garang-planner-shortcut="1"]')&&document.querySelector('#main > [data-garang-bottom-checkin="1"]'),null,{timeout:10000});
  }catch(error){
    const diagnostic=await page.evaluate(()=>({screen:document.getElementById('main')?.dataset?.garangScreen||null,mobileRuntime:window.GarangMobileCheckinPlannerShortcutV1?.version||null,productConsolidation:window.GarangProductConsolidationV1?.version||null,checkinOverride:window.GarangTodayCheckinOverrideV1?.version||null,workoutPrep:window.GarangTodayWorkoutPrepIntegrationV1?.version||null,planHead:!!document.querySelector('.gpc-today-plan-head'),shortcut:!!document.querySelector('[data-garang-planner-shortcut="1"]'),bottomCheckin:!!document.querySelector('#main > [data-garang-bottom-checkin="1"]'),scripts:[...document.querySelectorAll('script[src]')].map(x=>x.getAttribute('src')).filter(x=>/product-consolidation|checkin|planner-shortcut|workout-prep/.test(x||'')),errors:window.__GARANG_ERRORS__||null}));
    throw new Error(error.message+'\nMobile UI diagnostic: '+JSON.stringify(diagnostic),{cause:error});
  }

  const shortcut=page.locator('[data-garang-planner-shortcut="1"]');
  assert.equal(await shortcut.getAttribute('aria-label'),'플래너 열기','Today plan shortcut must describe the canonical Planner destination');
  const shortcutBox=await shortcut.boundingBox();
  assert.ok(shortcutBox&&shortcutBox.width>=44&&shortcutBox.height>=44,`Planner shortcut hit target must be touch-safe while the visible plus remains compact: ${JSON.stringify(shortcutBox)}`);

  await page.locator('#main > [data-garang-bottom-checkin="1"]').click();
  const save=page.locator('#saveCheckin');
  await save.waitFor({state:'visible',timeout:5000});
  await page.waitForFunction(()=>document.getElementById('saveCheckin')?.parentElement?.matches?.('.garang-checkin-actions'),null,{timeout:3000});
  const checkinLayout=await page.evaluate(()=>{
    const save=document.getElementById('saveCheckin'),modal=save?.closest('.modal'),backdrop=modal?.closest('.modal-backdrop'),nav=document.getElementById('bottomNav'),form=modal?.querySelector('.checkin-form');
    const box=save?.getBoundingClientRect(),backdropZ=Number.parseInt(getComputedStyle(backdrop).zIndex,10)||0,navZ=Number.parseInt(getComputedStyle(nav).zIndex,10)||0;
    return {viewport:window.innerHeight,top:box?.top??null,bottom:box?.bottom??null,height:box?.height??0,backdropZ,navZ,parentClass:save?.parentElement?.className||'',modalOverflow:modal?getComputedStyle(modal).overflow:'',formOverflowY:form?getComputedStyle(form).overflowY:''};
  });
  assert.ok(checkinLayout.top!==null&&checkinLayout.top>=0&&checkinLayout.bottom<=checkinLayout.viewport-4,`Check-in save CTA must be visible inside the iPhone viewport: ${JSON.stringify(checkinLayout)}`);
  assert.ok(checkinLayout.height>=48,`Check-in save CTA must remain touch-safe: ${JSON.stringify(checkinLayout)}`);
  assert.ok(checkinLayout.backdropZ>checkinLayout.navZ,`Check-in modal must sit above the fixed bottom navigation: ${JSON.stringify(checkinLayout)}`);
  assert.match(checkinLayout.parentClass,/garang-checkin-actions/,'canonical #saveCheckin must be moved, not duplicated');
  assert.equal(checkinLayout.modalOverflow,'hidden','modal shell must keep the action dock outside the scrolling form');
  assert.equal(checkinLayout.formOverflowY,'auto','only Check-in fields should scroll on short mobile viewports');
  assert.equal(await page.locator('#saveCheckin').count(),1,'canonical Check-in write owner must remain singular');

  await page.locator('.modal-close').click();
  await save.waitFor({state:'hidden',timeout:5000});
  await shortcut.click();
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='planner'&&!!document.querySelector('#addPlan'),null,{timeout:7000});
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'planner','Today plan + must route directly to the existing Planner');
  assert.equal(await page.locator('#addPlan').count(),1,'Planner shortcut must land on the canonical Planner surface');
  assert.deepEqual(errors,[],`Mobile Check-in/Planner shortcut browser errors:\n${errors.join('\n')}`);
  await context.close();
  console.log('browser-mobile-checkin-planner-shortcut visible save CTA + canonical Planner route: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
