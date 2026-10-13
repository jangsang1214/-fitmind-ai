'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8794,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const localTime=()=>{const d=new Date();return `${pad(d.getHours())}:${pad(d.getMinutes())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,150));}throw new Error('meal reminder server did not start');}
function seed(){const date=localDate(),time=localTime();return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Meal Reminder',age:30,height:174,weight:70,gender:'male',goal:'유지'},onboarding:{complete:true,skipped:false,goal:'유지',weeklyFrequency:3,availableMinutes:60},preferences:{language:'ko',unit:'metric'},settings:{mealSchedule:{configured:true,timezoneMode:'local',timezoneId:'',meals:{breakfast:{enabled:false,preferredTime:'08:00'},lunch:{enabled:true,preferredTime:time},dinner:{enabled:false,preferredTime:'19:00'}}}},planner:[],workouts:[{id:'w1',date,name:'걷기',sets:1,reps:1,weight:0,rpe:2,duration:20}],meals:[],runs:[],body:[],checkins:[{id:'c1',date,sleep:7.5,energy:4,stress:2,soreness:2}],dailyCheckins:[],physiologicalSignals:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await installAuthenticatedFirebaseMock(context);await context.addInitScript(payload=>localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload)),seed());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  await page.waitForFunction(()=>window.GarangTodaySingleNextActionV1?.version&&window.GarangMealReminderBridge?.version==='garang-meal-reminder-bridge-v1'&&window.GarangGoldenMasterContinuationV1?.version==='garang-golden-master-continuation-v1.0.1',{timeout:9000});
  await page.waitForFunction(()=>document.querySelector('[data-gm-meal-reminder="1"]'),null,{timeout:9000});
  const button=page.locator('[data-gm-meal-reminder="1"]');await button.waitFor({state:'visible',timeout:9000});
  assert.match(await button.innerText(),/MEAL REMINDER|사진|점심/,'Home Nutrition row must become the due meal action');
  const chooserPromise=page.waitForEvent('filechooser',{timeout:5000});await button.click();const chooser=await chooserPromise;
  await page.waitForFunction(()=>window.GarangGoldenMasterContinuationV1?.activeRoute==='nutrition',null,{timeout:5000});
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'nutrition');
  assert.equal(await chooser.element().getAttribute('id'),'mealScanPicker','Golden Master reminder must reuse the canonical Meal Scan picker');
  assert.equal(await page.locator('#garangGoldenMaster').evaluate(el=>getComputedStyle(el).display),'none','canonical Meal Scan continuation must remain visible after reminder opens it');
  const events=await page.evaluate(()=>JSON.parse(localStorage.getItem('garang_user_mock-user_v3')||'{}').analytics?.events?.map(row=>row.name)||[]);
  assert.ok(events.includes('meal_reminder_shown'),'canonical reminder shown analytics must be preserved');assert.ok(events.includes('meal_reminder_opened'),'canonical reminder opened analytics must be preserved');assert.ok(events.includes('meal_scan_started_from_reminder'),'Meal Scan source analytics must be preserved');
  assert.deepEqual(errors,[],`meal reminder Golden Master browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser Golden Master meal reminder -> canonical Meal Scan: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
