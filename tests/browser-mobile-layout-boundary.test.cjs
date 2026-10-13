'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8767;
const baseURL=`http://127.0.0.1:${port}`;

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{const response=await fetch(baseURL);if(response.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw new Error('mobile layout test server did not start');
}

(async()=>{
  const server=startStaticServer(serveRoot,port);
  let browser;
  try{
    await waitForServer();
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await installAuthenticatedFirebaseMock(context);
    await context.addInitScript(()=>{
      localStorage.setItem('garang_user_mock-user_v3',JSON.stringify({
        meta:{schemaVersion:5,updatedAt:'2026-09-06T00:00:00.000Z'},
        profile:{name:'Mobile Layout',goal:'퍼포먼스 향상',weight:70},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},
        preferences:{language:'ko',unit:'metric'},
        workouts:[],meals:[],runs:[],body:[],planner:[],checkins:[],dailyCheckins:[],physiologicalSignals:[],aiChat:[],actionLog:[],errors:[],
        memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},analytics:{events:[]},plan:'FREE'
      }));
    });
    const page=await context.newPage();
    const pageErrors=[];page.on('pageerror',error=>pageErrors.push(String(error?.stack||error?.message||error)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
    await page.waitForFunction(()=>window.GarangGoldenMasterV1?.version==='garang-golden-master-v1.0.0'&&document.getElementById('garangGoldenMaster'),null,{timeout:10000});

    async function snapshot(label,expectedSurface){
      const value=await page.evaluate(()=>{
        const main=document.getElementById('main'),style=getComputedStyle(main),legacy=document.getElementById('bottomNav');
        const gmRoot=document.getElementById('garangGoldenMaster'),gmNav=document.getElementById('garangGoldenNav');
        const buttons=[...document.querySelectorAll('#garangGoldenNav [data-gm-nav]')];
        const boxes=buttons.map(el=>{const r=el.getBoundingClientRect();return {name:el.dataset.gmNav,width:r.width,height:r.height,display:getComputedStyle(el).display};});
        const visibleBridges=[...document.querySelectorAll('#bottomNav [data-garang-route-bridge="1"]')].filter(el=>getComputedStyle(el).display!=='none');
        const grid=document.querySelector('.quick-visual-grid');
        return {
          screen:main?.dataset?.garangScreen||'',surface:main?.dataset?.goldenSurface||'',
          overflowX:style.overflowX,overflowY:style.overflowY,maxHeight:style.maxHeight,
          gmVisible:gmRoot?getComputedStyle(gmRoot).display!=='none':false,
          gmNavVisible:gmNav?getComputedStyle(gmNav).display!=='none':false,
          buttons:boxes,
          legacyHidden:legacy?getComputedStyle(legacy).display==='none':false,
          legacyDelegated:legacy?.dataset?.gmCanonical==='hidden',
          visibleBridges:visibleBridges.length,
          quickCount:document.querySelectorAll('.quick-visual').length,
          quickGridHidden:grid?.hidden??null,
          viewport:innerWidth,docWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth
        };
      });
      assert.equal(value.surface,expectedSurface,`${label}: Golden Master surface mismatch: ${JSON.stringify(value)}`);
      assert.equal(value.overflowX,'visible',`${label}: iOS-safe main overflow-x must stay visible: ${JSON.stringify(value)}`);
      assert.equal(value.overflowY,'visible',`${label}: main overflow-y must stay visible: ${JSON.stringify(value)}`);
      assert.equal(value.maxHeight,'none',`${label}: ordinary screen must not inherit a fixed max-height`);
      assert.equal(value.gmVisible,true,`${label}: Golden Master must be the visible presentation owner`);
      assert.equal(value.gmNavVisible,true,`${label}: Golden Master navigation must remain visible`);
      assert.equal(value.buttons.length,5,`${label}: exactly five Golden Master primary actions must exist`);
      assert.ok(value.buttons.every(box=>box.display!=='none'&&box.width>=44&&box.height>=44),`${label}: every Golden Master nav action must own a real mobile touch target: ${JSON.stringify(value.buttons)}`);
      assert.equal(value.legacyDelegated,true,`${label}: canonical nav must stay delegated, not removed`);
      assert.equal(value.legacyHidden,true,`${label}: duplicate canonical nav must not paint under Golden Master`);
      assert.equal(value.visibleBridges,0,`${label}: internal route bridges must never paint`);
      assert.ok(value.quickCount>=4,`${label}: legacy quick-record capabilities must remain in DOM for canonical continuation`);
      assert.equal(value.quickGridHidden,true,`${label}: duplicate Today quick-record surface must stay internalized`);
      assert.ok(value.docWidth<=value.viewport+2&&value.bodyWidth<=value.viewport+2,`${label}: mobile shell must not overflow horizontally: ${JSON.stringify(value)}`);
    }

    await snapshot('initial Home','home');
    await page.locator('#garangGoldenNav [data-gm-nav="coach"]').click();
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.goldenSurface==='coach',{timeout:7000});
    await page.locator('#garangGoldenNav [data-gm-nav="home"]').click();
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.goldenSurface==='home',{timeout:7000});
    await snapshot('Coach -> Home','home');

    assert.deepEqual(pageErrors,[],`mobile layout browser errors:\n${pageErrors.join('\n')}`);
    console.log('browser-mobile-layout-boundary Golden Master: PASS');
  }finally{
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error);process.exit(1);});
