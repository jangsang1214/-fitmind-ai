'use strict';
const path=require('node:path');
const {webkit}=require('playwright');
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8796;
const baseURL=`http://127.0.0.1:${port}`;
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms));

async function heartbeat(page,label){
  await Promise.race([
    page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(()=>resolve(true),35)))),
    timeout(2200,`${label}: WebKit main thread stopped responding`)
  ]);
}
async function center(page,selector){
  const loc=page.locator(selector);
  await loc.waitFor({state:'visible',timeout:7000});
  await loc.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));
  await page.waitForTimeout(35);
  return loc;
}
async function tap(page,selector,label=selector){
  const loc=await center(page,selector);
  const box=await loc.boundingBox();
  if(!box)throw new Error(`${label}: no touch box`);
  await Promise.race([
    page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2),
    timeout(3500,`${label}: physical tap did not settle`)
  ]);
  await heartbeat(page,label);
}
async function route(page,name){
  await tap(page,`#bottomNav [data-garang-primary-nav="1"][data-page="${name}"]`,`route ${name}`);
  await page.waitForFunction(route=>document.getElementById('main')?.dataset?.garangScreen===route,name,{timeout:5000});
}
async function tapRecordRoute(page,name){
  await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="log"]',`Record ${name} open`);
  await page.locator('[data-garang-record-sheet="1"]').waitFor({state:'visible',timeout:3000});
  await tap(page,`[data-garang-record-sheet="1"] [data-garang-record-route="${name}"]`,`Record ${name}`);
  await page.waitForFunction(route=>document.getElementById('main')?.dataset?.garangScreen===route,name,{timeout:5000});
}
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
      const current={
        meta:{schemaVersion:5,updatedAt:now},profile:{name:'Button Audit',age:23,height:174,weight:67,goal:'퍼포먼스 향상'},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',weeklyFrequency:4,availableMinutes:60,preferences:''},
        preferences:{language:'ko',unit:'metric'},
        checkins:[{id:'audit-checkin',date:today,sleep:7.2,energy:4,stress:2,soreness:2,createdAt:now}],
        planner:[{id:'audit-workout-plan',date:today,time:'18:00',type:'workout',title:'상체 45분',completed:false,source:'ai',createdAt:now}],
        workouts:[{id:'audit-prior-workout',date:yesterday,name:'Squat',sets:3,reps:8,weight:60,rpe:7,duration:45,createdAt:now}],
        meals:[],runs:[],body:[],aiChat:[],actionLog:[],errors:[],
        memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},analytics:{events:[{name:'coach_recommendation_shown',date:today,at:now,props:{screen:'coach',date:today}}]},plan:'FREE'
      };
      const backup=JSON.parse(JSON.stringify(current));
      backup.meta.updatedAt=new Date(Date.now()-3600000).toISOString();
      backup.workouts=[{id:'audit-w1',date:yesterday,name:'Squat',updatedAt:backup.meta.updatedAt}];
      backup.meals=[{id:'audit-m1',date:yesterday,name:'Meal',updatedAt:backup.meta.updatedAt,items:[]}];
      localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(current));
      localStorage.setItem('garang_state_recovery_backup_v1::garang_user_mock-user_v3::audit',JSON.stringify(backup));
    },{today:date(0),yesterday:date(-1)});

    const page=await context.newPage();
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
    await page.waitForFunction(()=>document.querySelector('.today-body-panel'),null,{timeout:10000});
    await page.waitForFunction(()=>window.GarangDataMigrationV2?.version==='v4.0.0',null,{timeout:7000});
    await heartbeat(page,'initial boot');

    // Mirror browser-mobile-button-audit exactly through the failing Workout draft action.
    const dailyWorkout=page.locator('.garang-daily-workout');
    await dailyWorkout.waitFor({state:'visible',timeout:10000});
    const routineGenerate=page.locator('.garang-daily-workout [data-daily-generate]');
    if(!(await routineGenerate.isVisible())){
      const nativeToggle=page.locator('.garang-daily-workout [data-daily-toggle]');
      const disclosureToggle=page.locator('.garang-daily-workout .gci-toggle');
      if(await nativeToggle.isVisible())await tap(page,'.garang-daily-workout [data-daily-toggle]','open routine recommendation');
      else if(await disclosureToggle.isVisible())await tap(page,'.garang-daily-workout .gci-toggle','open routine recommendation disclosure');
      else throw new Error('Today workout preparation has no visible disclosure owner');
    }
    await routineGenerate.waitFor({state:'visible',timeout:3000});
    await tap(page,'.garang-daily-workout [data-daily-generate]','generate routine');
    await page.locator('.garang-daily-workout [data-garang-workout-prep-start="1"]').waitFor({state:'visible',timeout:10000});

    await route(page,'coach');
    await tapRecordRoute(page,'workout');
    await tap(page,'[data-gws-step="exercise"]','Workout exercise + record');
    await page.locator('#startWorkoutSession').waitFor({state:'visible',timeout:7000});
    await tap(page,'#startWorkoutSession','canonical Workout session start');
    await page.waitForFunction(()=>document.getElementById('workoutExecutionState')?.textContent?.includes('LIVE')&&document.querySelector('.workout-session-bar')?.classList.contains('is-live'),null,{timeout:4000});
    await tap(page,'#finishWorkoutSession','canonical Workout session finish');
    await page.waitForFunction(()=>document.getElementById('workoutExecutionState')?.textContent==='준비',null,{timeout:4000});

    await page.evaluate(()=>window.GarangWorkoutIntelligenceUI?.queueImport?.([{name:'바벨 벤치프레스',sets:3,reps:8,weight:40,rpe:7,duration:15,body:67}],'button-audit'));
    await page.waitForFunction(()=>document.querySelectorAll('[data-execute-workout]').length===1,null,{timeout:7000});
    const record=page.locator('[data-execute-workout]');
    await record.waitFor({state:'visible',timeout:7000});
    await record.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));
    await page.waitForTimeout(35);

    const report=await record.evaluate(el=>{
      const rect=o=>{if(!o)return null;const r=o.getBoundingClientRect();return {x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)}};
      const describe=o=>{if(!o)return null;const s=getComputedStyle(o);return {tag:o.tagName,id:o.id||'',class:String(o.className||''),rect:rect(o),position:s.position,z:s.zIndex,pointer:s.pointerEvents,display:s.display,visibility:s.visibility,opacity:s.opacity,hidden:o.hidden===true,open:o.open===true}};
      const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
      const h=document.elementFromPoint(x,y);
      const candidates=[...document.querySelectorAll('body *')].filter(node=>{
        const s=getComputedStyle(node);if(s.display==='none'||s.visibility==='hidden'||s.pointerEvents==='none'||Number(s.opacity)===0)return false;
        const q=node.getBoundingClientRect();if(!q.width||!q.height)return false;
        const intersects=x>=q.left&&x<=q.right&&y>=q.top&&y<=q.bottom;
        return intersects&&(['fixed','sticky','absolute'].includes(s.position)||/backdrop|sheet|overlay|modal|toast|session|nav|topbar/i.test(String(node.className||'')+' '+String(node.id||'')));
      }).slice(0,30).map(describe);
      const visibleLayers=[...document.querySelectorAll('[class*="backdrop"],[class*="sheet"],[class*="overlay"],[class*="modal"],dialog,.toast')]
        .filter(node=>{const s=getComputedStyle(node),q=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0&&q.width>0&&q.height>0;})
        .map(describe);
      return {
        screen:document.getElementById('main')?.dataset?.garangScreen||'',
        viewport:{w:innerWidth,h:innerHeight,scrollX,scrollY},point:{x:+x.toFixed(1),y:+y.toFixed(1)},
        owned:!!h&&(h===el||el.contains(h)),owner:describe(h),target:describe(el),
        stack:document.elementsFromPoint(x,y).slice(0,20).map(describe),
        intersectingPositioned:candidates,visibleLayers,
        actions:describe(el.closest('.workout-draft-actions')),
        item:describe(el.closest('.list-item')),
        area:describe(document.getElementById('workoutDraftArea')),
        manage:describe(document.querySelector('.workout-draft-manage')),
        nav:describe(document.getElementById('bottomNav')),
        topbar:describe(document.querySelector('.topbar')),
        session:describe(document.querySelector('.workout-session-bar')),
        toast:describe(document.getElementById('toast')),
        activeNav:document.querySelector('#bottomNav [aria-current="page"]')?.dataset?.page||''
      };
    });
    console.log('WORKOUT_DRAFT_TOUCH_FULL_PATH '+JSON.stringify(report));
    await context.close();
  }finally{
    if(browser)await browser.close().catch(()=>{});
    await server.close();
  }
})().catch(error=>{console.error(error);process.exit(1);});
