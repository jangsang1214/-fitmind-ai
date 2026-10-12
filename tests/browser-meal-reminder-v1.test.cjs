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
function seed(){const date=localDate(),time=localTime();return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Meal Reminder',age:30,height:174,weight:70,gender:'male',goal:'유지'},onboarding:{complete:true,skipped:false,goal:'유지',weeklyFrequency:3,availableMinutes:60},preferences:{language:'ko',unit:'metric'},settings:{mealSchedule:{configured:true,timezoneMode:'local',timezoneId:'',meals:{breakfast:{enabled:false,preferredTime:'08:00'},lunch:{enabled:true,preferredTime:time},dinner:{enabled:false,preferredTime:'19:00'}}}},planner:[],workouts:[{id:'w1',date,name:'걷기',sets:1,reps:1,weight:0,rpe:2,duration:20}],meals:[],runs:[],body:[],checkins:[{id:'c1',date,sleep:7.5,energy:4,stress:2,soreness:2}],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await installAuthenticatedFirebaseMock(context);await context.addInitScript(payload=>localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload)),seed());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  await page.waitForFunction(()=>window.GarangTodaySingleNextActionV1?.version&&window.GarangMealReminderBridge?.version==='garang-meal-reminder-bridge-v1',{timeout:9000});
  const button=page.locator('#garangTodayFlow .gtf-next[data-gsn-action="meal-reminder"]');await button.waitFor({state:'visible',timeout:9000});
  assert.match(await page.locator('#garangTodayFlow .gtf-decision h2').innerText(),/점심 드실 시간이네요/);
  assert.match(await page.locator('#garangTodayFlow .gtf-decision p').innerText(),/사진 한 장만 찍어주세요/);
  assert.match(await button.innerText(),/점심 사진 찍기/);
  await page.waitForFunction(()=>window.GarangMealReminderNotificationV1?.version==='garang-meal-reminder-notification-v1.0.0',{timeout:9000});
  const globalNotice=page.locator('#garangMealReminderNotification');await globalNotice.waitFor({state:'visible',timeout:9000});
  assert.match(await globalNotice.innerText(),/점심 드실 시간이에요/);
  await page.evaluate(()=>window.GarangRouter?.navigate?.('nutrition',{source:'meal-reminder-test',force:true}));
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='nutrition',{timeout:5000});
  const shortcut=page.locator('#garangMealScheduleShortcut');await shortcut.waitFor({state:'visible',timeout:5000});assert.match(await shortcut.innerText(),/식사 시간 알림/);
  await page.evaluate(()=>window.GarangRouter?.navigate?.('today',{source:'meal-reminder-test-return',force:true}));
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:5000});
  const chooserPromise=page.waitForEvent('filechooser',{timeout:5000});await page.locator('#garangMealReminderNotification [data-gmr-open]').click();const chooser=await chooserPromise;
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'nutrition');
  assert.equal(await chooser.element().getAttribute('id'),'mealScanPicker','reminder CTA must reuse the canonical Meal Scan picker');
  const events=await page.evaluate(()=>JSON.parse(localStorage.getItem('garang_user_mock-user_v3')||'{}').analytics?.events?.map(row=>row.name)||[]);
  assert.ok(events.includes('meal_reminder_shown'));assert.ok(events.includes('meal_reminder_opened'));assert.ok(events.includes('meal_scan_started_from_reminder'));
  assert.deepEqual(errors,[],`meal reminder browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser meal reminder -> canonical Meal Scan: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
