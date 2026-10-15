'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {webkit}=require('playwright');
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const outputDir=path.join(root,'artifacts','founder-review');
const port=8804;
const baseURL=`http://127.0.0.1:${port}`;

function isoDate(offset=0){
  const d=new Date();
  d.setHours(12,0,0,0);
  d.setDate(d.getDate()+offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function reviewState(){
  const yesterday=isoDate(-1),older=isoDate(-18);
  return {
    meta:{schemaVersion:5,updatedAt:new Date().toISOString()},
    profile:{name:'Founder Review',age:29,height:176,weight:73,gender:'male',goal:'퍼포먼스 향상'},
    onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',equipmentProfile:'full_gym',weeklyFrequency:4,availableMinutes:55},
    preferences:{language:'ko',unit:'metric'},settings:{},privacy:{consent:{analytics:false}},planner:[],
    workouts:[{id:'w-prev',date:yesterday,name:'바벨 벤치프레스',sets:4,reps:8,weight:72.5,rpe:8,duration:48,setDetails:[{weight:72.5,reps:8,rpe:8},{weight:72.5,reps:8,rpe:8},{weight:72.5,reps:7,rpe:8.5},{weight:70,reps:8,rpe:8.5}]}],
    meals:[{id:'m-prev',date:yesterday,name:'닭가슴살 식사',kcal:630,protein:51,carbs:62,fat:14,items:[{name:'닭가슴살',grams:180,kcal:300,protein:48,carbs:0,fat:6},{name:'현미밥',grams:210,kcal:330,protein:3,carbs:62,fat:8}]}],
    runs:[],body:[{id:'b0',date:older,weight:74,muscle:32.2,fatPercent:15.3},{id:'b1',date:yesterday,weight:73,muscle:32.8,fatPercent:14.7}],
    checkins:[],dailyCheckins:[],physiologicalSignals:[],
    aiChat:[{role:'assistant',text:'오늘은 최근 훈련과 회복 상태를 반영해 운동을 준비했습니다.',at:new Date().toISOString()}],
    memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},foodIdentity:{barcodes:[],misses:[],corrections:[]},
    actionLog:[],analytics:{events:[]},errors:[],plan:'FREE'
  };
}

async function waitServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{const response=await fetch(baseURL);if(response.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,160));
  }
  throw new Error('Founder review screenshot server did not start');
}

async function route(page,screen){
  const ok=await page.evaluate(next=>window.GarangRouter?.navigate?.(next,{source:'founder-review-screenshot',force:true}),screen);
  if(ok!==true)throw new Error(`${screen} route failed`);
  await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,screen,{timeout:7000});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangReferenceUi==='v2',null,{timeout:5000});
  await page.waitForTimeout(500);
}

async function shot(page,name){
  await page.waitForTimeout(250);
  await page.screenshot({path:path.join(outputDir,`${name}.png`),fullPage:false});
}

(async()=>{
  fs.mkdirSync(outputDir,{recursive:true});
  const server=startStaticServer(serveRoot,port);
  let browser;
  try{
    await waitServer();
    browser=await webkit.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    await installAuthenticatedFirebaseMock(context);
    await context.addInitScript(payload=>localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload)),reviewState());
    const page=await context.newPage();
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
    await page.waitForFunction(()=>window.GarangReferenceUIV2?.version==='garang-reference-ui-v2.0.0',null,{timeout:8000});
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangReferenceUi==='v2',null,{timeout:8000});

    await route(page,'today');
    await page.locator('#garangTodayFlow .gtf-decision').waitFor({state:'visible',timeout:6000});
    await shot(page,'01-today');

    await route(page,'workout');
    await page.locator('[data-gws-step="exercise"]').first().click();
    await page.locator('#workoutSetDetails .execution-set-row.current-set').first().waitFor({state:'visible',timeout:6000});
    await page.locator('#startWorkoutSession').waitFor({state:'visible',timeout:6000});
    await page.locator('#startWorkoutSession').click();
    await page.waitForFunction(()=>document.querySelector('.workout-session-bar')?.classList.contains('is-live'),null,{timeout:4000});
    await shot(page,'02-workout-live');

    await page.locator('#workoutSetDetails .execution-set-row.current-set [data-execution-set-complete]').first().click();
    await page.locator('#workoutExecutionRest').waitFor({state:'visible',timeout:4000});
    await shot(page,'03-workout-rest');

    await route(page,'nutrition');
    await page.locator('.g-ref-nutrition-stage>.meal-scan-card').waitFor({state:'visible',timeout:6000});
    await shot(page,'04-nutrition');

    await route(page,'body');
    await page.locator('.g-ref-body-stage>.body-hero').waitFor({state:'visible',timeout:6000});
    await page.waitForFunction(()=>document.querySelector('.g-ref-body-primary .body-hero-anatomy .g3-body-model[data-garang-classical-model="6"]'),null,{timeout:5000});
    await shot(page,'05-body');

    await route(page,'coach');
    await page.locator('.garang-coach-v2.g-ref-coach-shell').waitFor({state:'visible',timeout:6000});
    await page.locator('.g-ref-coach-composer').waitFor({state:'visible',timeout:6000});
    await shot(page,'06-coach');

    await context.close();
    console.log(`Founder review screenshots saved to ${outputDir}`);
  }finally{
    if(browser)await browser.close().catch(()=>{});
    await server.close();
  }
})().catch(error=>{console.error(error);process.exit(1);});
