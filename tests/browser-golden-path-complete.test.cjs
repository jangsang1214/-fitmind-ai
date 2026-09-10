'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8786,baseURL='http://127.0.0.1:'+port;
const pad=value=>String(value).padStart(2,'0');
const localDate=()=>{const d=new Date();d.setHours(12,0,0,0);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms));

function freshState(){
  return {
    meta:{schemaVersion:5,updatedAt:new Date().toISOString()},
    profile:{name:'Golden Path New User',age:29,height:174,weight:70,gender:'male',goal:'퍼포먼스 향상'},
    onboarding:{complete:false,skipped:false,goal:'근육 증가',experience:'beginner',weeklyFrequency:4,availableMinutes:45,preferences:''},
    preferences:{language:'ko',unit:'metric'},planner:[],workouts:[],meals:[],runs:[],body:[],
    checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},
    memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'
  };
}
async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){try{const response=await fetch(baseURL);if(response.ok)return;}catch{}await sleep(180);}
  throw new Error('complete Golden Path preview server did not start');
}
async function heartbeat(page,label){
  await Promise.race([page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,35)))),timeout(2200,label+': WebKit main thread stopped responding')]);
}
async function tap(page,selector,label){
  const loc=page.locator(selector).first();
  await loc.waitFor({state:'visible',timeout:7000});
  await loc.evaluate(element=>element.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));
  await page.waitForTimeout(45);
  const box=await loc.boundingBox();assert.ok(box,label+': missing touch box');
  const hit=await loc.evaluate(element=>{const rect=element.getBoundingClientRect(),target=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);return !!target&&(target===element||element.contains(target));});
  assert.equal(hit,true,label+': does not own its touch point');
  await Promise.race([page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2),timeout(3500,label+': physical tap did not settle')]);
  await heartbeat(page,label);
}
async function route(page,screen){
  const ok=await page.evaluate(next=>window.GarangRouter?.navigate?.(next,{source:'golden-path-complete-browser',force:true}),screen);
  assert.equal(ok,true,screen+' must remain reachable through the canonical Router');
  await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,screen,{timeout:7000});
  await heartbeat(page,'route '+screen);
}
async function waitForStep(page,step){
  try{
    await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.gpStep===expected,step,{timeout:7000});
  }catch(error){
    const diagnostic=await page.evaluate(()=>({screen:document.getElementById('main')?.dataset?.garangScreen,gpStep:document.getElementById('main')?.dataset?.gpStep,model:window.GarangGoldenPath?.derive?.(window.GarangAgentStateBridge?.getState?.()||{},{today:window.GarangGoldenPath?.localDate?.()}),planner:window.GarangAgentStateBridge?.getState?.()?.planner,workouts:window.GarangAgentStateBridge?.getState?.()?.workouts,events:window.GarangAgentStateBridge?.getState?.()?.analytics?.events?.slice(-8)}));
    const detail='Golden Path diagnostic: '+JSON.stringify(diagnostic);
    console.error(detail);
    throw new Error(error.message+'\n'+detail,{cause:error});
  }
  await page.locator('[data-golden-path-surface][data-gp-step="'+step+'"]').waitFor({state:'visible',timeout:3000});
}
async function storedState(page){
  return page.evaluate(()=>window.GarangAgentStateBridge?.getState?.()||JSON.parse(localStorage.getItem('garang_demo_state_v3')||'null'));
}
async function noHorizontalOverflow(page,label){
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert.ok(width.scroll<=width.client+1,label+' must not create horizontal overflow: '+JSON.stringify(width));
}

(async()=>{
  const server=startStaticServer(serveRoot,port);let browser;
  try{
    await waitForServer();browser=await webkit.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},freshState());
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error?.stack||error?.message||error)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
    await page.waitForFunction(()=>window.GarangGoldenPath&&window.GarangRouter&&window.GarangAgentStateBridge?.ready?.(),null,{timeout:7000});

    assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'modeling','a new local user must start in the canonical Modeling identity');
    await page.locator('#saveOnboarding').waitFor({state:'visible',timeout:3000});
    await page.locator('#oGoal').selectOption({label:'근육 증가'});
    await page.locator('#oExperience').selectOption('beginner');
    await page.locator('#oFrequency').fill('4');await page.locator('#oMinutes').fill('45');
    await tap(page,'#saveOnboarding','complete onboarding');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:7000});
    await waitForStep(page,'first_record');
    assert.equal(await page.locator('[data-golden-path-surface]').count(),1,'Today must expose one Golden Path surface');
    assert.match(await page.locator('[data-golden-path-surface]').innerText(),/첫 기록/);

    await tap(page,'[data-gp-action="record"]','open first Record');
    await page.locator('[data-garang-record-sheet="1"]').waitFor({state:'visible',timeout:5000});
    await tap(page,'[data-garang-record-route="workout"]','choose workout record');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='workout',{timeout:7000});
    await tap(page,'[data-gws-step="log"]','open workout Log');
    await page.locator('#addWorkout').waitFor({state:'visible',timeout:5000});
    await tap(page,'.garang-set-options > summary','open workout details');
    await page.locator('#wName').fill('바벨 벤치프레스');await page.locator('#wSets').fill('3');await page.locator('#wReps').fill('8');
    await page.locator('#wWeight').fill('40');await page.locator('#wRpe').fill('7');await page.locator('#wDuration').fill('30');
    await tap(page,'#addWorkout','add first workout');await page.locator('[data-remove-workout="0"]').waitFor({state:'visible',timeout:4000});
    await tap(page,'#saveWorkoutSession','save first workout');
    await page.waitForFunction(()=>window.GarangAgentStateBridge?.getState?.()?.workouts?.length===1,null,{timeout:7000});

    await route(page,'today');await waitForStep(page,'coach');
    await tap(page,'[data-gp-action="coach"]','open Coach after first record');
    await page.locator('.garang-coach-v2 [data-gcl-actions-toggle]').waitFor({state:'visible',timeout:7000});
    await tap(page,'.garang-coach-v2 [data-gcl-actions-toggle]','disclose Coach next action');
    await page.locator('.garang-coach-v2 [data-gcl-actions-panel]').waitFor({state:'visible',timeout:2500});
    await tap(page,'.garang-coach-v2 [data-gcl-actions-panel] [data-gcl-coach="0"]','ask Coach for a plan');
    await page.waitForFunction(()=>[...document.querySelectorAll('.g2-message.user .g2-message-text')].some(node=>/오늘 계획|계획을 만들어/.test(node.textContent||'')),null,{timeout:7000});
    assert.equal(await page.locator('.g4-agent-proposal').count(),0,'Coach must not invent a plan before recovery evidence exists');

    await route(page,'today');await waitForStep(page,'plan');
    assert.equal(await page.locator('[data-gp-action="checkin"]').count(),1,'plan step must ask for a recovery check-in when it is missing');
    assert.match(await page.locator('[data-golden-path-surface]').innerText(),/회복 상태/);
    await tap(page,'[data-gp-action="checkin"]','open recovery check-in');
    await page.locator('.modal #saveCheckin').waitFor({state:'visible',timeout:3000});
    await page.locator('#ciSleep').fill('7');await page.locator('#ciEnergy').fill('4');await page.locator('#ciStress').fill('2');await page.locator('#ciSoreness').fill('2');await page.locator('#ciMinutes').fill('45');
    await tap(page,'.modal #saveCheckin','save recovery check-in');
    await page.waitForFunction(()=>!document.querySelector('.modal #saveCheckin'),null,{timeout:5000});
    await waitForStep(page,'plan');assert.equal(await page.locator('[data-gp-action="coach"]').count(),1,'recovery evidence must unlock Coach plan proposal');

    await tap(page,'[data-gp-action="coach"]','reopen Coach for plan proposal');
    await page.locator('.garang-coach-v2 [data-gcl-actions-toggle]').waitFor({state:'visible',timeout:7000});
    await tap(page,'.garang-coach-v2 [data-gcl-actions-toggle]','disclose plan action');
    await page.locator('.garang-coach-v2 [data-gcl-actions-panel]').waitFor({state:'visible',timeout:2500});
    await tap(page,'.garang-coach-v2 [data-gcl-actions-panel] [data-gcl-coach="0"]','request approved plan proposal');
    await page.waitForSelector('.g4-agent-proposal [data-g4-approve]',{state:'visible',timeout:9000});
    const beforeApproval=await storedState(page);assert.equal(beforeApproval.planner.length,0,'Coach proposal must not write before approval');
    await tap(page,'.g4-agent-proposal [data-g4-approve]','approve Coach plan');
    await page.waitForFunction(()=>window.GarangAgentStateBridge?.getState?.()?.planner?.length===1,null,{timeout:7000});
    let state=await storedState(page);assert.equal(state.planner[0].source,'ai');assert.equal(state.planner[0].goalLabel,'근육 증가');

    await route(page,'today');await waitForStep(page,'execute');
    const beforeExecution=await page.evaluate(()=>window.GarangGoldenPath.derive(window.GarangAgentStateBridge.getState(),{today:window.GarangGoldenPath.localDate()}));
    assert.equal(beforeExecution.execution.executed,0,'the first record, created before the plan, must not falsely execute the plan');
    await tap(page,'[data-gp-action="execute"]','open planned execution record');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='workout',{timeout:7000});
    await tap(page,'[data-gws-step="log"]','open execution Log');
    await tap(page,'.garang-set-options > summary','open execution details');
    await page.locator('#wName').fill('바벨 벤치프레스');await page.locator('#wSets').fill('3');await page.locator('#wReps').fill('8');await page.locator('#wWeight').fill('42.5');await page.locator('#wRpe').fill('7');await page.locator('#wDuration').fill('30');
    await tap(page,'#addWorkout','add executed workout');await tap(page,'#saveWorkoutSession','save executed workout');
    await page.waitForFunction(()=>window.GarangAgentStateBridge?.getState?.()?.workouts?.length===2,null,{timeout:7000});

    await route(page,'today');await waitForStep(page,'accumulation');
    const afterExecution=await page.evaluate(()=>window.GarangGoldenPath.derive(window.GarangAgentStateBridge.getState(),{today:window.GarangGoldenPath.localDate()}));
    assert.equal(afterExecution.execution.executed,1);assert.equal(afterExecution.execution.allExecuted,true);
    await tap(page,'[data-gp-action="accumulation"]','open Accumulation');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='progress',{timeout:7000});
    await page.locator('#garangAccumulationOverview').waitFor({state:'visible',timeout:7000});
    await page.waitForFunction(()=>window.GarangGoldenPath.derive(window.GarangAgentStateBridge.getState(),{today:window.GarangGoldenPath.localDate()}).step==='complete',null,{timeout:7000});
    assert.match(await page.locator('#garangAccumulationOverview').innerText(),/근육 증가/,'Accumulation must retain the onboarding goal context');
    await noHorizontalOverflow(page,'Accumulation');

    await route(page,'today');
    await page.waitForFunction(()=>!document.querySelector('[data-golden-path-surface]'),null,{timeout:5000});
    const final=await storedState(page),events=final.analytics.events||[],screens=events.filter(event=>event.name==='screen_viewed').map(event=>event.props?.screen);
    assert.ok(screens.includes('coach'),'Golden Path must record Coach visitation');assert.ok(screens.includes('progress'),'Golden Path must record Accumulation visitation');
    assert.ok(events.some(event=>event.name==='onboarding_completed'));assert.ok(events.filter(event=>event.name==='workout_saved').length>=2);
    await noHorizontalOverflow(page,'Today');assert.deepEqual(errors,[],'complete Golden Path browser errors:\n'+errors.join('\n'));
    await context.close();console.log('browser-golden-path-complete WebKit mobile: PASS');
  }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
