'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8794,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');
const localDate=(offset=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${pad(d.getMonth()+1).padStart(2,'0')}-${pad(d.getDate())}`;};
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
  await context.addInitScript(()=>{window.__garangTestHydrationEvents=0;window.__garangPostHydrationScreens=0;window.__garangLastScreenRenderedAt=performance.now();let hydrated=false;window.addEventListener('garang:state-hydrated',()=>{window.__garangTestHydrationEvents=(window.__garangTestHydrationEvents||0)+1;hydrated=true;});window.addEventListener('garang:screen-rendered',()=>{window.__garangLastScreenRenderedAt=performance.now();if(hydrated)window.__garangPostHydrationScreens=(window.__garangPostHydrationScreens||0)+1;});});
  await context.addInitScript(payload=>{localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload));},seed());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  await page.waitForFunction(()=>window.GarangTodayCheckinOverrideV1?.version==='1.3.0'&&window.GarangTodayWorkoutPrepIntegrationV1?.version==='1.0.2'&&document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:10000});
  await page.waitForFunction(()=>window.GarangCloudHydrationReady===true&&(window.__garangTestHydrationEvents||0)>=1&&(window.__garangPostHydrationScreens||0)>=1&&window.GarangAgentStateBridge?.ready?.(),null,{timeout:10000});
  await page.waitForFunction(()=>performance.now()-(window.__garangLastScreenRenderedAt||0)>=750,null,{timeout:5000});
  try{
    await page.waitForFunction(()=>{const m=document.getElementById('main'),prep=document.querySelector('.garang-daily-workout'),toggle=prep?.querySelector('[data-daily-toggle]'),checkin=document.querySelector('#main > [data-garang-bottom-checkin="1"]');if(m?.dataset?.garangWorkoutPrepExecution!=='1'||!prep||!toggle||!checkin)return false;const style=getComputedStyle(toggle),box=toggle.getBoundingClientRect();return !toggle.hidden&&style.display!=='none'&&style.visibility!=='hidden'&&box.width>0&&box.height>0;},null,{timeout:10000});
  }catch(error){
    const diagnostic=await page.evaluate(()=>{const m=document.getElementById('main'),execute=document.querySelector('#garangTodayFlow .gtf-next[data-gsn-action="execute"]'),prep=document.querySelector('.garang-daily-workout'),checkin=document.querySelector('#main > [data-garang-bottom-checkin="1"]');return {screen:m?.dataset?.garangScreen||null,mainDataset:{...(m?.dataset||{})},hydrationReady:window.GarangCloudHydrationReady,hydrationEvents:window.__garangTestHydrationEvents||0,postHydrationScreens:window.__garangPostHydrationScreens||0,integration:window.GarangTodayWorkoutPrepIntegrationV1?.version||null,workoutUI:window.GarangWorkoutIntelligenceUI?.version||null,execute:execute?{text:execute.textContent,aria:execute.getAttribute('aria-label'),dataset:{...execute.dataset}}:null,prep:prep?{dataset:{...prep.dataset},html:prep.outerHTML.slice(0,1200)}:null,checkin:checkin?{dataset:{...checkin.dataset},aria:checkin.getAttribute('aria-label')}:null,model:window.GarangGoldenPath?.derive?.(window.GarangAgentStateBridge?.getState?.()||{},{today:window.GarangGoldenPath?.localDate?.()})||null};});
    throw new Error(error.message+'\nToday workout preparation diagnostic: '+JSON.stringify(diagnostic),{cause:error});
  }
  const initial=await page.evaluate(()=>{const m=document.getElementById('main'),execute=document.querySelector('#garangTodayFlow .gtf-next[data-gsn-action="execute"]'),prep=document.querySelector('.garang-daily-workout'),toggle=prep?.querySelector('[data-daily-toggle]'),checkin=document.querySelector('#main > [data-garang-bottom-checkin="1"]');const es=execute?getComputedStyle(execute):null,ts=toggle?getComputedStyle(toggle):null,tb=toggle?.getBoundingClientRect();return {execution:m?.dataset?.garangWorkoutPrepExecution||null,executePresent:!!execute,executeHidden:execute?execute.hidden||es?.display==='none':true,executeAria:execute?.getAttribute('aria-hidden')||null,toggleVisible:!!toggle&&!toggle.hidden&&ts?.display!=='none'&&ts?.visibility!=='hidden'&&(tb?.width||0)>0&&(tb?.height||0)>0,toggleText:toggle?.innerText||'',checkinAria:checkin?.getAttribute('aria-label')||null};});
  assert.equal(initial.execution,'1','workout preparation must own Today execution');
  if(initial.executePresent){assert.equal(initial.executeHidden,true,'mounted canonical workout execution CTA must be visually removed');assert.equal(initial.executeAria,'true','mounted hidden canonical CTA must not compete in accessibility order');}
  assert.equal(initial.toggleVisible,true,'Today workout preparation remains the visible entry');
  assert.match(initial.toggleText,/오늘 운동 준비하기/);
  assert.equal(initial.checkinAria,'체크인','bottom utility must remain Check-in');

  await page.evaluate(()=>{const toggle=document.querySelector('.garang-daily-workout [data-daily-toggle]');if(!toggle)throw new Error('Today workout preparation toggle missing at interaction boundary');toggle.click();});
  await page.waitForFunction(()=>{const card=document.querySelector('.garang-daily-workout'),start=card?.querySelector('[data-garang-workout-prep-start="1"]');if(card?.dataset?.expanded!=='1'||!start)return false;const s=getComputedStyle(start),b=start.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&b.width>0&&b.height>0;},null,{timeout:5000});
  const expanded=await page.evaluate(()=>{const card=document.querySelector('.garang-daily-workout'),start=card?.querySelector('[data-garang-workout-prep-start="1"]'),heading=card?.querySelector('.garang-daily-head > div'),mark=card?.querySelector('.garang-daily-summary-mark');return {startAria:start?.getAttribute('aria-label')||null,headingHidden:!heading||getComputedStyle(heading).display==='none',markHidden:!mark||getComputedStyle(mark).display==='none'};});
  assert.equal(expanded.startAria,'운동 시작','workout execution must be merged into preparation');
  assert.equal(expanded.headingHidden,true,'duplicate workout heading and explanation must be simplified');
  assert.equal(expanded.markHidden,true,'duplicate GARANG badge must not add visual noise during execution');
  await page.evaluate(async()=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms)),deadline=Date.now()+8000;while(Date.now()<deadline){const card=document.querySelector('.garang-daily-workout');if(!card){await sleep(80);continue;}if(card.dataset.expanded!=='1')card.querySelector('[data-daily-toggle]')?.click();await new Promise(requestAnimationFrame);const detail=card.querySelector('.garang-daily-head .gci-toggle');if(detail&&detail.getAttribute('aria-expanded')!=='true')detail.click();await new Promise(requestAnimationFrame);const target=card.querySelector('[data-daily-target]'),generate=card.querySelector('[data-daily-generate]');if(target&&generate){const ts=getComputedStyle(target),gs=getComputedStyle(generate),tb=target.getBoundingClientRect(),gb=generate.getBoundingClientRect();if(ts.display!=='none'&&ts.visibility!=='hidden'&&gs.display!=='none'&&gs.visibility!=='hidden'&&tb.width>0&&tb.height>0&&gb.width>0&&gb.height>0)return true;}await sleep(100);}throw new Error('Today workout progressive disclosure did not settle after transient remounts');});

  const layout=await page.evaluate(()=>{const main=document.getElementById('main'),start=document.querySelector('[data-garang-workout-prep-start="1"]'),checkin=document.querySelector('#main > [data-garang-bottom-checkin="1"]');const sb=start?.getBoundingClientRect(),cb=checkin?.getBoundingClientRect();return {start:{height:sb?.height||0,display:start?getComputedStyle(start).display:''},checkin:{top:cb?.top||0,color:checkin?getComputedStyle(checkin).color:'',background:checkin?getComputedStyle(checkin).backgroundColor:'',height:cb?.height||0,last:main?.lastElementChild===checkin}};});
  assert.ok(layout.start.height>=44,`merged workout start must remain touch-safe: ${JSON.stringify(layout)}`);
  assert.equal(layout.checkin.color,'rgb(247, 245, 241)','dark Check-in must use visible white text');
  assert.equal(layout.checkin.background,'rgb(8, 9, 8)','Check-in keeps the restrained dark surface');
  assert.ok(layout.checkin.height>=48,`Check-in must remain touch-safe: ${JSON.stringify(layout)}`);
  assert.equal(layout.checkin.last,true,`Check-in must remain the bottom-most Today control: ${JSON.stringify(layout)}`);

  await page.evaluate(()=>{const button=document.querySelector('#main > [data-garang-bottom-checkin="1"]');if(!button)throw new Error('Today bottom Check-in missing at interaction boundary');button.click();});const save=page.locator('.modal #saveCheckin');await save.waitFor({state:'visible',timeout:5000});assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today','Check-in must open canonical Today modal');
  await page.locator('.modal .modal-close,.modal-close').first().click();await save.waitFor({state:'hidden',timeout:5000});
  await page.waitForFunction(()=>performance.now()-(window.__garangLastScreenRenderedAt||0)>=750,null,{timeout:5000});
  await page.evaluate(async()=>{const sleep=ms=>new Promise(r=>setTimeout(r,ms)),deadline=Date.now()+8000;while(Date.now()<deadline){const card=document.querySelector('.garang-daily-workout');if(!card){await sleep(80);continue;}let start=card.querySelector('[data-garang-workout-prep-start="1"]');if(!start||getComputedStyle(start).display==='none'||start.getBoundingClientRect().height===0){const toggle=card.querySelector('[data-daily-toggle]');if(toggle&&card.dataset.expanded!=='1')toggle.click();await new Promise(requestAnimationFrame);start=document.querySelector('.garang-daily-workout [data-garang-workout-prep-start="1"]');}if(start){const s=getComputedStyle(start),b=start.getBoundingClientRect();if(s.display!=='none'&&s.visibility!=='hidden'&&b.width>0&&b.height>0){start.click();return true;}}await sleep(100);}throw new Error('Today workout start did not recover after closing Check-in modal');});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='workout',null,{timeout:7000});
  assert.deepEqual(errors,[],`Today workout preparation integration browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-today-checkin-override preparation owns workout start + progressive details + bottom Check-in: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});