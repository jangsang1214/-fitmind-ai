'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8799;
const baseURL=`http://127.0.0.1:${port}`;

async function waitServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{const response=await fetch(baseURL);if(response.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,160));
  }
  throw new Error('Founder Golden Master board preview server did not start');
}
function state(){
  const now=new Date(),iso=now.toISOString(),date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  return {
    meta:{schemaVersion:5,updatedAt:iso,dailyPlanDrafts:{}},
    profile:{name:'Founder',age:29,height:176,weight:73,gender:'male',goal:'퍼포먼스 향상',calorieTarget:2260,proteinTarget:160,carbTarget:260,fatTarget:70},
    onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',equipmentProfile:'full_gym',weeklyFrequency:4,availableMinutes:55},
    preferences:{language:'ko',unit:'metric'},settings:{},privacy:{consent:{analytics:false}},
    planner:[{id:'board-plan',date,time:'18:00',type:'workout',title:'Upper Body',completed:false,source:'ai',createdAt:iso}],
    workouts:[{id:'board-workout',date,name:'Bench Press',sets:4,reps:8,weight:70,rpe:7,duration:45,createdAt:iso}],
    meals:[{id:'board-meal',date,time:'12:30',name:'Chicken Rice Bowl',kcal:620,protein:46,carbs:78,fat:14,items:[],createdAt:iso}],
    runs:[],body:[],
    checkins:[{id:'board-checkin',date,sleep:7.4,energy:4,stress:2,soreness:2,createdAt:iso}],dailyCheckins:[],
    physiologicalSignals:[{id:'hrv',metric:'hrv_ms',value:68,date,at:iso},{id:'rhr',metric:'resting_heart_rate_bpm',value:52,date,at:iso}],
    aiChat:[{id:'coach',role:'assistant',content:'오늘 회복 상태는 안정적입니다. 계획된 상체 운동을 진행하고 첫 세트 감각으로 강도를 조절하세요.',createdAt:iso}],
    actionLog:[],errors:[],memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},analytics:{events:[]},foodIdentity:{barcodes:[],misses:[],corrections:[]},plan:'FREE'
  };
}
async function tap(page,selector){
  const loc=page.locator(selector);await loc.waitFor({state:'visible',timeout:7000});await loc.scrollIntoViewIfNeeded();
  const box=await loc.boundingBox();assert.ok(box,`${selector} needs a touch box`);
  const hit=await loc.evaluate(el=>{const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!h&&(h===el||el.contains(h));});
  assert.equal(hit,true,`${selector} must own its touch center`);
  await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
}
async function surface(page,name){
  await tap(page,`#garangGoldenBoardNav [data-gmb-nav="${name}"]`);
  await page.waitForFunction(value=>document.getElementById('main')?.dataset?.goldenBoardSurface===value,name,{timeout:6000});
}
(async()=>{
  const server=startStaticServer(serveRoot,port);let browser;
  try{
    await waitServer();browser=await webkit.launch({headless:true});
    for(const width of [320,360,390,430]){
      const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
      await installAuthenticatedFirebaseMock(context);
      await context.addInitScript(payload=>localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload)),state());
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.message||e)));
      await page.goto(baseURL,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
      await page.waitForFunction(()=>window.GarangGoldenMasterBoardV1?.version==='garang-golden-master-board-v1.0.0',null,{timeout:10000});
      await page.waitForFunction(()=>document.querySelector('#garangGoldenBoard .gmb-home'),null,{timeout:10000});
      assert.equal(await page.locator('#bottomNav[data-gmb-canonical="hidden"]').count(),1,'canonical nav must stay hidden behind the board');
      assert.equal(await page.locator('#garangGoldenBoardNav [data-gmb-nav]').count(),5,'Founder board must expose exactly five primary tabs');
      assert.equal(await page.locator('.gmb-recovery-hero').isVisible(),true,'Home must expose the green Recovery hero');
      assert.equal(await page.locator('.gmb-home-card').count(),3,'Home must expose separate Sleep / Training / Nutrition cards');
      const light=await page.evaluate(()=>{const rgb=getComputedStyle(document.body).backgroundColor.match(/\d+/g)?.map(Number)||[];return rgb.slice(0,3);});
      assert.ok(light.length===3&&light.every(x=>x>220),`Founder board must use a light canvas at ${width}px: ${light}`);

      await surface(page,'recovery');
      assert.equal(await page.locator('.gmb-recovery .gmb-segments button').count(),3,'Recovery must expose Today / Trends / Insights');
      assert.equal(await page.locator('.gmb-recovery .gmb-metric-grid article').count(),3,'Recovery must expose HRV / Resting HR / Sleep cards');
      assert.equal(await page.locator('.gmb-recovery-main .gmb-recovery-arc').isVisible(),true,'Recovery semi-ring must be visible');

      await surface(page,'training');
      assert.equal(await page.locator('.gmb-training-date').isVisible(),true,'Training date controls must be visible');
      assert.equal(await page.locator('.gmb-workout-hero').isVisible(),true,'Training workout hero must be visible');
      assert.equal(await page.locator('.gmb-workout-hero [data-gmb-start]').isVisible(),true,'Training START WORKOUT must be visible on the hero');
      assert.ok(await page.locator('.gmb-exercise-row').count()>=3,'Training must expose exercise thumbnail rows');

      await surface(page,'nutrition');
      assert.equal(await page.locator('.gmb-nutrition .gmb-segments button').count(),3,'Nutrition must expose Today / Analysis / History');
      assert.equal(await page.locator('.gmb-calorie-ring').isVisible(),true,'Nutrition calorie ring must be visible');
      assert.equal(await page.locator('.gmb-macro-card').count(),3,'Nutrition must expose Protein / Carbs / Fat cards');
      assert.ok(await page.locator('.gmb-meal-row,.gmb-meal-empty').count()>=1,'Nutrition must expose today meal evidence');

      await surface(page,'coach');
      assert.equal(await page.locator('.gmb-coach-message').isVisible(),true,'Coach must open as a native chat surface');
      assert.equal(await page.locator('.gmb-prompt-grid button').count(),4,'Coach must expose four quick prompts');
      assert.equal(await page.locator('.gmb-composer input').isVisible(),true,'Coach composer must stay visible');

      const geometry=await page.evaluate(()=>({viewport:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,nav:[...document.querySelectorAll('#garangGoldenBoardNav [data-gmb-nav]')].map(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height};})}));
      assert.ok(geometry.doc<=geometry.viewport+2&&geometry.body<=geometry.viewport+2,`Golden Board must not overflow at ${width}px: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.nav.length===5&&geometry.nav.every(box=>box.w>=44&&box.h>=44),`Golden Board navigation must remain touch safe at ${width}px: ${JSON.stringify(geometry.nav)}`);
      assert.equal(errors.length,0,`Golden Board must not introduce page errors at ${width}px: ${errors.join('\n')}`);
      await context.close();
    }
    console.log('browser-founder-approved-polish Golden Master board 320/360/390/430: PASS');
  }finally{
    if(browser)await browser.close().catch(()=>{});
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exit(1);});