'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8789,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0'),localDate=(offset=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,180));}throw new Error('GARANG Today check-in preview server did not start');}
function seed(){const now=new Date().toISOString();return {meta:{schemaVersion:5,updatedAt:now},profile:{name:'Check-in CTA',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',experience:'intermediate',equipmentProfile:'full_gym',weeklyFrequency:7,availableMinutes:45},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[{id:'seed-workout',date:localDate(-2),name:'벤치프레스',sets:3,reps:8,weight:60,rpe:7,duration:45,createdAt:now}],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],physiologicalSignals:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await installAuthenticatedFirebaseMock(context);await context.addInitScript(payload=>localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload)),seed());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));await page.goto(baseURL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  await page.waitForFunction(()=>window.GarangGoldenMasterContinuationV1?.version==='garang-golden-master-continuation-v1.0.1'&&document.getElementById('main')?.dataset?.goldenSurface==='home',{timeout:10000});
  await page.locator('#garangGoldenNav [data-gm-nav="recovery"]').click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.goldenSurface==='recovery',{timeout:7000});
  const checkin=page.locator('[data-gm-checkin="1"]');await checkin.waitFor({state:'visible',timeout:5000});
  assert.equal(await checkin.getAttribute('aria-label'),'체크인','Recovery must expose one obvious check-in utility');
  const box=await checkin.boundingBox();assert.ok(box&&box.width>200&&box.height>=44,`Recovery Check-in must remain touch-safe: ${JSON.stringify(box)}`);

  await checkin.click();const save=page.locator('.modal #saveCheckin');await save.waitFor({state:'visible',timeout:5000});
  await page.locator('#ciSleep').fill('7');await page.locator('#ciEnergy').fill('4');await page.locator('#ciStress').fill('2');await page.locator('#ciSoreness').fill('2');await page.locator('#ciMinutes').fill('45');await save.click();
  await page.waitForFunction(()=>!document.querySelector('.modal #saveCheckin'),null,{timeout:5000});
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('garang_user_mock-user_v3')||'{}'));
  assert.ok(Array.isArray(stored.checkins)&&stored.checkins.length>=1,'canonical Check-in save must persist through the Golden Master bridge');
  await page.waitForFunction(()=>document.querySelector('.gm-recovery'),null,{timeout:5000});
  assert.deepEqual(errors,[],`Golden Master Recovery check-in errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-today-checkin-override Golden Master Recovery -> canonical Check-in: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});