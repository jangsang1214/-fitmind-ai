'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8771;
const baseURL=`http://127.0.0.1:${port}`;

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
  await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
}

async function assertSettingsInteractive(page,label){
  await page.locator('#savePreferences').waitFor({state:'visible',timeout:7000});
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
    return {
      hit:!!target&&!!hit&&(hit===target||target.contains(hit)),
      blockers,
      screen:document.getElementById('main')?.dataset?.garangScreen||''
    };
  });
  assert.equal(state.hit,true,`${label}: Settings save button must be hit-testable`);
  assert.deepEqual(state.blockers,[],`${label}: no stale full-screen blocker may remain`);
  await tap(page,'#savePreferences');
}

(async()=>{
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:serveRoot,stdio:'ignore'});
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
    await context.addInitScript(()=>{
      try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});}catch{}
      localStorage.setItem('garang_demo','1');
      localStorage.setItem('garang_demo_state_v3',JSON.stringify({
        meta:{schemaVersion:5,updatedAt:'2026-09-07T00:00:00Z'},
        profile:{name:'WebKit Settings',weight:70},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},
        preferences:{language:'ko',unit:'metric'},
        workouts:[],meals:[],runs:[],body:[],planner:[],checkins:[],aiChat:[],actionLog:[],errors:[],
        memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},analytics:{events:[]},plan:'FREE'
      }));
    });

    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));

    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
    await page.waitForFunction(()=>document.querySelector('.today-body-panel'),{timeout:10000});
    await page.waitForFunction(()=>!!window.GarangSettingsTouchSafety,{timeout:7000});

    // Direct top-bar Settings path.
    await tap(page,'#settingsTopBtn');
    await assertSettingsInteractive(page,'top-bar settings');

    await tap(page,'#bottomNav button[data-page="today"]');
    await page.waitForFunction(()=>document.querySelector('.today-body-panel'));

    // Full-screen More sheet -> Settings path. This is the iOS stale-overlay regression.
    await tap(page,'#menuBtn');
    await page.locator('.garang-more-sheet').waitFor({state:'visible',timeout:7000});
    await tap(page,'.garang-more-sheet [data-route="settings"]');
    await assertSettingsInteractive(page,'more-sheet settings');

    assert.deepEqual(errors,[],`WebKit settings runtime errors:\n${errors.join('\n')}`);
    console.log('browser-settings-touch-regression: PASS');
  }finally{
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error);process.exit(1);});
