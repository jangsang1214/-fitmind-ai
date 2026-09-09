'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8771,baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');
const localDate=(offset=0)=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('GARANG preview server did not start');}
function state(){
  const y=localDate(-1),t=localDate();
  return {
    meta:{schemaVersion:5,updatedAt:new Date().toISOString()},
    profile:{name:'Execution Preview',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},
    onboarding:{complete:true,skipped:false,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},
    planner:[
      {id:'p1',date:y,time:'08:00',type:'nutrition',title:'하루 식단',completed:true,source:'user'},
      {id:'p2',date:y,time:'18:00',type:'workout',title:'상체 50분',completed:false,source:'ai'},
      {id:'p3',date:t,time:'18:00',type:'workout',title:'하체 45분',completed:false,source:'ai'}
    ],
    workouts:[{id:'w1',sessionId:'session-y',date:y,name:'벤치프레스',sets:4,reps:8,weight:70,volume:2240,duration:25}],
    meals:[{id:'m1',date:y,name:'어제 식단',kcal:2270,protein:118,carbs:270,fat:65,items:[{id:'f1',name:'식단',grams:500,kcal:2270,protein:118,carbs:270,fat:65}]}],
    runs:[],body:[],checkins:[{id:'c1',date:y,sleep:7.5,energy:4,stress:2,soreness:2}],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'
  };
}
(async()=>{
  const server=startStaticServer(serveRoot,port);let browser;
  try{
    await waitForServer();browser=await webkit.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},state());
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
    await page.locator('#menuBtn').click();
    const planner=page.locator('.garang-more-sheet [data-route="planner"]');await planner.waitFor({state:'visible',timeout:5000});await planner.click();
    const section=page.locator('#garangPlanExecution');await section.waitFor({state:'visible',timeout:7000});

    const plannerHead=await page.evaluate(()=>{const head=document.querySelector('#main > .page-head');const title=head?.querySelector('h1'),kicker=head?.querySelector('.eyebrow');return {screen:document.getElementById('main')?.dataset?.garangScreen||'',title: title?.textContent?.trim()||'',titleDisplay:title?getComputedStyle(title).display:'missing',kicker:kicker?.textContent?.trim()||''};});
    assert.equal(plannerHead.screen,'planner','Planner must keep the canonical screen identity');
    assert.equal(plannerHead.title,'Planner','legacy page title may remain in markup for owner compatibility');
    assert.equal(plannerHead.titleDisplay,'none','large Planner page title must stay visually removed');
    assert.match(plannerHead.kicker,/PLANNER/,'small Planner kicker must remain visible');

    const summary=await section.innerText();
    assert.match(summary,/계획 실행/);assert.doesNotMatch(summary,/누적\./,'Planner must not expose the accumulation surface label');assert.match(summary,/이번 주|계획한 흐름/);assert.match(summary,/벤치프레스/);assert.match(summary,/2,270 kcal/);assert.match(summary,/118g/);assert.match(summary,/수면 7\.5h/);assert.match(summary,/GARANG INSIGHT/);
    assert.doesNotMatch(summary,/판단 신뢰도/,'deep confidence must stay hidden in the default summary');
    assert.doesNotMatch(summary,/4주 누적/,'4-week analytics must stay behind the detail control');
    assert.equal(await page.locator('.gx-score-pair').count(),0,'legacy circular score pair must not return');
    assert.equal(await page.locator('.gx-ring').count(),0,'legacy circular gauges must not return');

    const drop=section.locator('[data-gx-details]');
    const dropBox=await drop.boundingBox();assert.ok(dropBox&&dropBox.width>=40&&dropBox.height>=44,'droplet detail control must keep a touch-safe hit target');
    assert.equal(await drop.getAttribute('aria-expanded'),'false');
    await drop.click();
    const sheet=section.locator('[data-gx-sheet]');await sheet.waitFor({state:'visible',timeout:3000});
    assert.equal(await drop.getAttribute('aria-expanded'),'true');
    const detail=await sheet.innerText();
    assert.match(detail,/계획 수행 근거/);assert.match(detail,/목표 적합도/);assert.match(detail,/판단 신뢰도/);assert.match(detail,/2,270 kcal/);assert.match(detail,/118g/);assert.match(detail,/실제 기록으로 수행 확인/);assert.match(detail,/4주 누적/);
    const bodyLock=await page.evaluate(()=>{const style=getComputedStyle(document.body);return {classLocked:document.body.classList.contains('gx-sheet-open'),overflow:style.overflow,overflowY:style.overflowY};});
    assert.equal(bodyLock.classLocked,true,'detail sheet must mark body as scroll locked');
    assert.equal(bodyLock.overflowY,'hidden',`detail sheet must lock vertical body scrolling: ${JSON.stringify(bodyLock)}`);
    await page.keyboard.press('Escape');await sheet.waitFor({state:'hidden',timeout:3000});assert.equal(await drop.getAttribute('aria-expanded'),'false');

    const yesterday=localDate(-1),dayButton=section.locator(`[data-gx-date="${yesterday}"]`);assert.equal(await dayButton.getAttribute('aria-selected'),'true','yesterday with activity should be selected by default');
    const bodyWidth=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
    assert.ok(bodyWidth.scroll<=bodyWidth.client+1,`execution preview must not cause page overflow: ${JSON.stringify(bodyWidth)}`);
    assert.deepEqual(errors,[],`plan execution browser errors:\n${errors.join('\n')}`);
    await context.close();console.log('browser-plan-execution minimal+droplet WebKit mobile: PASS');
  }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
