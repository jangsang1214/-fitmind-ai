'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8771;
const baseURL=`http://127.0.0.1:${port}`;
const watchdog=setTimeout(()=>{console.error('browser-settings-touch-regression: WATCHDOG TIMEOUT');process.exit(1);},55000);

function stage(name){console.log(`settings-touch-stage: ${name}`);}
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms));

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
  await loc.scrollIntoViewIfNeeded();
  await page.waitForTimeout(30);
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
    timeout(4000,`${selector} physical tap did not settle`)
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

async function assertSettingsSettles(page,label){
  const result=await Promise.race([
    page.evaluate(()=>new Promise(resolve=>{
      const main=document.getElementById('main');
      let childListMutations=0;
      const observer=new MutationObserver(records=>{
        childListMutations+=records.filter(record=>record.type==='childList').length;
      });
      observer.observe(main,{childList:true,subtree:true});
      setTimeout(()=>{
        observer.disconnect();
        resolve({
          childListMutations,
          prototypePatched:window.__garangSettingsTextGuardInstalled===true
        });
      },500);
    })),
    timeout(2500,`${label}: Settings DOM did not settle`)
  ]);
  assert.ok(result.childListMutations<=3,`${label}: Settings must settle instead of self-triggering MutationObserver writes; childList mutations=${result.childListMutations}`);
  assert.equal(result.prototypePatched,false,`${label}: Settings must not monkeypatch Node.prototype.textContent`);
}

async function assertSettingsInteractive(page,label){
  stage(`${label}: wait settings controls`);
  await page.locator('#savePreferences').waitFor({state:'visible',timeout:7000});
  const proInfo=page.locator('#proInfo');
  await proInfo.waitFor({state:'visible',timeout:7000});
  await page.waitForFunction(()=>document.getElementById('main')?.dataset.garangScreen==='settings',null,{timeout:3000});
  await proInfo.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));
  await page.waitForTimeout(60);

  const state=await page.evaluate(()=>{
    const target=document.getElementById('proInfo');
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
      hitOwner:hit?{tag:hit.tagName,id:hit.id||'',className:String(hit.className||''),text:String(hit.textContent||'').trim().slice(0,80)}:null,
      rect:r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}:null,
      viewport:{width:innerWidth,height:innerHeight},
      blockers,
      screen:document.getElementById('main')?.dataset.garangScreen||'',
      canonicalGearIntact:window.GarangSettingsTouchSafety?.canonicalGearIntact===true
    };
  });

  assert.equal(state.screen,'settings',`${label}: Settings must own the explicit screen id`);
  assert.equal(state.canonicalGearIntact,true,`${label}: canonical top gear onclick must remain untouched`);
  assert.equal(state.hit,true,`${label}: Settings control must be hit-testable; diagnostics=${JSON.stringify(state)}`);
  assert.deepEqual(state.blockers,[],`${label}: no stale full-screen blocker may remain; diagnostics=${JSON.stringify(state)}`);

  await assertSettingsSettles(page,label);
  stage(`${label}: tap PRO info`);
  await tap(page,'#proInfo');
  await page.locator('#toast.show').waitFor({state:'visible',timeout:3000});
  stage(`${label}: settings control responded`);
}

async function route(page,name){
  await tap(page,`#bottomNav button[data-page="${name}"]`);
  await page.waitForFunction(n=>document.querySelector(`#bottomNav button[data-page="${n}"]`)?.classList.contains('active'),name,{timeout:5000});
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
    await page.waitForFunction(()=>window.GarangSettingsTouchSafety?.version==='3.1.0',null,{timeout:7000});

    const binding=await page.evaluate(()=>{
      const gear=document.getElementById('settingsTopBtn');
      return {
        onclick:typeof gear?.onclick,
        capture:gear?.dataset?.garangSettingsCapture||'',
        messageTask:gear?.dataset?.garangSettingsMessageTask||'',
        prototypePatched:window.__garangSettingsTextGuardInstalled===true
      };
    });
    assert.equal(binding.onclick,'function','top Settings gear must retain the canonical app onclick');
    assert.equal(binding.capture,'','Settings safety must not intercept the canonical gear click');
    assert.equal(binding.messageTask,'','Settings safety must not reroute through a synthetic task');
    assert.equal(binding.prototypePatched,false,'Settings runtime must not patch Node.prototype.textContent');

    stage('tap gear first');
    await tap(page,'#settingsTopBtn');
    stage('gear first tapped');
    await assertSettingsInteractive(page,'top-bar settings');

    stage('return today');
    await route(page,'today');
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

    /* Reproduce the physical report path: Coach's visible gear delegates to the canonical Settings route. */
    stage('enter Coach for visible gear path');
    await route(page,'coach');
    await page.waitForFunction(()=>document.querySelector('.garang-coach-v2 .g5-settings'),null,{timeout:7000});
    await assertSettingsSettles(page,'pre-coach-settings idle');
    stage('tap Coach visible settings gear');
    await tap(page,'.garang-coach-v2 .g5-settings');
    await assertSettingsInteractive(page,'Coach visible settings gear');

    stage('Coach reentry after Settings');
    await route(page,'coach');
    await page.waitForFunction(()=>document.querySelector('.garang-coach-v2 .g2-chat-head'),null,{timeout:7000});
    await tap(page,'.g2-head-new');
    await page.waitForTimeout(80);
    await tap(page,'.garang-coach-v2 .g5-settings');
    await assertSettingsInteractive(page,'Coach settings after reentry');

    assert.deepEqual(errors,[],`WebKit settings runtime errors:\n${errors.join('\n')}`);
    stage('pass');
    console.log('browser-settings-touch-regression: PASS');
  }finally{
    clearTimeout(watchdog);
    if(browser) await Promise.race([browser.close().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,4000))]);
    if(server.exitCode===null) server.kill('SIGKILL');
  }
})().catch(error=>{clearTimeout(watchdog);console.error(error);process.exit(1);});
