'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
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
  await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},seed());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  await page.waitForFunction(()=>window.GarangTodayCheckinOverrideV1?.version==='1.1.0'&&document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:10000});
  await page.waitForFunction(()=>{const flow=document.querySelector('#garangTodayFlow');return flow?.querySelector('.gtf-next[data-gsn-action="execute"][data-garang-today-workout-execute="1"]')&&flow?.querySelector('[data-garang-checkin-access="1"][data-garang-checkin-secondary="1"]');},null,{timeout:10000});
  await page.waitForTimeout(200);
  const execute=page.locator('#garangTodayFlow .gtf-next[data-garang-today-workout-execute="1"]');
  const checkin=page.locator('#garangTodayFlow [data-garang-checkin-access="1"][data-garang-checkin-secondary="1"]');
  assert.equal(await execute.count(),1,'workout execution capability must remain available');
  assert.equal(await checkin.getAttribute('aria-label'),'체크인','bottom utility must read Check-in');
  const layout=await page.evaluate(()=>{const execute=document.querySelector('#garangTodayFlow .gtf-next[data-garang-today-workout-execute="1"]'),checkin=document.querySelector('#garangTodayFlow [data-garang-checkin-secondary="1"]');const eb=execute?.getBoundingClientRect(),cb=checkin?.getBoundingClientRect();return {execute:{top:eb?.top||0,bottom:eb?.bottom||0,color:execute?getComputedStyle(execute).color:'',before:execute?getComputedStyle(execute,'::before').content:''},checkin:{top:cb?.top||0,bottom:cb?.bottom||0,color:checkin?getComputedStyle(checkin).color:'',background:checkin?getComputedStyle(checkin).backgroundColor:'',before:checkin?getComputedStyle(checkin,'::before').content:'',height:cb?.height||0}};});
  assert.match(layout.execute.before,/오늘 운동 실행/,'workout execution should use a clearer non-bottom label');
  assert.equal(layout.execute.color,'rgb(247, 245, 241)','Today actions must use visible white text');
  assert.equal(layout.checkin.color,'rgb(247, 245, 241)','dark Check-in must use visible white text');
  assert.equal(layout.checkin.background,'rgb(8, 9, 8)','Check-in keeps the restrained dark surface');
  assert.match(layout.checkin.before,/체크인/,'visible bottom label must read 체크인');
  assert.ok(layout.checkin.height>=48,`Check-in must remain touch-safe: ${JSON.stringify(layout)}`);
  assert.ok(layout.checkin.top>=layout.execute.bottom-1,`Check-in must be the bottom-most Today action: ${JSON.stringify(layout)}`);
  await checkin.click();const save=page.locator('.modal #saveCheckin');await save.waitFor({state:'visible',timeout:5000});assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today','Check-in must open canonical Today modal');
  await page.locator('.modal .modal-close,.modal-close').first().click();await save.waitFor({state:'hidden',timeout:5000});
  await execute.click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='workout',null,{timeout:7000});
  assert.deepEqual(errors,[],`Today Check-in override browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-today-checkin-override bottom Check-in + white text + preserved workout execution: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});