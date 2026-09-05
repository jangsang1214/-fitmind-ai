'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8765;
const baseURL=`http://127.0.0.1:${port}`;

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{const response=await fetch(baseURL);if(response.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  throw new Error('built GARANG server did not start');
}

(async()=>{
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:serveRoot,stdio:'ignore'});
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
        workouts:[{id:'w-safe',date:'2026-09-06',name:'스쿼트',weight:80,reps:5,sets:3,updatedAt:'2026-09-06T00:00:00.000Z'}],
        meals:[{id:'m-safe',date:'2026-09-06',name:'아침',items:[{id:'food-safe',name:'계란',grams:100,kcal:150,protein:13,carbs:1,fat:10}],updatedAt:'2026-09-06T00:00:00.000Z'}],
        checkins:[{id:'c-safe',date:'2026-09-06',sleep:7,energy:3,stress:2,soreness:2,updatedAt:'2026-09-06T00:00:00.000Z'}],
        runs:[],body:[],planner:[],aiChat:[],actionLog:[],errors:[],
        memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},analytics:{events:[]},plan:'FREE'
      }));
    });
    const page=await context.newPage();
    const pageErrors=[];
    page.on('pageerror',error=>pageErrors.push(String(error?.stack||error?.message||error)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
    await page.waitForFunction(()=>typeof document.querySelector('#bottomNav button[data-page="today"]')?.onclick==='function',{timeout:5000});
    await page.waitForTimeout(2500);

    const hitTest=await page.evaluate(()=>{
      const vw=innerWidth,vh=innerHeight;
      const blockers=[...document.querySelectorAll('body *')].map(el=>({el,cs:getComputedStyle(el),r:el.getBoundingClientRect()}))
        .filter(x=>x.cs.display!=='none'&&x.cs.visibility!=='hidden'&&x.cs.pointerEvents!=='none'&&['fixed','absolute'].includes(x.cs.position)&&x.r.width>=vw*.8&&x.r.height>=vh*.8)
        .map(x=>({tag:x.el.tagName,id:x.el.id||'',cls:String(x.el.className||''),zIndex:x.cs.zIndex}));
      const center=document.elementsFromPoint(vw/2,vh/2).slice(0,6).map(el=>({tag:el.tagName,id:el.id||'',cls:String(el.className||'')}));
      return {blockers,center,mainText:document.getElementById('main')?.innerText||''};
    });
    assert.equal(hitTest.blockers.length,0,`unexpected fullscreen blocker: ${JSON.stringify(hitTest,null,2)}`);
    assert.ok(hitTest.mainText.trim().length>0,'app main content must render after entering app');

    for(const route of ['today','coach','workout','body','progress']){
      const button=page.locator(`#bottomNav button[data-page="${route}"]`);
      await button.click();
      await page.waitForFunction(expected=>document.querySelector(`#bottomNav button[data-page="${expected}"]`)?.classList.contains('active'),route);
      assert.ok((await page.locator('#main').innerText()).trim().length>0,`${route} page must render content`);
    }

    const settingsTop=page.locator('#settingsTopBtn');
    await settingsTop.click();
    await page.waitForFunction(()=>/설정|SETTING/i.test(document.getElementById('main')?.innerText||''));
    assert.deepEqual(pageErrors,[],`browser runtime errors:\n${pageErrors.join('\n')}`);
    console.log('browser-interaction-built-app: PASS');
  } finally {
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error);process.exit(1);});
