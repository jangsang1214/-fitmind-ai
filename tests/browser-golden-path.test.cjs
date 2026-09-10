'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8785,baseURL=`http://127.0.0.1:${port}`;
const pad=value=>String(value).padStart(2,'0');
const localDate=(offset=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const mondayOf=date=>{const [year,month,day]=date.split('-').map(Number),d=new Date(year,month-1,day),offset=(d.getDay()+6)%7;d.setDate(d.getDate()-offset);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const addDays=(date,offset)=>{const [year,month,day]=date.split('-').map(Number),d=new Date(year,month-1,day);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const response=await fetch(baseURL);if(response.ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,180));}throw new Error('golden path preview server did not start');}
async function route(page,screen){const ok=await page.evaluate(next=>window.GarangRouter?.navigate?.(next,{source:'golden-path-browser',force:true}),screen);assert.equal(ok,true,`${screen} must remain reachable through the canonical Router`);await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,screen,{timeout:7000});}
async function storedState(page){return page.evaluate(()=>window.GarangAgentStateBridge?.getState?.()||JSON.parse(localStorage.getItem('garang_demo_state_v3')||'null'));}
function emptyPlanState(){
  const today=localDate();
  return {
    meta:{schemaVersion:5,updatedAt:new Date().toISOString()},
    profile:{name:'Golden Path User',age:29,height:174,weight:70,gender:'male',goal:'근육 증가'},
    onboarding:{complete:true,skipped:false,goal:'근육 증가',experience:'intermediate',weeklyFrequency:4,availableMinutes:60,preferences:''},
    preferences:{language:'ko',unit:'metric'},planner:[],
    workouts:[],
    meals:[{id:'meal-1',date:today,name:'기준 식단',kcal:2200,protein:112,carbs:260,fat:65,items:[{id:'food-1',name:'기준 식단',grams:500,kcal:2200,protein:112,carbs:260,fat:65}]}],
    runs:[],body:[],checkins:[{id:'checkin-1',date:today,sleep:7.5,energy:4,stress:2,soreness:2}],dailyCheckins:[],
    aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'
  };
}

(async()=>{
  const server=startStaticServer(serveRoot,port);let browser;
  try{
    await waitForServer();browser=await webkit.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},emptyPlanState());
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error?.stack||error?.message||error)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
    await page.waitForFunction(()=>window.GarangGoalAlignment&&window.GarangRouter,null,{timeout:7000});

    const today=localDate(),monday=mondayOf(today);
    const emptyPlan=page.locator('[data-golden-path="planner-entry"]');await emptyPlan.waitFor({state:'visible',timeout:7000});
    await emptyPlan.click();
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='planner',null,{timeout:7000});
    const planner=page.locator('#garangPlanExecution');await planner.waitFor({state:'visible',timeout:7000});
    assert.equal(await page.locator('#garangPlanExecution').count(),1,'Today plan entry must produce one canonical Planner surface');
    assert.equal(await page.locator('#garangPlanExecution [data-gx-sheet]').isVisible(),true,'Today plan entry must open the Planner droplet detail');
    assert.equal(await page.locator('[data-gx-plan-slot] #addPlan').count(),1,'Planner form must be placed inside the opened droplet');
    assert.match(await planner.innerText(),/목표 · 근육 증가/,'Planner must show the active model goal as context');
    const timeline=await planner.locator('[data-gx-date]').evaluateAll(nodes=>nodes.map(node=>node.dataset.gxDate));
    assert.deepEqual(timeline,Array.from({length:7},(_,index)=>addDays(monday,index)),'Planner week must run Monday through Sunday');
    const plannerFields=await page.evaluate(()=>{const width=document.documentElement.clientWidth;return ['planDate','planTime','planType','planTitle','addPlan'].map(id=>{const rect=document.getElementById(id)?.getBoundingClientRect();return {id,width:rect?.width||0,right:rect?.right||0,viewport:width};});});
    assert.ok(plannerFields.every(field=>field.width>0&&field.right<=field.viewport+1),'Planner fields must stay inside the mobile viewport: '+JSON.stringify(plannerFields));
    await page.locator('#planTitle').fill('저녁 상체 세션');await page.locator('#addPlan').click();
    await page.waitForFunction(()=>{const state=window.GarangAgentStateBridge?.getState?.();return state?.planner?.some(row=>row.title==='저녁 상체 세션');},null,{timeout:7000});
    let state=await storedState(page);const savedPlan=state.planner.find(row=>row.title==='저녁 상체 세션');
    assert.equal(savedPlan.goalLabel,'근육 증가','a saved plan must retain the current model goal');
    assert.equal(await page.locator('#garangPlanExecution').count(),1,'saving a plan must not create a duplicate Planner layer');

    await route(page,'workout');
    await page.locator('[data-gws-step="log"]').click();
    await page.locator('.garang-set-options > summary').click();await page.locator('#workoutSetDetails').waitFor({state:'visible',timeout:3000});
    const setValues=[[40,10,6],[60,8,7],[80,6,9]];
    for(let index=0;index<setValues.length;index++){
      const row=page.locator('#workoutSetDetails [data-set-row]').nth(index),[weight,reps,rpe]=setValues[index];
      await row.locator('[data-set-weight]').fill(String(weight));await row.locator('[data-set-reps]').fill(String(reps));await row.locator('[data-set-rpe]').fill(String(rpe));
    }
    await page.waitForFunction(()=>document.getElementById('oneRmPreview')?.textContent==='96.0',null,{timeout:3000});
    await page.locator('#addWorkout').click();await page.locator('[data-remove-workout="0"]').waitFor({state:'visible',timeout:5000});
    assert.match(await page.locator('#workoutDraftArea').innerText(),/40kg × 10.*60kg × 8.*80kg × 6/,'one workout draft must preserve each set value');
    await page.locator('#saveWorkoutSession').click();
    await page.waitForFunction(()=>window.GarangAgentStateBridge?.getState?.()?.workouts?.length===1,null,{timeout:7000});
    state=await storedState(page);const workout=state.workouts[0];
    assert.deepEqual(workout.setDetails.map(row=>[row.weight,row.reps,row.rpe]),setValues,'saved workout must preserve per-set weight, reps and RPE');
    assert.equal(workout.volume,1360,'saved workout volume must use the individual set weights');
    assert.equal(workout.estimated1RM,96,'estimated 1RM must use the strongest set, not mixed aggregate fields');

    await route(page,'workout');await page.locator('[data-gws-step="overview"]').click();
    assert.equal(await page.locator('#main > .record-insights').count(),0,'populated workout insights must not remain as a second surface');
    assert.equal(await page.locator('.gws-panel[data-garang-workout-surface="overview"] .record-insights').count(),1,'populated workout insights must belong to Overview');

    await route(page,'coach');
    await page.locator('.garang-coach-v2 [data-gcl-actions-toggle]').waitFor({state:'visible',timeout:7000});
    assert.equal(await page.locator('.garang-coach-v2 [data-gcl-actions-panel]').isHidden(),true,'Coach next actions must stay quiet by default');
    await page.locator('.garang-coach-v2 [data-gcl-actions-toggle]').click();
    await page.locator('.garang-coach-v2 [data-gcl-actions-panel]').waitFor({state:'visible',timeout:2500});
    assert.ok(await page.locator('.garang-coach-v2 [data-gcl-actions-panel] [data-gcl-coach]:visible').count()>=2,'Coach actions must be available after disclosure');
    await page.locator('.garang-coach-v2 [data-gcl-actions-panel] [data-gcl-coach="0"]').click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.g2-message.user .g2-message-text')].some(el=>/오늘 남은 계획|남은 계획/.test(el.textContent||'')),null,{timeout:7000});

    await route(page,'progress');
    const accumulation=page.locator('#garangAccumulationOverview');await accumulation.waitFor({state:'visible',timeout:7000});
    assert.equal(await page.locator('#garangAccumulationOverview').count(),1,'Accumulation must keep one canonical surface after the Golden Path');
    assert.match(await accumulation.innerText(),/근육 증가/,'Accumulation must remain connected to the model goal');
    assert.equal(await page.locator('#garangAccumulationOverview [data-gx-date]').count(),7);
    await accumulation.locator('[data-gx-details]').click();await accumulation.locator('[data-gx-sheet]').waitFor({state:'visible',timeout:3000});
    const goalDetail=await accumulation.locator('[data-gx-sheet]').innerText();assert.match(goalDetail,/목표 적합도/);assert.match(goalDetail,/운동/);assert.match(goalDetail,/식단/);assert.match(goalDetail,/회복/);assert.match(goalDetail,/저녁 상체 세션/);
    const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,'Golden Path screens must not create horizontal overflow: '+JSON.stringify(width));
    assert.deepEqual(errors,[],'Golden Path browser errors:\n'+errors.join('\n'));
    await context.close();console.log('browser-golden-path WebKit mobile: PASS');
  }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
