'use strict';
const path=require('node:path');
const {webkit}=require('playwright');
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8796;
const baseURL=`http://127.0.0.1:${port}`;

function date(offset=0){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

(async()=>{
  const server=startStaticServer(serveRoot,port);
  let browser;
  try{
    browser=await webkit.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});
    await installAuthenticatedFirebaseMock(context);
    await context.addInitScript(({today,yesterday})=>{
      try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});}catch{}
      const now=new Date().toISOString();
      localStorage.setItem('garang_user_mock-user_v3',JSON.stringify({
        meta:{schemaVersion:5,updatedAt:now},profile:{name:'Touch Diagnostic',age:23,height:174,weight:67,goal:'퍼포먼스 향상'},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',weeklyFrequency:4,availableMinutes:60,preferences:''},
        preferences:{language:'ko',unit:'metric'},settings:{},privacy:{consent:{analytics:false}},
        checkins:[{id:'diag-checkin',date:today,sleep:7.2,energy:4,stress:2,soreness:2,createdAt:now}],planner:[],
        workouts:[{id:'diag-prior',date:yesterday,name:'Squat',sets:3,reps:8,weight:60,rpe:7,duration:45,createdAt:now}],
        meals:[],runs:[],body:[],physiologicalSignals:[],aiChat:[],actionLog:[],errors:[],
        memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},foodIdentity:{barcodes:[],misses:[],corrections:[]},analytics:{events:[]},plan:'FREE'
      }));
    },{today:date(0),yesterday:date(-1)});
    const page=await context.newPage();
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
    await page.waitForFunction(()=>window.GarangRouter&&window.GarangWorkoutIntelligenceUI,null,{timeout:10000});
    await page.evaluate(()=>window.GarangRouter.navigate('workout',{source:'touch-diagnostic',force:true}));
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='workout',null,{timeout:6000});
    const exercise=page.locator('[data-gws-step="exercise"]');
    await exercise.waitFor({state:'visible',timeout:6000});
    await exercise.click();
    await page.locator('#startWorkoutSession').waitFor({state:'visible',timeout:6000});
    await page.evaluate(()=>document.getElementById('startWorkoutSession')?.click());
    await page.waitForFunction(()=>document.querySelector('.workout-session-bar')?.classList.contains('is-live'),null,{timeout:4000});
    await page.evaluate(()=>document.getElementById('finishWorkoutSession')?.click());
    await page.waitForFunction(()=>document.getElementById('workoutExecutionState')?.textContent==='준비',null,{timeout:4000});
    await page.evaluate(()=>window.GarangWorkoutIntelligenceUI.queueImport([{name:'바벨 벤치프레스',sets:3,reps:8,weight:40,rpe:7,duration:15,body:67}],'touch-diagnostic'));
    const record=page.locator('[data-execute-workout="0"]');
    await record.waitFor({state:'visible',timeout:7000});
    await record.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));
    await page.waitForTimeout(60);
    const report=await record.evaluate(el=>{
      const rect=o=>{if(!o)return null;const r=o.getBoundingClientRect();return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)}};
      const describe=o=>{if(!o)return null;const s=getComputedStyle(o);return {tag:o.tagName,id:o.id||'',class:String(o.className||''),rect:rect(o),position:s.position,z:s.zIndex,pointer:s.pointerEvents,display:s.display,visibility:s.visibility,opacity:s.opacity}};
      const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
      return {
        viewport:{w:innerWidth,h:innerHeight,scrollX,scrollY},point:{x:+x.toFixed(1),y:+y.toFixed(1)},target:describe(el),
        owned:(()=>{const h=document.elementFromPoint(x,y);return !!h&&(h===el||el.contains(h));})(),
        stack:document.elementsFromPoint(x,y).slice(0,12).map(describe),
        actions:describe(el.closest('.workout-draft-actions')),
        item:describe(el.closest('.list-item')),
        area:describe(document.getElementById('workoutDraftArea')),
        manage:describe(document.querySelector('.workout-draft-manage')),
        nav:describe(document.getElementById('bottomNav')),
        session:describe(document.querySelector('.workout-session-bar'))
      };
    });
    console.log('WORKOUT_DRAFT_TOUCH_DIAGNOSTIC '+JSON.stringify(report));
    await context.close();
  }finally{
    if(browser)await browser.close().catch(()=>{});
    await server.close();
  }
})().catch(error=>{console.error(error);process.exit(1);});
