'use strict';
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
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:serveRoot,stdio:'ignore'});let browser;
  try{
    await waitForServer();browser=await webkit.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},state());
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
    await page.locator('#menuBtn').click();
    const planner=page.locator('.garang-more-sheet [data-route="planner"]');await planner.waitFor({state:'visible',timeout:5000});await planner.click();
    await page.locator('#garangPlanExecution').waitFor({state:'visible',timeout:7000});
    const text=await page.locator('#garangPlanExecution').innerText();
    assert.match(text,/계획 수행/);assert.match(text,/이번 주/);assert.match(text,/칼로리/);assert.match(text,/단백질/);assert.match(text,/4주 누적/);
    const yesterday=localDate(-1);
    const dayButton=page.locator(`[data-gx-date="${yesterday}"]`);await dayButton.click();
    const detail=await page.locator('[data-gx-detail]').innerText();
    assert.match(detail,/근육 증가/);assert.match(detail,/벤치프레스/);assert.match(detail,/2,270/);assert.match(detail,/실제 기록으로 수행 확인/);
    const rings=await page.locator('.gx-score-pair .gx-ring strong').allTextContents();
    assert.equal(rings[0],'100%','explicit + workout evidence should execute both plans');
    assert.ok(rings[1].endsWith('%'),'goal alignment must be separate and numeric when targets are known');
    const bodyWidth=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
    assert.ok(bodyWidth.scroll<=bodyWidth.client+1,`execution preview must not cause page overflow: ${JSON.stringify(bodyWidth)}`);
    assert.deepEqual(errors,[],`plan execution browser errors:\n${errors.join('\n')}`);
    await context.close();console.log('browser-plan-execution WebKit mobile preview: PASS');
  }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
