'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8794,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');
const localDate=(offset=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,180));}throw new Error('GARANG Today check-in preview server did not start');}
function seed(){const today=localDate(),yesterday=localDate(-1),now=new Date().toISOString();return {
 meta:{schemaVersion:5,updatedAt:now},profile:{name:'Check-in CTA',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},
 planner:[{id:'today-workout',date:today,time:'18:00',type:'workout',title:'상체 45분',completed:false,source:'ai',createdAt:now}],
 workouts:[{id:'seed-workout',date:yesterday,name:'벤치프레스',sets:3,reps:8,weight:60,rpe:7,duration:45,createdAt:now}],meals:[],runs:[],body:[],
 checkins:[{id:'today-checkin',date:today,sleep:7.2,energy:4,stress:2,soreness:2,createdAt:now}],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],
 analytics:{events:[{name:'coach_recommendation_shown',date:today,at:now,props:{screen:'coach',date:today}}]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'
};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await installAuthenticatedFirebaseMock(context);
  await context.addInitScript(()=>{window.__garangTestHydrationEvents=0;window.__garangPostHydrationScreens=0;let hydrated=false;window.addEventListener('garang:state-hydrated',()=>{window.__garangTestHydrationEvents=(window.__garangTestHydrationEvents||0)+1;hydrated=true;});window.addEventListener('garang:screen-rendered',()=>{if(hydrated)window.__garangPostHydrationScreens=(window.__garangPostHydrationScreens||0)+1;});});
  await context.addInitScript(payload=>{localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload));},seed());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  await page.waitForFunction(()=>window.GarangTodayCheckinOverrideV1?.version==='1.3.0'&&window.GarangTodayWorkoutPrepIntegrationV1?.version==='1.0.2'&&document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:10000});
  await page.waitForFunction(()=>window.GarangCloudHydrationReady===true&&(window.__garangTestHydrationEvents||0)>=1&&(window.__garangPostHydrationScreens||0)>=1&&window.GarangAgentStateBridge?.ready?.(),null,{timeout:10000});
  try{
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangWorkoutPrepExecution==='1'&&document.querySelector('.garang-daily-workout')&&document.querySelector('#main > [data-garang-bottom-checkin="1"]'),null,{timeout:10000});
  }catch(error){
    const diagnostic=await page.evaluate(()=>{const m=document.getElementById('main'),execute=document.querySelector('#garangTodayFlow .gtf-next[data-gsn-action="execute"]'),prep=document.querySelector('.garang-daily-workout'),checkin=document.querySelector('#main > [data-garang-bottom-checkin="1"]');return {screen:m?.dataset?.garangScreen||null,mainDataset:{...(m?.dataset||{})},hydrationReady:window.GarangCloudHydrationReady,hydrationEvents:window.__garangTestHydrationEvents||0,postHydrationScreens:window.__garangPostHydrationScreens||0,integration:window.GarangTodayWorkoutPrepIntegrationV1?.version||null,workoutUI:window.GarangWorkoutIntelligenceUI?.version||null,execute:execute?{text:execute.textContent,aria:execute.getAttribute('aria-label'),dataset:{...execute.dataset}}:null,prep:prep?{dataset:{...prep.dataset},html:prep.outerHTML.slice(0,1200)}:null,checkin:checkin?{dataset:{...checkin.dataset},aria:checkin.getAttribute('aria-label')}:null,model:window.GarangGoldenPath?.derive?.(window.GarangAgentStateBridge?.getState?.()||{},{today:window.GarangGoldenPath?.localDate?.()})||null};});
    throw new Error(error.message+'\nToday workout preparation diagnostic: '+JSON.stringify(diagnostic),{cause:error});
  }
  const execute=page.locator('#garangTodayFlow .gtf-next[data-garang-today-workout-execute="1"]');
  const prep=page.locator('.garang-daily-workout');
  const checkin=page.locator('#main > [data-garang-bottom-checkin="1"]');
  await page.waitForFunction(()=>{const root=document.querySelector('.garang-daily-workout'),toggle=root?.querySelector('[data-daily-toggle]');if(!root||!toggle)return false;const style=getComputedStyle(toggle),box=toggle.getBoundingClientRect();return document.getElementById('main')?.dataset?.garangWorkoutPrepExecution==='1'&&!toggle.hidden&&style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.height>0;},null,{timeout:10000});
  assert.equal(await execute.count(),1,'canonical workout execution owner must remain in the DOM');
  assert.equal(await execute.isHidden(),true,'standalone Today workout execution CTA must be visually removed');
  assert.equal(await execute.getAttribute('aria-hidden'),'true','hidden canonical CTA must not compete in accessibility order');
  assert.equal(await prep.locator('[data-daily-toggle]').isVisible(),true,'Today workout preparation remains the visible entry');
  assert.match(await prep.locator('[data-daily-toggle]').innerText(),/오늘 운동 준비하기/);
  assert.equal(await checkin.getAttribute('aria-label'),'체크인','bottom utility must remain Check-in');
  assert.equal(await page.locator('#main').getAttribute('data-garang-workout-prep-execution'),'1');

  await page.evaluate(()=>{const toggle=document.querySelector('.garang-daily-workout [data-daily-toggle]');if(!toggle)throw new Error('Today workout preparation toggle missing at interaction boundary');toggle.click();});
  await page.waitForFunction(()=>document.querySelector('.garang-daily-workout')?.dataset?.expanded==='1',null,{timeout:3000});
  const start=prep.locator('[data-garang-workout-prep-start="1"]');
  await start.waitFor({state:'visible',timeout:3000});
  assert.equal(await start.getAttribute('aria-label'),'운동 시작','workout execution must be merged into preparation');
  assert.equal(await prep.locator('.garang-daily-head > div').isHidden(),true,'duplicate workout heading and explanation must be simplified');
  assert.equal(await prep.locator('.garang-daily-summary-mark').isHidden(),true,'duplicate GARANG badge must not add visual noise during execution');
  const details=prep.locator('.garang-daily-head .gci-toggle');
  await details.waitFor({state:'visible',timeout:3000});
  await page.evaluate(()=>{const button=document.querySelector('.garang-daily-workout .garang-daily-head .gci-toggle');if(!button)throw new Error('Today workout detail toggle missing at interaction boundary');button.click();});
  await prep.locator('[data-daily-target]').waitFor({state:'visible',timeout:3000});
  assert.equal(await prep.locator('[data-daily-generate]').isVisible(),true,'advanced workout generation controls must remain available behind disclosure');

  const layout=await page.evaluate(()=>{const main=document.getElementById('main'),start=document.querySelector('[data-garang-workout-prep-start="1"]'),checkin=document.querySelector('#main > [data-garang-bottom-checkin="1"]');const sb=start?.getBoundingClientRect(),cb=checkin?.getBoundingClientRect();return {start:{height:sb?.height||0,display:start?getComputedStyle(start).display:''},checkin:{top:cb?.top||0,color:checkin?getComputedStyle(checkin).color:'',background:checkin?getComputedStyle(checkin).backgroundColor:'',height:cb?.height||0,last:main?.lastElementChild===checkin}};});
  assert.ok(layout.start.height>=44,`merged workout start must remain touch-safe: ${JSON.stringify(layout)}`);
  assert.equal(layout.checkin.color,'rgb(247, 245, 241)','dark Check-in must use visible white text');
  assert.equal(layout.checkin.background,'rgb(8, 9, 8)','Check-in keeps the restrained dark surface');
  assert.ok(layout.checkin.height>=48,`Check-in must remain touch-safe: ${JSON.stringify(layout)}`);
  assert.equal(layout.checkin.last,true,`Check-in must remain the bottom-most Today control: ${JSON.stringify(layout)}`);

  await page.evaluate(()=>{const button=document.querySelector('#main > [data-garang-bottom-checkin="1"]');if(!button)throw new Error('Today bottom Check-in missing at interaction boundary');button.click();});const save=page.locator('.modal #saveCheckin');await save.waitFor({state:'visible',timeout:5000});assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today','Check-in must open canonical Today modal');
  await page.locator('.modal .modal-close,.modal-close').first().click();await save.waitFor({state:'hidden',timeout:5000});
  await page.evaluate(()=>{const button=document.querySelector('.garang-daily-workout [data-garang-workout-prep-start="1"]');if(!button)throw new Error('Today workout start missing at interaction boundary');button.click();});await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='workout',null,{timeout:7000});
  assert.deepEqual(errors,[],`Today workout preparation integration browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-today-checkin-override preparation owns workout start + progressive details + bottom Check-in: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});