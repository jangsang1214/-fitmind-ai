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
  await page.waitForFunction(()=>window.GarangTodayCheckinOverrideV1?.version==='1.0.0'&&document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:10000});
  await page.waitForFunction(()=>{const button=document.querySelector('#garangTodayFlow .gtf-next[data-gsn-action="execute"][data-garang-today-checkin-override="1"]');return button?.getAttribute('aria-label')==='체크인';},null,{timeout:10000});
  await page.waitForTimeout(200);
  const button=page.locator('#garangTodayFlow .gtf-next[data-garang-today-checkin-override="1"]');
  assert.equal(await button.getAttribute('aria-label'),'체크인','workout execute affordance must settle as Check-in');
  const visual=await button.evaluate(el=>({color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor,before:getComputedStyle(el,'::before').content,minHeight:el.getBoundingClientRect().height}));
  assert.equal(visual.color,'rgb(247, 245, 241)','dark Today CTA must use visible white text');
  assert.equal(visual.background,'rgb(8, 9, 8)','Check-in CTA keeps the restrained dark surface');
  assert.match(visual.before,/체크인/,'visible pseudo-label must read 체크인');
  assert.ok(visual.minHeight>=48,`Check-in CTA must remain touch-safe: ${JSON.stringify(visual)}`);
  assert.ok(await page.locator('.status-visual-card [data-action="open-checkin"],#main [data-action="open-checkin"]').count()>=1,'canonical check-in write owner must remain available');
  await button.click();const save=page.locator('.modal #saveCheckin');await save.waitFor({state:'visible',timeout:5000});
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today','Check-in CTA must stay on Today and open the canonical modal');
  assert.deepEqual(errors,[],`Today Check-in override browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-today-checkin-override workout CTA -> canonical check-in + white text: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});