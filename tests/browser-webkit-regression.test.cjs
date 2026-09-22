'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8768,baseURL=`http://127.0.0.1:${port}`;

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{const r=await fetch(baseURL);if(r.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  throw new Error('WebKit GARANG server did not start');
}

async function tap(page,selector){
  const loc=page.locator(selector);
  await loc.waitFor({state:'visible',timeout:7000});
  const box=await loc.boundingBox();
  assert.ok(box,`${selector} must have touch box`);
  const hit=await loc.evaluate(el=>{
    const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,h=document.elementFromPoint(x,y);
    return !!h&&(h===el||el.contains(h));
  });
  assert.equal(hit,true,`${selector} must own hit point`);
  // Locator.tap preserves real touch semantics while waiting for the target to be stable
  // between hit-testing and dispatch. Raw coordinate taps can race lifecycle-driven layout.
  await loc.tap({timeout:7000});
}

async function tapRecordRoute(page,route){
  await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="log"]');
  const sheet=page.locator('[data-garang-record-sheet="1"]');
  await sheet.waitFor({state:'visible',timeout:3000});
  await tap(page,`[data-garang-record-sheet="1"] [data-garang-record-route="${route}"]`);
  await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,route,{timeout:10000});
  assert.equal(await page.locator('#bottomNav [data-garang-primary-nav="1"][data-page="log"]').getAttribute('aria-current'),'page',`${route} must remain owned by Record`);
}

async function tapVisibleBackdrop(page){
  const loc=page.locator('.g2-sidebar-backdrop');
  await loc.waitFor({state:'visible',timeout:7000});
  const point=await loc.evaluate(el=>{
    const r=el.getBoundingClientRect();
    const minX=Math.max(4,Math.floor(r.left)+4);
    const maxX=Math.min(window.innerWidth-4,Math.ceil(r.right)-4);
    const minY=Math.max(4,Math.floor(r.top)+4);
    const maxY=Math.min(window.innerHeight-70,Math.ceil(r.bottom)-4);
    for(let x=maxX;x>=minX;x-=12){
      for(let y=minY;y<=maxY;y+=24){
        const h=document.elementFromPoint(x,y);
        if(h&&(h===el||el.contains(h)))return {x,y};
      }
    }
    return null;
  });
  assert.ok(point,'.g2-sidebar-backdrop must expose a tappable point outside the open sidebar');
  await page.touchscreen.tap(point.x,point.y);
}

async function waitForSidebarClosed(page){
  await page.waitForFunction(()=>{
    const root=document.querySelector('.garang-coach-v2');
    const sidebar=root?.querySelector('.g2-chat-sidebar');
    if(!root||!sidebar||root.classList.contains('sidebar-open'))return false;
    const r=sidebar.getBoundingClientRect();
    return r.right<=1;
  },{timeout:1500});
}

async function assertCoachSettles(page){
  await page.waitForFunction(()=>document.querySelector('.garang-coach-v2 .g2-chat-head'),{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('.garang-decision-toggle'),{timeout:10000});
  await page.waitForTimeout(250);

  const idleMutations=await page.evaluate(()=>new Promise(resolve=>{
    let childListMutations=0;
    const target=document.getElementById('main');
    const observer=new MutationObserver(records=>{
      childListMutations+=records.filter(record=>record.type==='childList').length;
    });
    observer.observe(target,{childList:true,subtree:true});
    setTimeout(()=>{
      observer.disconnect();
      resolve(childListMutations);
    },400);
  }));
  assert.ok(
    idleMutations<=4,
    `Coach shell must settle instead of self-triggering MutationObserver writes; childList mutations=${idleMutations}`
  );

  await tap(page,'.garang-decision-toggle');
  await page.waitForFunction(()=>document.querySelector('.garang-decision-card')?.dataset.expanded==='true');
  await tap(page,'.garang-decision-toggle');
  await page.waitForFunction(()=>document.querySelector('.garang-decision-card')?.dataset.expanded==='false');

  await tap(page,'.g2-mobile-threads');
  await page.waitForFunction(()=>document.querySelector('.garang-coach-v2')?.classList.contains('sidebar-open'));
  await tapVisibleBackdrop(page);
  await page.waitForFunction(()=>!document.querySelector('.garang-coach-v2')?.classList.contains('sidebar-open'));
  await waitForSidebarClosed(page);

  await tap(page,'.g2-head-new');
  await page.waitForTimeout(80);

  const hitState=await page.evaluate(()=>{
    const selectors=['.g2-mobile-threads','.g2-head-new','.garang-decision-toggle','#bottomNav [data-garang-primary-nav="1"][data-page="today"]'];
    return selectors.map(selector=>{
      const el=document.querySelector(selector);
      if(!el)return {selector,hit:false};
      const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return {selector,hit:!!h&&(h===el||el.contains(h))};
    });
  });
  assert.ok(hitState.every(item=>item.hit),`Coach controls must remain hit-testable after repeated touches: ${JSON.stringify(hitState)}`);
}

(async()=>{
  const server=startStaticServer(serveRoot,port);
  let browser;
  try{
    await waitForServer();
    browser=await webkit.launch({headless:true});
    const context=await browser.newContext({
      viewport:{width:390,height:844},
      isMobile:true,
      hasTouch:true,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
    });
    await installAuthenticatedFirebaseMock(context);
    await context.addInitScript(()=>{
      try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});}catch{}

      localStorage.setItem('garang_user_mock-user_v3',JSON.stringify({
        meta:{schemaVersion:5,updatedAt:'2026-09-06T00:00:00Z'},
        profile:{name:'WebKit',weight:70},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},
        preferences:{language:'ko',unit:'metric'},
        workouts:[null,{id:'w1',date:'2026-09-06',name:'Squat',sets:3,reps:6,weight:50,rpe:7,duration:30,setDetails:[{set:1,weight:50,reps:6,rpe:7},{set:2,weight:50,reps:6,rpe:7},{set:3,weight:50,reps:6,rpe:7}]}],
        meals:[null,{id:'m1',date:'2026-09-06',name:'Meal',items:[null,{id:'f1',name:'Egg',grams:100,kcal:150,protein:13,carbs:1,fat:10}]}],
        runs:[],body:[],planner:[],checkins:[],aiChat:[],actionLog:[],errors:[],
        memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},
        analytics:{events:[]},plan:'FREE'
      }));
    });

    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));

    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
    await page.locator('#garangTodayFlow').waitFor({state:'visible',timeout:10000});
    await page.waitForFunction(()=>document.querySelector('.today-body-panel'),{timeout:10000});

    const layout=await page.evaluate(()=>{
      const main=document.getElementById('main'),s=getComputedStyle(main),top=document.querySelector('.topbar'),menu=document.getElementById('menuBtn'),record=document.querySelector('#bottomNav [data-garang-primary-nav="1"][data-page="log"]'),hero=document.querySelector('.visual-today-hero'),flow=document.querySelector('#garangTodayFlow'),
        tr=top?.getBoundingClientRect(),mr=menu?.getBoundingClientRect(),rr=record?.getBoundingClientRect(),menuHit=mr?document.elementFromPoint(mr.left+mr.width/2,mr.top+mr.height/2):null,recordHit=rr?document.elementFromPoint(rr.left+rr.width/2,rr.top+rr.height/2):null;
      return {
        x:s.overflowX,y:s.overflowY,max:s.maxHeight,
        cMode:main?.dataset?.gtfC||'',flowVisible:!!flow&&getComputedStyle(flow).display!=='none',bodyHeroHidden:!!hero&&getComputedStyle(hero).display==='none',
        quickHidden:!!document.querySelector('.quick-visual-grid')&&getComputedStyle(document.querySelector('.quick-visual-grid')).display==='none',
        primaryCount:document.querySelectorAll('#bottomNav [data-garang-primary-nav="1"]').length,
        top:{top:tr?.top,bottom:tr?.bottom,height:tr?.height},
        menu:{display:menu?getComputedStyle(menu).display:'none',height:mr?.height,hit:!!menuHit&&(menuHit===menu||menu?.contains(menuHit))},
        record:{height:rr?.height||0,hit:!!recordHit&&(recordHit===record||record?.contains(recordHit))}
      };
    });
    assert.equal(layout.x,'visible');
    assert.equal(layout.y,'visible');
    assert.equal(layout.max,'none');
    assert.equal(layout.cMode,'1','WebKit Today must use C direction');
    assert.equal(layout.flowVisible,true,'decision-first C surface must be visible');
    assert.equal(layout.bodyHeroHidden,true,'body anatomy must not be the default WebKit hero');
    assert.equal(layout.quickHidden,true,'Today duplicate quick-record grid must stay internalized on WebKit');
    assert.equal(layout.primaryCount,4,'WebKit must expose exactly four primary navigation axes');
    assert.ok(layout.record.height>=44&&layout.record.hit,'Record must replace the hidden quick cards as a real touch target');
    assert.ok(layout.top.height>=50&&layout.top.bottom>0,'physical-iOS topbar must remain on screen');
    assert.notEqual(layout.menu.display,'none');
    assert.ok(layout.menu.height>=30&&layout.menu.hit,'hamburger must own its hit point');
    assert.equal(await page.locator('[data-today-view="front"]:visible').count(),0,'FRONT control must stay internalized unless body evidence is relevant');
    assert.equal(await page.locator('[data-today-view="back"]:visible').count(),0,'BACK control must stay internalized unless body evidence is relevant');

    await page.evaluate(()=>window.scrollTo({top:Math.max(0,document.documentElement.scrollHeight-window.innerHeight),behavior:'auto'}));
    await page.waitForTimeout(80);
    const scrolled=await page.evaluate(()=>{
      const top=document.querySelector('.topbar')?.getBoundingClientRect(),menu=document.getElementById('menuBtn'),mr=menu?.getBoundingClientRect(),record=document.querySelector('#bottomNav [data-garang-primary-nav="1"][data-page="log"]'),rr=record?.getBoundingClientRect(),
        mh=mr?document.elementFromPoint(mr.left+mr.width/2,mr.top+mr.height/2):null,rh=rr?document.elementFromPoint(rr.left+rr.width/2,rr.top+rr.height/2):null;
      return {
        topVisible:!!top&&top.bottom>0&&top.top>=-1,
        menuHit:!!mh&&(mh===menu||menu?.contains(mh)),
        recordHit:!!rh&&(rh===record||record?.contains(rh)),
        scrollY:window.scrollY
      };
    });
    assert.ok(scrolled.scrollY>0,'test must exercise the long Today scroll seen on physical iPhone');
    assert.ok(scrolled.topVisible,'sticky topbar must survive Today scroll');
    assert.ok(scrolled.menuHit,'hamburger must stay tappable after Today scroll');
    assert.ok(scrolled.recordHit,'Record must stay tappable after Today scroll');

    await tap(page,'#menuBtn');
    await page.locator('.garang-more-sheet').waitFor({state:'visible'});
    assert.equal(await page.locator('.garang-more-sheet [data-route="running"]').isHidden(),true,'duplicate Running entry must stay hidden from More');
    assert.equal(await page.locator('.garang-more-sheet [data-route="planner"]').isHidden(),true,'Planner capability must stay internalized instead of exposing a competing first-level touch target');
    assert.equal(await page.locator('.garang-more-sheet [data-route="memory"]').isHidden(),true,'Memory capability must stay internalized instead of exposing a competing first-level touch target');
    await tap(page,'.garang-more-head button');
    await page.locator('.garang-more-sheet').waitFor({state:'detached',timeout:3000});

    await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="coach"]');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='coach',{timeout:5000});
    await assertCoachSettles(page);

    await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="today"]');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:5000});
    await page.locator('#garangTodayFlow').waitFor({state:'visible',timeout:5000});
    assert.equal(await page.locator('.visual-today-hero').isHidden(),true,'returning to Today must preserve the no-body C hero');
    await tapRecordRoute(page,'workout');
    await tap(page,'[data-gws-step="log"]');
    await page.locator('.workout-execution-v2 .workout-session-bar').waitFor({state:'visible',timeout:5000});
    const executionChrome=await page.evaluate(()=>{const bar=document.querySelector('.workout-session-bar')?.getBoundingClientRect(),top=document.querySelector('.topbar')?.getBoundingClientRect();return {barTop:bar?.top||0,topBottom:top?.bottom||0};});
    assert.ok(executionChrome.barTop>=executionChrome.topBottom-1,`sticky workout session bar must clear the fixed mobile header: ${JSON.stringify(executionChrome)}`);
    assert.equal(await page.locator('.gws-panel:not([hidden]) .workout-set-table-head').first().isVisible(),true,'workout execution must expose set-first table hierarchy');
    assert.equal(await page.locator('.gws-panel:not([hidden]) #workoutSetDetails').first().isVisible(),true,'per-set execution rows must be visible by default');
    assert.equal(await page.locator('#workoutSetDetails .current-set').count(),1,'exactly one unfinished set must own the current execution state');
    assert.equal(await page.locator('#workoutSetDetails .upcoming-set').count(),2,'remaining unfinished sets must be visually distinct from the current set');
    assert.equal(await page.locator('#saveWorkoutSession').evaluate(node=>node.parentElement?.classList.contains('workout-session-bar')),true,'Finish must live in the top-level live session bar');
    assert.equal(await page.locator('.gws-panel:not([hidden]) .workout-set-table-head').count(),1,'active workout Log must own exactly one set-table header');
    assert.match(await page.locator('.gws-panel:not([hidden]) .workout-set-table-head').innerText(),/SET\s+PREVIOUS\s+KG\s+REPS\s+RPE\s+✓/,'set-first table must expose the commercial execution hierarchy');
    assert.equal(await page.locator('#wDuration').isVisible(),true,'workout duration must remain editable on the execution surface');
    await tap(page,'[data-gws-reuse-latest]');
    await page.waitForFunction(()=>document.querySelector('#workoutSetDetails [data-set-weight]')?.value==='50'&&document.querySelector('#workoutSetDetails [data-set-reps]')?.value==='6',{timeout:3000});
    assert.equal(await page.locator('#wDuration').inputValue(),'30','recent workout reuse must preserve duration');
    assert.deepEqual(await page.locator('#workoutSetDetails [data-set-weight]').evaluateAll(nodes=>nodes.map(node=>node.value)),['50','50','50'],'recent workout reuse must populate all visible set weights');
    assert.deepEqual(await page.locator('#workoutSetDetails [data-set-rpe]').evaluateAll(nodes=>nodes.map(node=>node.value)),['7','7','7'],'recent workout reuse must populate all visible set RPE values');
    await page.locator('#wSets').fill('5');
    await page.waitForFunction(()=>document.querySelectorAll('#workoutSetDetails [data-set-row]').length===5,{timeout:3000});
    assert.equal(await page.locator('#workoutSetDetails [data-set-row]').count(),5,'visible execution rows must stay synchronized with the set count');
    await tap(page,'#addWorkout');
    assert.equal(await page.evaluate(()=>window.GarangWorkoutExecutionBridge?.draftSummary()?.sets||0),0,'zero completed sets must not be serialized into the workout draft');
    assert.equal(await page.locator('#workoutExecutionElapsed').textContent(),'00:00','rejected Add must not start or contaminate live session elapsed time');
    await tap(page,'.gws-panel:not([hidden]) [data-execution-set-complete]');
    await page.locator('#workoutExecutionRest').waitFor({state:'visible',timeout:3000});
    assert.equal(await page.locator('.gws-panel:not([hidden]) [data-execution-set-complete]').first().textContent(),'✓','set completion must have an immediate visual state');
    assert.equal(await page.locator('#workoutSetDetails .completed').count(),1,'completed set must have an explicit completed state');
    assert.equal(await page.locator('#workoutSetDetails .current-set').count(),1,'completion must advance exactly one current set');
    assert.match(await page.locator('#workoutExecutionElapsed').textContent(),/^\\d{2}:\\d{2}$/,'live session timer must be visible');
    await tap(page,'#skipWorkoutRest');
    await page.locator('.gws-panel:not([hidden]) [data-execution-set-complete]').nth(1).click();
    await page.locator('#workoutExecutionRest').waitFor({state:'visible',timeout:3000});
    await tap(page,'#skipWorkoutRest');
    await page.locator('#wSets').fill('6');
    await page.waitForFunction(()=>document.querySelectorAll('#workoutSetDetails [data-set-row]').length===6,{timeout:3000});
    assert.equal(await page.locator('#workoutSetDetails [data-execution-set-complete].is-complete').count(),2,'increasing set count must preserve completed set state');
    await page.locator('#wSets').fill('5');
    await page.waitForFunction(()=>document.querySelectorAll('#workoutSetDetails [data-set-row]').length===5,{timeout:3000});
    assert.equal(await page.locator('#workoutSetDetails [data-execution-set-complete].is-complete').count(),2,'decreasing set count must preserve surviving completed sets');
    await tap(page,'#addWorkout');
    await page.waitForFunction(()=>window.GarangWorkoutExecutionBridge?.draftSummary()?.sets===2,{timeout:3000});
    assert.equal(await page.evaluate(()=>window.GarangWorkoutExecutionBridge?.draftSummary()?.sets||0),2,'only completed execution sets must be serialized into the workout draft');
    await tap(page,'[data-edit-workout="0"]');
    await page.waitForFunction(()=>document.querySelectorAll('#workoutSetDetails [data-execution-set-complete].is-complete').length===2,{timeout:3000});
    assert.equal(await page.locator('#workoutSetDetails [data-execution-set-complete].is-complete').count(),2,'draft edit must reopen previously completed sets as completed');
    assert.equal(await page.locator('#wSets').inputValue(),'2','draft edit must preserve the accepted completed-set count across render');
    assert.equal(await page.locator('#wDuration').inputValue(),'30','draft edit must preserve workout duration across render');
    await page.locator('#wName').fill('Squat');await page.locator('#wName').dispatchEvent('change');
    await page.waitForFunction(()=>document.querySelectorAll('#workoutSetDetails [data-execution-set-complete]').length===2&&document.querySelectorAll('#workoutSetDetails [data-execution-set-complete].is-complete').length===0,{timeout:3000});
    assert.equal(await page.locator('#workoutSetDetails .current-set').count(),1,'changing exercise must reset completion state and establish a fresh current set');
    await page.locator('#wName').fill('바벨 벤치프레스');await page.locator('#wName').dispatchEvent('change');
    await page.waitForFunction(()=>document.querySelectorAll('#workoutSetDetails [data-execution-set-complete]').length===2,{timeout:3000});
    await page.locator('#workoutSetDetails [data-set-reps]').first().fill('9');
    for(let i=0;i<2;i++){await page.locator('#workoutSetDetails [data-execution-set-complete]').nth(i).click();await tap(page,'#skipWorkoutRest');}
    await tap(page,'#addWorkout');
    await page.waitForFunction(()=>window.GarangWorkoutExecutionBridge?.draftSummary()?.sets===2,{timeout:3000});
    assert.equal(await page.evaluate(()=>window.GarangWorkoutExecutionBridge?.draftSummary()?.sets||0),2,'draft edit must re-add without forcing completed sets to be checked again');
    await tap(page,'#clearWorkoutDraft');
    await page.waitForFunction(()=>window.GarangWorkoutExecutionBridge?.draftSummary()?.sets===0,{timeout:3000});
    assert.equal(await page.locator('#workoutExecutionElapsed').textContent(),'00:00','session reset must clear live elapsed time');
    assert.equal(await page.locator('#workoutExecutionRest').isHidden(),true,'session reset must clear the rest state');
    assert.equal(await page.locator('#workoutSetDetails [data-execution-set-complete].is-complete').count(),0,'session reset must not restore stale completed rows');
    assert.equal(await page.locator('#workoutSetDetails .current-set').count(),1,'session reset must return execution to one fresh current set');
    const importExerciseName=await page.locator('#wName').inputValue();
    await page.evaluate(name=>window.GarangWorkoutIntelligenceUI?.queueImport?.([{name,sets:3,reps:8,weight:60,rpe:7,duration:15,body:70}],'browser_regression'),importExerciseName);
    await page.waitForFunction(()=>window.GarangWorkoutExecutionBridge?.draftSummary()?.sets===3,{timeout:5000});
    assert.deepEqual(await page.evaluate(()=>window.GarangWorkoutExecutionBridge?.draftSummary()),{exercises:1,sets:3,volume:1440,unit:'kg'},'programmatic Daily Workout-style import must remain compatible with execution mode');
    await tapRecordRoute(page,'body');
    await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="progress"]');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='progress',{timeout:5000});
    await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="coach"]');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='coach',{timeout:5000});
    await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="today"]');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:5000});

    const finalState=await page.evaluate(()=>({
      screen:document.getElementById('main')?.dataset?.garangScreen||'',
      bottom:[...document.querySelectorAll('#bottomNav [data-garang-primary-nav="1"]')].map(b=>({page:b.dataset.page,hit:(()=>{const r=b.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!h&&(h===b||b.contains(h));})()})),
      bodyOverflow:getComputedStyle(document.body).overflowY,
      appOverflow:getComputedStyle(document.getElementById('main')).overflowY,
      overlays:document.querySelectorAll('.garang-more-sheet,.modal-backdrop,.garang-record-backdrop,.g2-sidebar-backdrop').length,
      menuOpen:document.body.classList.contains('menu-open'),recordOpen:document.body.classList.contains('garang-record-open'),
      coachRoots:document.querySelectorAll('.garang-coach-v2').length
    }));
    assert.equal(finalState.screen,'today');
    assert.ok(finalState.bottom.every(x=>x.hit),`bottom nav must remain touchable after repeated transitions: ${JSON.stringify(finalState.bottom)}`);
    assert.notEqual(finalState.bodyOverflow,'hidden','body must not stay scroll-locked after modal/sidebar use');
    assert.notEqual(finalState.appOverflow,'hidden','app main must not stay scroll-locked');
    assert.equal(finalState.overlays,0,'transient overlays must be removed after repeated navigation');
    assert.equal(finalState.menuOpen,false);assert.equal(finalState.recordOpen,false);assert.ok(finalState.coachRoots<=1,'Coach roots must not duplicate');
    assert.deepEqual(errors,[],`WebKit runtime errors:\n${errors.join('\n')}`);
    await context.close();
    console.log('browser-webkit-regression Safari iPhone C-layout + touch/scroll/runtime stability: PASS');
  } finally {
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error);process.exit(1);});