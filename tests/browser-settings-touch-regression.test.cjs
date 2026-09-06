'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8771;
const baseURL=`http://127.0.0.1:${port}`;
const watchdog=setTimeout(()=>{console.error('browser-settings-touch-regression: WATCHDOG TIMEOUT');process.exit(1);},45000);

function stage(name){console.log(`settings-touch-stage: ${name}`);}

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{const r=await fetch(baseURL);if(r.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  throw new Error('WebKit settings regression server did not start');
}

async function tap(page,selector){
  const loc=page.locator(selector);
  await loc.waitFor({state:'visible',timeout:7000});
  const box=await loc.boundingBox();
  assert.ok(box,`${selector} must have a touch box`);
  const hit=await loc.evaluate(el=>{
    const r=el.getBoundingClientRect();
    const h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return !!h&&(h===el||el.contains(h));
  });
  assert.equal(hit,true,`${selector} must own its hit point`);
  await Promise.race([
    page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${selector} physical tap did not settle`)),4000))
  ]);
}

async function installBodyBlocker(page){
  await page.evaluate(()=>{
    document.querySelector('#settings-test-stale-blocker')?.remove();
    const blocker=document.createElement('div');
    blocker.id='settings-test-stale-blocker';
    blocker.className='modal-backdrop';
    Object.assign(blocker.style,{
      position:'fixed',left:'0',right:'0',top:'72px',bottom:'0',
      zIndex:'12000',display:'block',visibility:'visible',pointerEvents:'auto',background:'transparent'
    });
    document.body.appendChild(blocker);
  });
}

async function assertSettingsInteractive(page,label){
  stage(`${label}: wait capture intercept`);
  await page.waitForFunction(()=>window.GarangSettingsTouchSafety?.lastInterceptAt>0,null,{timeout:3000});
  stage(`${label}: wait route attempt`);
  await page.waitForFunction(()=>window.GarangSettingsTouchSafety?.lastNavigationAttemptAt>0,null,{timeout:3000});
  stage(`${label}: wait route completion`);
  await page.waitForFunction(()=>window.GarangSettingsTouchSafety?.lastNavigationAt>0,null,{timeout:3000});
  stage(`${label}: wait save`);
  await page.locator('#savePreferences').waitFor({state:'visible',timeout:7000});
  await page.waitForFunction(()=>window.GarangSettingsTouchSafety?.lastCleanupAt>0,null,{timeout:7000});
  await page.waitForTimeout(40);
  const state=await page.evaluate(()=>{
    const target=document.getElementById('savePreferences');
    const r=target?.getBoundingClientRect();
    const hit=r?document.elementFromPoint(r.left+r.width/2,r.top+r.height/2):null;
    const blockers=[...document.querySelectorAll('.garang-more-sheet,.modal-backdrop,.gcp-backdrop,.gcp-panel,.g2-sidebar-backdrop')]
      .filter(el=>{
        const s=getComputedStyle(el),box=el.getBoundingClientRect();
        return s.display!=='none'&&s.visibility!=='hidden'&&s.pointerEvents!=='none'&&box.width>0&&box.height>0;
      })
      .map(el=>el.className||el.id||el.tagName);
    return {hit:!!target&&!!hit&&(hit===target||target.contains(hit)),blockers,downstream:window.__settingsDownstreamGearClicks||0};
  });
  assert.equal(state.hit,true,`${label}: Settings save button must be hit-testable`);
  assert.deepEqual(state.blockers,[],`${label}: no stale full-screen blocker may remain`);
  assert.equal(state.downstream,0,`${label}: Settings gear click must not reach downstream document delegates`);
  stage(`${label}: tap save`);
  await tap(page,'#savePreferences');
  stage(`${label}: save tapped`);
}

(async()=>{
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:serveRoot,stdio:'ignore'});
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
        meta:{schemaVersion:5,updatedAt:'2026-09-07T00:00:00Z'},profile:{name:'WebKit Settings',weight:70},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},
        preferences:{language:'ko',unit:'metric'},workouts:[],meals:[],runs:[],body:[],planner:[],checkins:[],aiChat:[],actionLog:[],errors:[],
        memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},analytics:{events:[]},plan:'FREE'
      }));
    });

    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>{const msg=String(e?.stack||e?.message||e);errors.push(msg);console.error(`settings-pageerror: ${msg}`);});

    stage('goto');
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
    await page.waitForFunction(()=>document.querySelector('.today-body-panel'),null,{timeout:10000});
    await page.waitForFunction(()=>window.GarangSettingsTouchSafety?.version==='2.0.0',null,{timeout:7000});

    const binding=await page.evaluate(()=>{
      const gear=document.getElementById('settingsTopBtn');
      window.__settingsDownstreamGearClicks=0;
      document.addEventListener('click',event=>{
        const target=event.target;
        if(target&&(target===gear||gear.contains(target)))window.__settingsDownstreamGearClicks++;
      },true);
      return {
        onclick:typeof gear?.onclick,
        deferred:gear?.dataset?.garangSettingsDeferred||'',
        capture:gear?.dataset?.garangSettingsCapture||''
      };
    });
    assert.equal(binding.onclick,'function','top Settings gear must retain a fallback click handler');
    assert.equal(binding.deferred,'1','top Settings gear must defer synchronous route rendering');
    assert.equal(binding.capture,'1','top Settings gear must install capture-phase isolation');

    stage('tap gear first');
    await tap(page,'#settingsTopBtn');
    stage('gear first tapped');
    await assertSettingsInteractive(page,'top-bar settings');

    stage('return today');
    await tap(page,'#bottomNav button[data-page="today"]');
    await page.waitForFunction(()=>document.querySelector('.today-body-panel'),null,{timeout:7000});

    stage('open more');
    await tap(page,'#menuBtn');
    await page.locator('.garang-more-sheet').waitFor({state:'visible',timeout:7000});
    stage('close more');
    await tap(page,'.garang-more-head button');
    await page.locator('.garang-more-sheet').waitFor({state:'detached',timeout:7000});
    await installBodyBlocker(page);

    stage('tap gear second');
    await tap(page,'#settingsTopBtn');
    stage('gear second tapped');
    await assertSettingsInteractive(page,'settings after utility-sheet close');

    assert.deepEqual(errors,[],`WebKit settings runtime errors:\n${errors.join('\n')}`);
    stage('pass');
    console.log('browser-settings-touch-regression: PASS');
  }finally{
    clearTimeout(watchdog);
    if(browser) await Promise.race([browser.close().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,4000))]);
    if(server.exitCode===null) server.kill('SIGKILL');
  }
})().catch(error=>{clearTimeout(watchdog);console.error(error);process.exit(1);});
