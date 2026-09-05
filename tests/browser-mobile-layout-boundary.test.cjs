'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
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
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:serveRoot,stdio:'ignore'});
  let browser;
  try{
    await waitForServer();
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.addInitScript(()=>{
      localStorage.setItem('garang_demo','1');
      localStorage.setItem('garang_demo_state_v3',JSON.stringify({
        meta:{schemaVersion:5,updatedAt:'2026-09-06T00:00:00.000Z'},
        profile:{name:'Mobile Layout',goal:'퍼포먼스 향상',weight:70},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},
        preferences:{language:'ko',unit:'metric'},
        workouts:[],meals:[],runs:[],body:[],planner:[],checkins:[],aiChat:[],actionLog:[],errors:[],
        memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},analytics:{events:[]},plan:'FREE'
      }));
    });
    const page=await context.newPage();
    const pageErrors=[];page.on('pageerror',error=>pageErrors.push(String(error?.stack||error?.message||error)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:10000});
    await page.waitForFunction(()=>document.querySelectorAll('.quick-visual').length>=4,{timeout:10000});

    async function snapshot(label){
      const value=await page.evaluate(()=>{
        const main=document.getElementById('main'),style=getComputedStyle(main),nav=document.getElementById('bottomNav'),navStyle=getComputedStyle(nav);
        const cards=[...document.querySelectorAll('.quick-visual')].map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};});
        return {screen:main.dataset.garangScreen,overflow:style.overflow,overflowX:style.overflowX,overflowY:style.overflowY,maxHeight:style.maxHeight,contain:style.contain,cards,navBackdrop:navStyle.backdropFilter||navStyle.webkitBackdropFilter||'none'};
      });
      assert.equal(value.screen,'today',`${label}: expected Today screen`);
      assert.equal(value.overflowX,'visible',`${label}: iOS-safe main overflow-x must stay visible: ${JSON.stringify(value)}`);
      assert.equal(value.overflowY,'visible',`${label}: main overflow-y must stay visible: ${JSON.stringify(value)}`);
      assert.equal(value.maxHeight,'none',`${label}: ordinary screen must not inherit a fixed max-height`);
      assert.ok(value.cards.length>=4,`${label}: all four quick-record cards must exist`);
      assert.ok(value.cards.every(card=>card.height>40),`${label}: quick-record cards must have real paint boxes`);
      assert.ok(!value.navBackdrop||value.navBackdrop==='none',`${label}: mobile fixed nav must not create a blur compositor: ${value.navBackdrop}`);
    }

    await snapshot('initial Today');
    await page.locator('#bottomNav button[data-page="coach"]').click();
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='coach',{timeout:7000});
    await page.locator('#bottomNav button[data-page="today"]').click();
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:7000});
    await page.waitForFunction(()=>document.querySelectorAll('.quick-visual').length>=4,{timeout:7000});
    await snapshot('Coach -> Today');

    assert.deepEqual(pageErrors,[],`mobile layout browser errors:\n${pageErrors.join('\n')}`);
    console.log('browser-mobile-layout-boundary: PASS');
  }finally{
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error);process.exit(1);});
