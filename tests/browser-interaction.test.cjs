'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const port=8765;
const baseURL=`http://127.0.0.1:${port}`;

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{const response=await fetch(baseURL);if(response.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  throw new Error('local GARANG server did not start');
}

(async()=>{
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
  let browser;
  try{
    await waitForServer();
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:1280,height:900}});
    await context.addInitScript(()=>{
      localStorage.setItem('garang_demo','1');
      localStorage.setItem('garang_demo_state_v3',JSON.stringify({
        meta:{schemaVersion:5,updatedAt:'2026-09-06T00:00:00.000Z'},
        profile:{name:'Regression User',goal:'퍼포먼스 향상',weight:70},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},
        preferences:{language:'ko',unit:'metric'},
        workouts:[null,{id:'w-safe',date:'2026-09-06',name:'스쿼트',weight:80,reps:5,sets:3,updatedAt:'2026-09-06T00:00:00.000Z'}],
        meals:[null,{id:'m-safe',date:'2026-09-06',name:'아침',items:[null,{id:'food-safe',name:'계란',grams:100,kcal:150,protein:13,carbs:1,fat:10}],updatedAt:'2026-09-06T00:00:00.000Z'}],
        checkins:[null,{id:'c-safe',date:'2026-09-06',sleep:7,energy:3,stress:2,soreness:2,updatedAt:'2026-09-06T00:00:00.000Z'}],
        runs:[null],body:[null],planner:[null],aiChat:[null],actionLog:[null],errors:[null],
        memory:null,analytics:null
      }));
    });
    const page=await context.newPage();
    const pageErrors=[];
    page.on('pageerror',error=>pageErrors.push(String(error?.stack||error?.message||error)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
    await page.waitForFunction(()=>typeof document.querySelector('#bottomNav button[data-page="today"]')?.onclick==='function',{timeout:5000});

    // Catch delayed blockers/watchdogs that appear after the initial render.
    await page.waitForTimeout(4500);
    const hitTest=await page.evaluate(()=>{
      const vw=innerWidth,vh=innerHeight;
      const fullscreen=[...document.querySelectorAll('body *')].map(el=>{
        const cs=getComputedStyle(el),r=el.getBoundingClientRect();
        return {el,cs,r};
      }).filter(x=>x.cs.display!=='none'&&x.cs.visibility!=='hidden'&&x.cs.pointerEvents!=='none'&&['fixed','absolute'].includes(x.cs.position)&&x.r.width>=vw*.8&&x.r.height>=vh*.8)
        .map(x=>({tag:x.el.tagName,id:x.el.id||'',cls:x.el.className||'',pointerEvents:x.cs.pointerEvents,opacity:x.cs.opacity,zIndex:x.cs.zIndex,hidden:x.el.hidden,ariaHidden:x.el.getAttribute('aria-hidden')}));
      const describe=(x,y)=>document.elementsFromPoint(x,y).slice(0,6).map(el=>({tag:el.tagName,id:el.id||'',cls:el.className||''}));
      return {fullscreen,center:describe(vw/2,vh/2),top:describe(vw/2,34),bottom:describe(vw/2,vh-28)};
    });
    assert.equal(hitTest.fullscreen.length,0,`unexpected fullscreen pointer blocker: ${JSON.stringify(hitTest,null,2)}`);
    assert.ok(hitTest.center.some(x=>x.id==='main'||/card|main|today/i.test(String(x.cls))),`center hit-test is not app content: ${JSON.stringify(hitTest.center)}`);

    const repaired=await page.evaluate(()=>JSON.parse(localStorage.getItem('garang_demo_state_v3')));
    assert.equal(repaired.workouts.length,1,'malformed workout rows should be removed');
    assert.equal(repaired.meals.length,1,'malformed meal rows should be removed');
    assert.equal(repaired.meals[0].items.length,1,'malformed nested meal items should be removed');
    assert.equal(repaired.checkins.length,1,'malformed check-in rows should be removed');
    assert.ok(repaired.memory&&Array.isArray(repaired.memory.entries),'memory shape should be repaired');
    assert.ok(repaired.analytics&&Array.isArray(repaired.analytics.events),'analytics shape should be repaired');

    const menu=page.locator('#menuBtn');
    await menu.waitFor({state:'visible',timeout:5000});
    await menu.click();
    await page.locator('.garang-more-sheet').waitFor({state:'visible',timeout:3000});
    await page.locator('.garang-more-sheet [data-route="running"]').click();
    await page.waitForFunction(()=>/러닝|RUNNING/i.test(document.getElementById('main')?.innerText||''));

    for(const route of ['today','coach','workout','body','progress']){
      const button=page.locator(`#bottomNav button[data-page="${route}"]`);
      await button.click();
      await page.waitForFunction(expected=>document.querySelector(`#bottomNav button[data-page="${expected}"]`)?.classList.contains('active'),route);
    }

    const settingsTop=page.locator('#settingsTopBtn');
    await settingsTop.click();
    await page.waitForFunction(()=>/설정|SETTING/i.test(document.getElementById('main')?.innerText||''));

    const menuVisible=await menu.isVisible();
    assert.equal(menuVisible,true,'desktop hamburger must stay visible after route changes');
    assert.deepEqual(pageErrors,[],`browser runtime errors:\n${pageErrors.join('\n')}`);
    console.log('browser-interaction: PASS');
  } finally {
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error);process.exit(1);});
