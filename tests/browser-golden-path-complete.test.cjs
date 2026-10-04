'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8786,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');
const localDate=(offset=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,160));}throw new Error('golden path complete server did not start');}
function seed(){
 const today=localDate(),now=new Date().toISOString();
 const history=[-6,-4,-2].map((offset,index)=>({id:`history-${index}`,date:localDate(offset),name:'바벨 벤치프레스',sets:3,reps:8,weight:50,rpe:7,rir:2,duration:35,volume:1200,createdAt:now,updatedAt:now}));
 return {meta:{schemaVersion:5,updatedAt:now},profile:{name:'Direct Loop',age:29,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',experience:'intermediate',equipmentProfile:'full_gym',weeklyFrequency:7,availableMinutes:45,preferences:''},preferences:{language:'ko',unit:'metric'},planner:[],workouts:history,meals:[],runs:[],body:[],checkins:[{id:'today-checkin',date:today,sleep:7.5,energy:4,stress:2,soreness:2,availableMinutes:45,createdAt:now}],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};
}
async function route(page,screen){const ok=await page.evaluate(next=>window.GarangRouter?.navigate?.(next,{source:'direct-loop-test',force:true}),screen);assert.equal(ok,true);await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,screen,{timeout:7000});}
async function completeCurrentExercise(page){
 await page.locator('#workoutSetDetails .current-set [data-execution-set-complete]').waitFor({state:'visible',timeout:7000});
 const total=Number(await page.locator('#wSets').inputValue())||3;
 for(let index=0;index<total;index++){
   const row=page.locator('#workoutSetDetails .current-set');
   await row.locator('[data-set-weight]').fill('40');
   await row.locator('[data-set-reps]').fill('8');
   await row.locator('[data-execution-set-complete]').click();
   await page.waitForTimeout(80);
   const rest=page.locator('#workoutExecutionRest');
   if(await rest.isVisible().catch(()=>false))await page.locator('#skipWorkoutRest').click();
 }
}
(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await installAuthenticatedFirebaseMock(context);
  await context.addInitScript(payload=>localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload)),seed());
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error?.stack||error?.message||error)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
  await page.waitForFunction(()=>window.GarangTodayDirectWorkoutLoopV1?.version==='garang-today-direct-workout-loop-v1.0.0'&&window.GarangDailyPlanV1&&window.GarangWorkoutIntelligenceUI,null,{timeout:10000});

  const startedAt=Date.now();
  const start=page.locator('[data-garang-direct-workout-start="1"]');
  await start.waitFor({state:'visible',timeout:10000});
  await page.waitForFunction(()=>!document.querySelector('[data-garang-direct-workout-start="1"]')?.disabled,null,{timeout:10000});
  const comprehensionMs=Date.now()-startedAt;
  assert.ok(comprehensionMs<=10000,`Today workout must become actionable within 10 seconds, got ${comprehensionMs}ms`);
  assert.match(await page.locator('#garangTodayFlow .gtf-decision h2').innerText(),/오늘은 .* 하세요/);
  assert.ok((await page.locator('#garangTodayFlow .gtf-decision p').innerText()).trim().length>4,'Today must explain why in one visible line');
  const planRows=page.locator('#garangTodayFlow .gtdw-row');assert.ok(await planRows.count()>=2,'Today must expose actual exercises instead of a generic plan link');
  const planText=await page.locator('#garangTodayFlow .gtdw-plan').innerText();assert.match(planText,/\d+\s*×\s*\d+/,'Today must expose sets and reps');assert.match(planText,/kg|중량 선택/,'Today must expose a starting load or an explicit load choice');
  assert.equal(await page.locator('#garangTodayFlow .gpc-coach-explain:visible').count(),0,'Coach must not be required to understand today');
  assert.equal(await page.locator('#garangTodayFlow .gpc-today-plan:visible').count(),0,'Planner must not be required to start today');

  await start.click();
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='workout',null,{timeout:7000});
  await page.waitForFunction(()=>window.GarangWorkoutExecutionBridge?.draftSummary?.()?.exercises>0,null,{timeout:7000});
  assert.ok(await page.locator('#workoutDraftArea [data-execute-workout]').count()>0,'Today recommendation must arrive in the canonical workout draft');
  await page.locator('#workoutDraftArea [data-execute-workout="0"]').click();
  await completeCurrentExercise(page);
  const finish=page.locator('#finishWorkoutSession');await finish.waitFor({state:'visible',timeout:5000});assert.equal(await finish.isEnabled(),true);
  await finish.click();
  await page.waitForFunction(today=>window.GarangAgentStateBridge?.getState?.()?.workouts?.some(row=>String(row?.date||'').slice(0,10)===today),localDate(),{timeout:7000});

  const result=page.locator('.workout-result-card');await result.waitFor({state:'visible',timeout:5000});
  const next=page.locator('[data-garang-next-workout-change="1"]');await next.waitFor({state:'visible',timeout:5000});
  const postStarted=Date.now(),nextText=(await next.innerText()).trim();
  assert.match(nextText,/다음|유지|검토|낮춰/,'Workout result must state what changes next');
  assert.ok(Date.now()-postStarted<=10000,'post-workout interpretation must be immediately visible');

  await route(page,'today');
  const todayResult=page.locator('[data-garang-today-workout-result="1"]');await todayResult.waitFor({state:'visible',timeout:7000});
  assert.match(await page.locator('#garangTodayFlow .gtf-decision h2').innerText(),/오늘 운동을 완료/);
  assert.match(await todayResult.innerText(),/다음|유지|검토|낮춰/);
  assert.equal(await page.locator('#main').getAttribute('data-garang-next-owner'),'today-direct-workout');
  assert.deepEqual(errors,[],`direct Golden Path browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser Golden Path direct Today -> workout -> record -> next decision: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});