'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8789,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0'),localDate=(offset=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,180));}throw new Error('GARANG Today check-in preview server did not start');}
function seed(){const now=new Date().toISOString();return {meta:{schemaVersion:5,updatedAt:now},profile:{name:'Check-in CTA',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',experience:'intermediate',equipmentProfile:'full_gym',weeklyFrequency:7,availableMinutes:45},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[{id:'seed-workout',date:localDate(-2),name:'벤치프레스',sets:3,reps:8,weight:60,rpe:7,duration:45,createdAt:now}],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await installAuthenticatedFirebaseMock(context);await context.addInitScript(payload=>localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload)),seed());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));await page.goto(baseURL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  await page.waitForFunction(()=>window.GarangTodayDirectWorkoutLoopV1&&document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:10000});
  const start=page.locator('[data-garang-direct-workout-start="1"]');await start.waitFor({state:'visible',timeout:10000});await page.waitForFunction(()=>!document.querySelector('[data-garang-direct-workout-start="1"]')?.disabled,{timeout:10000});
  const checkin=page.locator('#main > [data-garang-bottom-checkin="1"]');await checkin.waitFor({state:'visible',timeout:5000});
  assert.equal(await start.innerText().then(x=>/오늘 운동 시작/.test(x)),true,'workout start must remain the primary Today action');
  assert.equal(await checkin.getAttribute('aria-label'),'체크인','recovery check-in remains a secondary utility');
  assert.equal(await page.evaluate(()=>document.getElementById('main')?.lastElementChild?.matches('[data-garang-bottom-checkin="1"]')),true,'Check-in remains the bottom utility instead of interrupting the core path');

  await checkin.click();const save=page.locator('.modal #saveCheckin');await save.waitFor({state:'visible',timeout:5000});
  await page.locator('#ciSleep').fill('7');await page.locator('#ciEnergy').fill('4');await page.locator('#ciStress').fill('2');await page.locator('#ciSoreness').fill('2');await page.locator('#ciMinutes').fill('45');await save.click();
  await page.waitForFunction(()=>!document.querySelector('.modal #saveCheckin'),null,{timeout:5000});
  await page.waitForFunction(()=>{const b=document.querySelector('[data-garang-direct-workout-start="1"]');if(!b)return false;const s=getComputedStyle(b),r=b.getBoundingClientRect();return !b.disabled&&s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>=44;},null,{timeout:10000});

  await page.locator('[data-garang-direct-workout-start="1"]').click();
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='workout',null,{timeout:7000});
  assert.deepEqual(errors,[],`Today check-in/direct-workout errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-today-checkin-override check-in stays secondary to direct workout: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});