'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8774;
const baseURL=`http://127.0.0.1:${port}`;
const watchdog=setTimeout(()=>{console.error('browser-mobile-stability-stress: WATCHDOG TIMEOUT');process.exit(1);},90000);
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const stage=name=>console.log(`mobile-stress-stage: ${name}`);

async function waitForServer(){
  const end=Date.now()+15000;
  while(Date.now()<end){
    try{const r=await fetch(baseURL);if(r.ok)return;}catch{}
    await sleep(180);
  }
  throw new Error('stability stress server did not start');
}
async function heartbeat(page,label){
  await Promise.race([
    page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,40)))),
    timeout(2200,`${label}: WebKit main thread stalled`)
  ]);
}
async function tap(page,selector,label=selector){
  const loc=page.locator(selector);
  await loc.waitFor({state:'visible',timeout:7000});
  await loc.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));
  await page.waitForTimeout(35);
  const box=await loc.boundingBox();
  assert.ok(box,`${label}: no touch box`);
  const hit=await loc.evaluate(el=>{
    const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return !!h&&(h===el||el.contains(h));
  });
  assert.equal(hit,true,`${label}: element does not own hit point`);
  await Promise.race([
    page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2),
    timeout(3500,`${label}: tap did not settle`)
  ]);
  await heartbeat(page,label);
}
async function route(page,name){
  await tap(page,`#bottomNav [data-garang-primary-nav="1"][data-page="${name}"]`,`route ${name}`);
  await page.waitForFunction(n=>document.getElementById('main')?.dataset?.garangScreen===n,name,{timeout:5000});
}
async function tapRecordRoute(page,name,label=`Record ${name}`){
  await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="log"]',`${label} open`);
  const sheet=page.locator('[data-garang-record-sheet="1"]');
  await sheet.waitFor({state:'visible',timeout:3000});
  await tap(page,`[data-garang-record-sheet="1"] [data-garang-record-route="${name}"]`,label);
  await page.waitForFunction(n=>document.getElementById('main')?.dataset?.garangScreen===n,name,{timeout:5000});
  assert.equal(await page.locator('#bottomNav [data-garang-primary-nav="1"][data-page="log"]').getAttribute('aria-current'),'page',`${name} must stay grouped under Record`);
}
async function settle(page,label,limit=12){
  await page.waitForTimeout(120);
  const result=await Promise.race([
    page.evaluate(()=>new Promise(resolve=>{
      const main=document.getElementById('main');let child=0,chars=0;
      const ob=new MutationObserver(rs=>rs.forEach(r=>{if(r.type==='childList')child++;if(r.type==='characterData')chars++;}));
      ob.observe(main,{childList:true,subtree:true,characterData:true});
      setTimeout(()=>{ob.disconnect();resolve({child,chars});},550);
    })),
    timeout(2500,`${label}: mutation observer window stalled`)
  ]);
  assert.ok(result.child<=limit&&result.chars<=limit,`${label}: DOM did not settle ${JSON.stringify(result)}`);
}
async function assertNoStaleBlocker(page,label){
  const blockers=await page.evaluate(()=>[...document.querySelectorAll('.garang-more-sheet,.modal-backdrop,.gcp-backdrop,.gcp-panel,.g2-sidebar-backdrop,.g2-chat-sidebar,.garang-data-recovery-modal')]
    .filter(el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      const visible=s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
      const active=s.pointerEvents!=='none';
      if(el.classList.contains('g2-chat-sidebar'))return visible&&active&&!el.closest('.garang-coach-v2')?.classList.contains('sidebar-open');
      return visible&&active;
    })
    .map(el=>({className:String(el.className||''),id:el.id||'',pointer:getComputedStyle(el).pointerEvents})));
  assert.deepEqual(blockers,[],`${label}: stale hit-test blocker ${JSON.stringify(blockers)}`);
}
async function openMore(page){
  await tap(page,'#menuBtn','open More');
  await page.locator('.garang-more-sheet').waitFor({state:'visible',timeout:5000});
}
async function gotoMoreRoute(page,routeName){
  await openMore(page);
  await tap(page,`.garang-more-sheet [data-route="${routeName}"]`,`More ${routeName}`);
  await page.locator('.garang-more-sheet').waitFor({state:'detached',timeout:5000});
  await heartbeat(page,`More ${routeName} route`);
}
async function waitForStabilityRuntimes(page,errors){
  try{
    await page.waitForFunction(()=>window.GarangRouter?.version==='garang-router-v1.3.0'&&window.GarangPrivacySecurityRuntime?.version==='v1.4'&&window.GarangNonblockingActions?.version==='1.2.3',null,{timeout:7000});
  }catch(error){
    const diagnostics=await page.evaluate(()=>({
      readyState:document.readyState,
      screen:document.getElementById('main')?.dataset.garangScreen||'',
      appVisible:!!document.getElementById('appView')&&!document.getElementById('appView').hidden,
      today:!!document.querySelector('.today-body-panel'),
      routerVersion:window.GarangRouter?.version||null,
      privacyVersion:window.GarangPrivacySecurityRuntime?.version||null,
      nonblockingVersion:window.GarangNonblockingActions?.version||null,
      retiredSettingsVersion:window.GarangSettingsTouchSafety?.version||null
    }));
    throw new Error(`canonical stability runtimes did not initialize: ${JSON.stringify(diagnostics)} pageerrors=${JSON.stringify(errors)} original=${error.message}`);
  }
}

(async()=>{
  const server=startStaticServer(serveRoot,port);
  let browser;
  try{
    stage('server');
    await waitForServer();
    browser=await webkit.launch({headless:true});
    const context=await browser.newContext({
      viewport:{width:390,height:844},isMobile:true,hasTouch:true,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
    });
    await context.addInitScript(()=>{
      try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});}catch{}
      localStorage.setItem('garang_demo','1');
      localStorage.setItem('garang_demo_state_v3',JSON.stringify({
        meta:{schemaVersion:5,updatedAt:'2026-09-07T00:00:00Z'},
        profile:{name:'Stress',age:23,height:174,weight:67,goal:'퍼포먼스 향상'},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',weeklyFrequency:4,availableMinutes:60,preferences:''},
        preferences:{language:'ko',unit:'metric'},checkins:[],
        planner:[{id:'stress-plan',date:'2026-09-07',time:'18:00',type:'workout',title:'Stress plan',source:'user',status:'confirmed',completed:false,createdAt:'2026-09-07T00:00:00Z',updatedAt:'2026-09-07T00:00:00Z'}],
        workouts:[],meals:[],runs:[],body:[],aiChat:[],actionLog:[],errors:[],
        memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},analytics:{events:[]},plan:'FREE'
      }));
    });
    const page=await context.newPage();
    const errors=[],dialogs=[];
    page.on('pageerror',e=>{const message=String(e?.stack||e?.message||e);errors.push(message);console.error(`mobile-stress-pageerror: ${message}`);});
    page.on('dialog',async d=>{dialogs.push(`${d.type()}:${d.message()}`);await d.dismiss().catch(()=>{});});

    stage('goto');
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
    await page.waitForFunction(()=>document.querySelector('.today-body-panel'),null,{timeout:10000});
    stage('runtime readiness');
    await waitForStabilityRuntimes(page,errors);
    assert.equal(await page.evaluate(()=>window.GarangSettingsTouchSafety?.version||null),null,'retired Settings safety runtime must stay absent');
    assert.equal(await page.evaluate(()=>window.__garangSettingsTextGuardInstalled===true),false,'global Node textContent guard must be absent');

    for(let cycle=0;cycle<2;cycle++){
      stage(`cycle ${cycle}: today`);
      await route(page,'today');
      await settle(page,`today ${cycle}`);
      await assertNoStaleBlocker(page,`today ${cycle}`);

      const applySelector='button.primary[data-action="apply-coach-plan"]:visible';
      const apply=page.locator(applySelector).first();
      if(await page.locator(applySelector).count()){
        await tap(page,applySelector,`coach plan arm ${cycle}`);
        assert.equal(await apply.getAttribute('data-garang-confirm-armed'),'1','coach plan must use in-app confirmation');
        await tap(page,applySelector,`coach plan apply ${cycle}`);
      }

      stage(`cycle ${cycle}: coach`);
      await route(page,'coach');
      await page.waitForFunction(()=>document.querySelector('.garang-coach-v2'),null,{timeout:7000});
      await tap(page,'.g2-mobile-threads',`coach menu ${cycle}`);
      await page.waitForFunction(()=>document.querySelector('.garang-coach-v2')?.classList.contains('sidebar-open'));
      await tap(page,'[data-g5-action="sync"]',`coach sync ${cycle}`);
      await page.waitForFunction(()=>!document.querySelector('.garang-coach-v2')?.classList.contains('sidebar-open'),null,{timeout:4000});
      await page.waitForTimeout(320);
      await heartbeat(page,`coach post sync ${cycle}`);
      await assertNoStaleBlocker(page,`coach post sync ${cycle}`);
      await settle(page,`coach ${cycle}`,8);
      await page.waitForTimeout(650);
      await settle(page,`coach idle ${cycle}`,4);

      stage(`cycle ${cycle}: core routes`);
      await tapRecordRoute(page,'workout',`workout ${cycle}`);await settle(page,`workout ${cycle}`,16);await assertNoStaleBlocker(page,`workout ${cycle}`);
      await tapRecordRoute(page,'body',`body ${cycle}`);await settle(page,`body ${cycle}`);
      await route(page,'progress');await settle(page,`progress ${cycle}`);

      stage(`cycle ${cycle}: settings`);
      await route(page,'today');
      await tap(page,'#settingsTopBtn',`settings ${cycle}`);
      await page.locator('#savePreferences').waitFor({state:'visible',timeout:7000});
      await settle(page,`settings ${cycle}`,6);
      await tap(page,'#proInfo',`settings PRO ${cycle}`);
      await assertNoStaleBlocker(page,`settings ${cycle}`);
      await route(page,'today');

      stage(`cycle ${cycle}: more`);
      await openMore(page);
      await tap(page,'.garang-more-head button',`close More ${cycle}`);
      await page.locator('.garang-more-sheet').waitFor({state:'detached',timeout:5000});
      await assertNoStaleBlocker(page,`More closed ${cycle}`);
      await heartbeat(page,`More closed ${cycle}`);
    }

    stage('planner delete');
    await gotoMoreRoute(page,'planner');
    await page.waitForFunction(()=>document.querySelector('[data-plan-delete="stress-plan"]'),null,{timeout:7000});
    await tap(page,'[data-plan-delete="stress-plan"]','planner delete arm');
    const deleteButton=page.locator('[data-plan-delete="stress-plan"]');
    assert.equal(await deleteButton.getAttribute('data-garang-confirm-armed'),'1','planner delete must use in-app confirmation');
    await tap(page,'[data-plan-delete="stress-plan"]','planner delete confirm');
    await heartbeat(page,'planner delete completed');
    await assertNoStaleBlocker(page,'planner after delete');

    assert.deepEqual(dialogs,[],`stress flow triggered native blocking dialogs: ${dialogs.join(' | ')}`);
    assert.deepEqual(errors,[],`stress flow runtime errors:\n${errors.join('\n')}`);
    stage('pass');
    console.log('browser-mobile-stability-stress: PASS');
  }finally{
    clearTimeout(watchdog);
    if(browser)await browser.close().catch(()=>{});
    if(server.exitCode===null)server.kill('SIGTERM');
  }
})().catch(error=>{clearTimeout(watchdog);console.error(error);process.exit(1);});