'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8778,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0'),date=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,180));}throw new Error('GARANG Today preview server did not start');}
function seed(){const today=date(),now=new Date().toISOString();return {meta:{schemaVersion:5,updatedAt:now},profile:{name:'Today Flow',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',experience:'intermediate',equipmentProfile:'full_gym',weeklyFrequency:7,availableMinutes:45},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[{id:'seed-workout',date:date(-2),name:'벤치프레스',sets:3,reps:8,weight:60,rpe:7,duration:45}],meals:[],runs:[],body:[],checkins:[{id:'c1',date:today,sleep:7.5,energy:4,stress:2,soreness:2,availableMinutes:45}],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await installAuthenticatedFirebaseMock(context);await context.addInitScript(payload=>localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload)),seed());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));await page.goto(baseURL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  await page.waitForFunction(()=>window.GarangTodayDirectWorkoutLoopV1&&document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:9000});
  const start=page.locator('[data-garang-direct-workout-start="1"]');await start.waitFor({state:'visible',timeout:10000});await page.waitForFunction(()=>!document.querySelector('[data-garang-direct-workout-start="1"]')?.disabled,{timeout:10000});
  const flow=page.locator('#garangTodayFlow');
  assert.equal(await flow.locator('.gtf-decision').isVisible(),true,'Today must lead with a judgment');
  assert.match(await flow.locator('.gtf-decision h2').innerText(),/오늘은 .* 하세요/,'Today must tell the user exactly what to do');
  assert.ok((await flow.locator('.gtf-decision p').innerText()).trim().length>4,'Today must expose one-line reasoning without opening Coach');
  assert.ok(await flow.locator('.gtdw-row').count()>=2,'Today must show the concrete workout prescription');
  assert.equal(await flow.locator('.gpc-coach-explain:visible').count(),0,'Coach explanation must stay out of the core path');
  assert.equal(await flow.locator('.gpc-today-plan:visible').count(),0,'Planner utility must stay out of the core path');
  assert.equal(await page.locator('[data-garang-direct-workout-start="1"]:visible').count(),1,'Today must expose exactly one workout primary action');
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,`Today must not overflow mobile viewport: ${JSON.stringify(width)}`);
  assert.deepEqual(errors,[],`Today direct action browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-today-action-flow Today -> concrete workout -> one action: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});