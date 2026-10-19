'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {webkit}=require('playwright');
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const outputDir=path.join(root,'artifacts','presentation-v4-review');
const port=8804;
const baseURL=`http://127.0.0.1:${port}`;

function isoDate(offset=0){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function reviewState(){
  const today=isoDate(0),yesterday=isoDate(-1),older=isoDate(-18);
  return {
    meta:{schemaVersion:5,updatedAt:new Date().toISOString()},
    profile:{name:'Founder Review',age:29,height:176,weight:73,gender:'male',goal:'퍼포먼스 향상'},
    onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',equipmentProfile:'full_gym',weeklyFrequency:4,availableMinutes:55},
    preferences:{language:'ko',unit:'metric'},settings:{},privacy:{consent:{analytics:false}},planner:[],
    workouts:[{id:'w-prev',date:yesterday,name:'바벨 벤치프레스',sets:4,reps:8,weight:72.5,rpe:8,duration:48,setDetails:[{weight:72.5,reps:8,rpe:8},{weight:72.5,reps:8,rpe:8},{weight:72.5,reps:7,rpe:8.5},{weight:70,reps:8,rpe:8.5}]}],
    meals:[{id:'m-prev',date:yesterday,name:'닭가슴살 식사',kcal:630,protein:51,carbs:62,fat:14,items:[{name:'닭가슴살',grams:180,kcal:300,protein:48,carbs:0,fat:6},{name:'현미밥',grams:210,kcal:330,protein:3,carbs:62,fat:8}]}],
    runs:[],body:[{id:'b0',date:older,weight:74,muscle:32.2,fatPercent:15.3},{id:'b1',date:yesterday,weight:73,muscle:32.8,fatPercent:14.7}],
    checkins:[{id:'review-checkin',date:today,sleep:7.6,energy:4,stress:2,soreness:2,availableMinutes:55}],dailyCheckins:[],physiologicalSignals:[],
    aiChat:[{role:'assistant',text:'오늘은 최근 훈련과 회복 상태를 반영해 운동을 준비했습니다.',at:new Date().toISOString()}],
    memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},foodIdentity:{barcodes:[],misses:[],corrections:[]},actionLog:[],analytics:{events:[]},errors:[],plan:'FREE'
  };
}
async function waitServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const response=await fetch(baseURL);if(response.ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,160));}throw new Error('Presentation v4 review server did not start');}
async function route(page,screen){const ok=await page.evaluate(next=>window.GarangRouter?.navigate?.(next,{source:'presentation-v4-review',force:true}),screen);if(ok!==true)throw new Error(`${screen} route failed`);await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,screen,{timeout:7000});await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangPresentation==='v4',null,{timeout:5000});await page.waitForTimeout(420);}
async function shot(page,name){await page.waitForTimeout(180);await page.screenshot({path:path.join(outputDir,`${name}.png`),fullPage:false});}
async function completeVisibleSet(page){const row=page.locator('#workoutSetDetails .execution-set-row.current-set').first();await row.waitFor({state:'visible',timeout:5000});const weight=row.locator('[data-set-weight]'),reps=row.locator('[data-set-reps]');if(await weight.count())await weight.fill('75');if(await reps.count())await reps.fill('10');await row.locator('[data-execution-set-complete]').click();await page.waitForTimeout(140);}
async function skipRest(page){const rest=page.locator('#workoutExecutionRest');await rest.waitFor({state:'visible',timeout:4000});const skip=page.locator('#skipWorkoutRest');await skip.waitFor({state:'visible',timeout:4000});await skip.click();await page.waitForTimeout(160);}

(async()=>{
  fs.mkdirSync(outputDir,{recursive:true});for(const file of fs.readdirSync(outputDir))if(file.endsWith('.png'))fs.unlinkSync(path.join(outputDir,file));
  const server=startStaticServer(serveRoot,port);let browser;
  try{
    await waitServer();browser=await webkit.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    await installAuthenticatedFirebaseMock(context);await context.addInitScript(payload=>localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload)),reviewState());
    const page=await context.newPage();await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});await page.waitForFunction(()=>window.GarangPresentationV4?.version?.startsWith('garang-presentation-v4.'),null,{timeout:8000});await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangPresentation==='v4',null,{timeout:8000});

    await route(page,'today');
    await page.waitForFunction(()=>window.GarangTodayDirectWorkoutLoopV1&&document.querySelector('#garangTodayFlow [data-garang-direct-workout-start="1"]'),null,{timeout:10000});
    await page.locator('#garangTodayFlow .gtf-decision').waitFor({state:'visible',timeout:6000});
    await page.locator('#garangTodayFlow .gtdw-direct-workout').waitFor({state:'visible',timeout:6000});
    assert.equal(await page.locator('#garangTodayFlow .gtf-decision').count(),1,'canonical Today decision owner must remain singular behind the Founder presentation');
    await shot(page,'01-today');

    await route(page,'workout');await page.locator('[data-gws-step="exercise"]').first().click();await page.locator('#workoutSetDetails .execution-set-row.current-set').first().waitFor({state:'visible',timeout:6000});await page.locator('#startWorkoutSession').waitFor({state:'visible',timeout:6000});await page.locator('#startWorkoutSession').click();await page.waitForFunction(()=>document.querySelector('.workout-session-bar')?.classList.contains('is-live'),null,{timeout:4000});await page.waitForFunction(()=>{const main=document.querySelector('#main'),media=document.querySelector('.g5-workout-media');return !!main?.classList.contains('g5-screen-workout')&&!!media&&getComputedStyle(media).display!=='none';},null,{timeout:4000});await shot(page,'02-workout-live');

    let completed=0;await completeVisibleSet(page);completed++;await skipRest(page);await completeVisibleSet(page);completed++;await skipRest(page);await page.waitForFunction(()=>document.querySelector('#main')?.classList.contains('g5-record-list-mode'),null,{timeout:4000});await page.locator('#workoutSetDetails .execution-set-row.current-set').first().scrollIntoViewIfNeeded();await shot(page,'03-exercise-record');
    await completeVisibleSet(page);completed++;await page.locator('#workoutExecutionRest').waitFor({state:'visible',timeout:4000});await shot(page,'04-rest');await page.locator('#skipWorkoutRest').click();
    const total=Number(await page.locator('#wSets').inputValue())||4;while(completed<total){await completeVisibleSet(page);completed++;const rest=page.locator('#workoutExecutionRest');if(await rest.isVisible().catch(()=>false))await page.locator('#skipWorkoutRest').click();}
    const visibleFinish=page.locator('.g5-session-finish:visible,#finishWorkoutSession:visible').first();await visibleFinish.waitFor({state:'visible',timeout:5000});await visibleFinish.click();const result=page.locator('.workout-result-card');await result.waitFor({state:'visible',timeout:7000});await page.waitForFunction(()=>document.querySelector('#main')?.classList.contains('g5-workout-summary-mode'),null,{timeout:4000});await shot(page,'05-session-summary');

    await route(page,'nutrition');await page.locator('.g4-nutrition-shell .meal-scan-card').waitFor({state:'visible',timeout:6000});await shot(page,'06-nutrition');
    await route(page,'body');await page.locator('.g4-body-shell .body-hero').waitFor({state:'visible',timeout:6000});const bodyPair=page.locator('.body-hero-anatomy .g4-body-anatomy-pair:visible').first();await bodyPair.waitFor({state:'visible',timeout:6000});await page.waitForFunction(()=>{const nodes=[...document.querySelectorAll('.body-hero-anatomy .g4-body-anatomy-pair img,.body-hero-anatomy .g4-body-anatomy-pair svg.g2-body-model,.body-hero-anatomy .g4-body-anatomy-pair svg.g3-body-model')];return nodes.filter(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)>0&&r.width>0&&r.height>0;}).length>=2;},null,{timeout:6000});await shot(page,'07-body');
    await route(page,'coach');await page.locator('.garang-coach-v2.g4-coach-shell,.coach-app-shell.g4-coach-shell').first().waitFor({state:'visible',timeout:6000});await page.locator('.g2-composer-wrap,.coach-bottom-stack').first().waitFor({state:'visible',timeout:6000});await shot(page,'08-coach');
    await route(page,'progress');await page.locator('#garangAccumulationOverview').waitFor({state:'visible',timeout:6000});await shot(page,'09-history');
    await route(page,'settings');await page.locator('#savePreferences').waitFor({state:'visible',timeout:6000});await shot(page,'10-settings');
    await route(page,'today');const nav=page.locator('#bottomNav');await nav.waitFor({state:'visible',timeout:5000});await nav.screenshot({path:path.join(outputDir,'11-bottom-navigation.png')});
    const files=fs.readdirSync(outputDir).filter(file=>file.endsWith('.png'));if(files.length!==11)throw new Error(`expected 11 review screenshots, got ${files.length}`);await context.close();console.log(`Presentation v4 review screenshots saved to ${outputDir}`);
  }finally{if(browser)await browser.close().catch(()=>{});await server.close();}
})().catch(error=>{console.error(error);process.exit(1);});
