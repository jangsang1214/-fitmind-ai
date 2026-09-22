'use strict';
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8816;
const baseURL=`http://127.0.0.1:${port}`;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZPHQAAAAASUVORK5CYII=','base64');
const date=()=>new Date().toISOString().slice(0,10);
const state=()=>({
  meta:{schemaVersion:5,updatedAt:new Date().toISOString()},
  profile:{name:'Photo Evidence',age:31,height:175,weight:72,gender:'male',goal:'퍼포먼스 향상'},
  onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',weeklyFrequency:4,availableMinutes:60,preferences:''},
  preferences:{language:'ko',unit:'metric'},
  planner:[],
  workouts:[{id:'w1',date:date(),name:'바벨 벤치프레스',primaryMuscle:'가슴',sets:3,reps:10,weight:60,rpe:8,duration:20,body:72,met:5,kcal:130,volume:1800,estimated1RM:80,photoEvidence:{id:'missing-workout-photo',kind:'workout',localOnly:true,userConfirmed:true}}],
  meals:[{id:'m1',date:date(),name:'닭가슴살 샐러드',items:[{id:'mi1',name:'닭가슴살',grams:150,kcal:240,protein:40,carbs:3,fat:6}],kcal:240,protein:40,carbs:3,fat:6,photoEvidence:{id:'missing-meal-photo',kind:'nutrition',localOnly:true,userConfirmed:true}}],
  runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'
});

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{const response=await fetch(baseURL);if(response.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,180));
  }
  throw new Error('photo evidence preview server did not start');
}
async function route(page,screen){
  const ok=await page.evaluate(next=>window.GarangRouter?.navigate?.(next,{source:'photo-evidence-browser',force:true}),screen);
  assert.equal(ok,true,`${screen} must remain reachable through the canonical Router`);
  await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,screen,{timeout:7000});
}
async function choosePhoto(page,buttonSelector,inputName){
  const chooserPromise=page.waitForEvent('filechooser');
  await page.locator(buttonSelector).click();
  const chooser=await chooserPromise;
  await chooser.setFiles({name:inputName,mimeType:'image/png',buffer:png});
}

(async()=>{
  const server=startStaticServer(serveRoot,port);
  let browser;
  try{
    await waitForServer();
    browser=await webkit.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await installAuthenticatedFirebaseMock(context);
    await context.addInitScript(payload=>{localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload));},state());
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error?.stack||error?.message||error)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});

    await route(page,'workout');
    await page.locator('[data-gws-step="log"]').click();
    await page.locator('.photo-evidence-card').waitFor({state:'visible'});
    assert.match(await page.locator('.photo-evidence-card').innerText(),/오늘의 운동을 남겨보세요/);
    assert.match(await page.locator('.photo-evidence-card').innerText(),/선택 사항/);
    await choosePhoto(page,'#certWorkout','workout.png');
    await page.locator('.photo-evidence-ready').waitFor({state:'visible'});
    assert.match(await page.locator('.photo-evidence-ready').innerText(),/세션 저장 시 사진도 함께 기록됩니다/);
    const workoutButton=await page.locator('#certWorkout').boundingBox();
    assert.ok(workoutButton&&workoutButton.height>=44,'workout evidence photo action must remain touch-safe');

    await page.locator('[data-gws-step="overview"]').click();
    const history=page.locator('details.compact-history').first();
    await history.locator('summary').click();
    const workoutEvidence=page.locator('.workout-history-row .photo-evidence-record').first();
    await workoutEvidence.waitFor({state:'visible'});
    assert.match(await workoutEvidence.innerText(),/PHOTO EVIDENCE/);
    assert.match(await workoutEvidence.innerText(),/오늘의 운동 사진이 함께 기록됨/);
    await workoutEvidence.locator('[data-photo-evidence]').click();
    await page.waitForFunction(()=>/다른 기기에 저장/.test(document.getElementById('toast')?.textContent||''),null,{timeout:3000});

    await route(page,'nutrition');
    assert.equal(await page.locator('.photo-evidence-nutrition').count(),1,'Nutrition must expose one Meal Evidence hero');
    assert.match(await page.locator('.photo-evidence-nutrition').innerText(),/MEAL EVIDENCE/);
    assert.match(await page.locator('.photo-evidence-nutrition').innerText(),/식사를 사진으로 기록하세요/);
    const mealEvidence=page.locator('.meal-visual-card .photo-evidence-record').first();
    await mealEvidence.waitFor({state:'visible'});
    assert.match(await mealEvidence.innerText(),/이 식사의 분석 기준 사진/);

    await choosePhoto(page,'#pickMealScan','meal.png');
    const analysis=page.locator('.photo-evidence-analysis');
    await analysis.waitFor({state:'visible'});
    assert.match(await analysis.innerText(),/분석 초안/);
    assert.match(await analysis.innerText(),/GARANG 추정값/);
    const mealButton=await page.locator('#pickMealScan').boundingBox();
    assert.ok(mealButton&&mealButton.height>=44,'meal evidence photo action must remain touch-safe');

    const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
    assert.ok(width.scroll<=width.client+1,`Photo Evidence v1.5 must not create horizontal overflow: ${JSON.stringify(width)}`);
    assert.deepEqual(errors,[],`Photo Evidence browser errors:\n${errors.join('\n')}`);
    await context.close();
    console.log('browser Photo Evidence v1.5 WebKit mobile: PASS');
  }finally{
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error);process.exit(1);});
