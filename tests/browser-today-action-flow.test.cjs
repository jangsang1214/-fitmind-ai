'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8778,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0'),date=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,180));}throw new Error('GARANG Today preview server did not start');}
function baseState(){const today=date(),now=new Date().toISOString();return {meta:{schemaVersion:5,updatedAt:now,dailyPlanDrafts:{}},profile:{name:'Today Flow',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',experience:'intermediate',equipmentProfile:'full_gym',weeklyFrequency:7,availableMinutes:45},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[{id:'seed-workout',date:date(-2),name:'벤치프레스',sets:3,reps:8,weight:60,rpe:7,duration:45}],meals:[],runs:[],body:[],checkins:[{id:'c1',date:today,sleep:7.5,energy:4,stress:2,soreness:2,availableMinutes:45}],dailyCheckins:[],physiologicalSignals:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
function seedWorkout(){const s=baseState(),today=date();s.meta.dailyPlanDrafts[today]={id:'gdp-workout',date:today,status:'draft',userEdited:true,revision:1,items:[{id:'gdp-training',domain:'training',type:'workout',title:'상체 근력 집중',focus:'upper',duration:45,intensityScale:1,volumeScale:1,reason:'오늘 회복 상태와 최근 기록을 반영한 상체 훈련입니다.'},{id:'gdp-recovery',domain:'recovery',type:'recovery',title:'회복',duration:15},{id:'gdp-nutrition',domain:'nutrition',type:'nutrition',title:'식단'}]};return s;}
function workoutPlan(){return {spec:{target:'upper',minutes:45,intensity:'moderate',equipmentProfile:'full_gym'},plan:{title:'상체 근력 집중',target:'upper',minutes:45,targetRPE:8,equipmentProfile:'full_gym',exercises:[{name:'벤치프레스',sets:3,reps:8,suggestedWeight:62.5,targetRPE:8,restSec:120},{name:'랫 풀다운',sets:3,reps:10,suggestedWeight:50,targetRPE:8,restSec:90}]}};}
function seedRest(){const s=baseState(),today=date();s.meta.dailyPlanDrafts[today]={id:'gdp-rest',date:today,status:'draft',userEdited:true,revision:1,items:[{id:'gdp-rest-training',domain:'training',type:'workout',title:'회복 중심 하루',focus:'rest',duration:0,intensityScale:0,volumeScale:0,reason:'최근 회복 상태를 반영해 고강도 운동을 쉬는 날입니다.'},{id:'gdp-rest-recovery',domain:'recovery',type:'recovery',title:'회복',duration:20},{id:'gdp-rest-nutrition',domain:'nutrition',type:'nutrition',title:'식단'}]};return s;}
async function boot(context,state,plan=null){await installAuthenticatedFirebaseMock(context);await context.addInitScript(({state,plan})=>{localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(state));if(plan)sessionStorage.setItem('garang_daily_workout_plan_v1',JSON.stringify(plan));else sessionStorage.removeItem('garang_daily_workout_plan_v1');},{state,plan});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});await page.waitForFunction(()=>window.GarangGoldenMasterV1?.version==='garang-golden-master-v1.0.0'&&document.getElementById('main')?.dataset?.goldenSurface==='home',null,{timeout:10000});return {page,errors};}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const {page,errors}=await boot(context,seedWorkout(),workoutPlan());
  const homeTraining=page.locator('.gm-home-list [data-gm-open="training"]');await homeTraining.waitFor({state:'visible',timeout:8000});
  assert.match(await homeTraining.innerText(),/상체 근력 집중/,'Home must immediately name today’s training decision');
  assert.equal(await page.locator('.gpc-coach-explain:visible,.gpc-today-plan:visible').count(),0,'Coach/Planner utilities must stay out of the Golden Master core path');
  await homeTraining.click();await page.waitForFunction(()=>document.getElementById('main')?.dataset?.goldenSurface==='training',{timeout:7000});
  assert.match(await page.locator('.gm-training h1').innerText(),/상체 근력 집중/,'Training must preserve the Home decision');
  assert.ok(await page.locator('.gm-exercise-list>div').count()>=2,'Training must show the concrete workout prescription');
  const start=page.locator('[data-gm-start]');assert.equal(await start.isVisible(),true,'Training must expose one visible primary workout action');assert.equal(await start.isEnabled(),true,'Workout start must be enabled when a canonical plan exists');
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,`Golden Master Today flow must not overflow mobile viewport: ${JSON.stringify(width)}`);
  assert.deepEqual(errors,[],`Today Golden Master action browser errors:\n${errors.join('\n')}`);await context.close();

  const restContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const {page:restPage,errors:restErrors}=await boot(restContext,seedRest(),null);
  const restTraining=restPage.locator('.gm-home-list [data-gm-open="training"]');await restTraining.waitFor({state:'visible',timeout:8000});assert.match(await restTraining.innerText(),/회복 중심 하루/,'rest day must immediately communicate the recovery decision on Home');
  await restTraining.click();await restPage.waitForFunction(()=>document.getElementById('main')?.dataset?.goldenSurface==='training',{timeout:7000});
  assert.match(await restPage.locator('.gm-training h1').innerText(),/회복 중심 하루/,'rest decision must carry into Training');
  assert.equal(await restPage.locator('[data-gm-start]').isEnabled(),false,'rest day must not expose an actionable hard-training start');
  assert.deepEqual(restErrors,[],`Today rest-day Golden Master browser errors:\n${restErrors.join('\n')}`);await restContext.close();
  console.log('browser-today-action-flow Golden Master workout decision + explicit rest day: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});