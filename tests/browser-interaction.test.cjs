'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8765,baseURL=`http://127.0.0.1:${port}`;
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('built GARANG server did not start');}
const dirtyState=()=>({
  meta:{schemaVersion:5,updatedAt:'2026-09-06T00:00:00.000Z'},profile:{name:'Regression User',goal:'퍼포먼스 향상',weight:70},
  onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},
  workouts:[null,'bad',{id:'w-safe',date:'2026-09-06',name:'스쿼트',weight:80,reps:5,sets:3,updatedAt:'2026-09-06T00:00:00.000Z'}],
  meals:[null,{id:'m-safe',date:'2026-09-06',name:'아침',items:[null,{id:'food-safe',name:'계란',grams:100,kcal:150,protein:13,carbs:1,fat:10}],updatedAt:'2026-09-06T00:00:00.000Z'}],
  checkins:[null,{id:'c-safe',date:'2026-09-06',sleep:7,energy:3,stress:2,soreness:2,updatedAt:'2026-09-06T00:00:00.000Z'}],
  runs:[null],body:[null],planner:[null],aiChat:[null],actionLog:[null],errors:[null],memory:null,analytics:null,plan:'FREE'
});
async function tap(page,locator,touch,label='target'){
  if(!touch){await locator.click();return;}
  const box=await locator.boundingBox();
  if(!box){
    const diagnostic=await page.evaluate(()=>({
      screen:document.getElementById('main')?.dataset?.garangScreen||'',
      mainText:(document.getElementById('main')?.innerText||'').slice(0,180),
      bottomNav:{hidden:document.getElementById('bottomNav')?.hidden??null,display:document.getElementById('bottomNav')?getComputedStyle(document.getElementById('bottomNav')).display:null,html:document.getElementById('bottomNav')?.innerHTML||''},
      sheet:{exists:!!document.querySelector('.garang-more-sheet'),display:document.querySelector('.garang-more-sheet')?getComputedStyle(document.querySelector('.garang-more-sheet')).display:null}
    }));
    throw new Error(`${label} has no touch box: ${JSON.stringify(diagnostic)}`);
  }
  await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
}
async function assertOwnsPoint(page,selector){const ok=await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!hit&&(hit===el||el.contains(hit));});assert.equal(ok,true,`${selector} must own its hit-test point`);}
async function assertTodayNotClipped(page,label){
  const diagnostic=await page.evaluate(()=>{
    const main=document.getElementById('main'),mainStyle=main?getComputedStyle(main):null;
    const clipping=[];
    const hubs=[...document.querySelectorAll('.hub-card')].map((card,index)=>{
      const r=card.getBoundingClientRect();let p=card.parentElement;
      while(p&&p!==document.body){
        const cs=getComputedStyle(p),pr=p.getBoundingClientRect(),overflow=`${cs.overflow} ${cs.overflowY} ${cs.overflowX}`;
        if(/hidden|clip/.test(overflow)&&(r.bottom>pr.bottom+1||r.top<pr.top-1))clipping.push({card:index,ancestor:p.id||p.className||p.tagName,overflow,cardBottom:Math.round(r.bottom),ancestorBottom:Math.round(pr.bottom)});
        p=p.parentElement;
      }
      return {index,top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height)};
    });
    return {
      hasCoach:!!document.querySelector('.garang-coach-v2'),
      screen:main?.dataset?.garangScreen||'',
      main:{overflow:mainStyle?.overflow||'',overflowY:mainStyle?.overflowY||'',height:mainStyle?.height||'',minHeight:mainStyle?.minHeight||'',clientHeight:main?.clientHeight||0,scrollHeight:main?.scrollHeight||0},
      hubs,clipping
    };
  });
  assert.equal(diagnostic.hasCoach,false,`${label}: Today must not retain Coach root: ${JSON.stringify(diagnostic)}`);
  assert.ok(diagnostic.hubs.length>=4,`${label}: Today quick record must render four cards: ${JSON.stringify(diagnostic)}`);
  assert.equal(diagnostic.clipping.length,0,`${label}: Today cards are clipped by an overflow ancestor: ${JSON.stringify(diagnostic)}`);
  assert.equal(diagnostic.main.overflowY==='hidden'&&diagnostic.main.scrollHeight>diagnostic.main.clientHeight,true?false:true,`${label}: main is a fixed hidden-overflow viewport: ${JSON.stringify(diagnostic)}`);
}

(async()=>{
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:serveRoot,stdio:'ignore'});let browser;
  try{
    await waitForServer();browser=await chromium.launch({headless:true});
    for(const mode of [{name:'desktop',viewport:{width:1280,height:900},touch:false},{name:'mobile',viewport:{width:390,height:844},touch:true}]){
      const context=await browser.newContext({viewport:mode.viewport,isMobile:mode.touch,hasTouch:mode.touch});
      await context.addInitScript(state=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(state));},dirtyState());
      const page=await context.newPage(),pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e?.stack||e?.message||e)));
      await page.goto(`${baseURL}/?mode=${mode.name}`,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
      await page.waitForFunction(()=>document.getElementById('main')?.innerText?.trim().length>0,{timeout:10000});
      await page.locator('[data-today-view="front"]').waitFor({state:'visible',timeout:7000});
      await page.locator('[data-today-view="back"]').waitFor({state:'visible',timeout:7000});

      const repaired=await page.evaluate(()=>JSON.parse(localStorage.getItem('garang_demo_state_v3')));
      assert.equal(repaired.workouts.length,1,`${mode.name}: malformed workouts must be removed`);
      assert.equal(repaired.meals.length,1);assert.equal(repaired.meals[0].items.length,1);assert.equal(repaired.checkins.length,1);
      assert.ok(repaired.memory&&Array.isArray(repaired.memory.entries));assert.ok(repaired.analytics&&Array.isArray(repaired.analytics.events));

      if(mode.touch)await assertTodayNotClipped(page,'mobile initial Today');

      const menu=page.locator('#menuBtn');await menu.waitFor({state:'visible',timeout:5000});await assertOwnsPoint(page,'#menuBtn');
      await assertOwnsPoint(page,'#bottomNav button[data-page="coach"]');
      await assertOwnsPoint(page,'[data-today-view="back"]');

      const back=page.locator('[data-today-view="back"]'),front=page.locator('[data-today-view="front"]');
      await tap(page,back,mode.touch,`${mode.name}: today back`);await page.waitForFunction(()=>document.querySelector('[data-today-view="back"]')?.classList.contains('active'));
      await tap(page,front,mode.touch,`${mode.name}: today front`);await page.waitForFunction(()=>document.querySelector('[data-today-view="front"]')?.classList.contains('active'));

      await tap(page,menu,mode.touch,`${mode.name}: hamburger`);await page.locator('.garang-more-sheet').waitFor({state:'visible',timeout:3000});
      const running=page.locator('.garang-more-sheet [data-route="running"]');await tap(page,running,mode.touch,`${mode.name}: running menu item`);await page.waitForFunction(()=>/러닝|RUNNING/i.test(document.getElementById('main')?.innerText||''));

      for(const route of ['today','coach','today','workout','body','progress']){
        const button=page.locator(`#bottomNav button[data-page="${route}"]`);await tap(page,button,mode.touch,`${mode.name}: bottom nav ${route}`);
        await page.waitForFunction(r=>document.querySelector(`#bottomNav button[data-page="${r}"]`)?.classList.contains('active'),route);
        assert.ok((await page.locator('#main').innerText()).trim().length>0,`${mode.name}: ${route} must render`);
        if(mode.touch&&route==='today')await assertTodayNotClipped(page,'mobile returned Today');
      }
      assert.deepEqual(pageErrors,[],`${mode.name} browser runtime errors:\n${pageErrors.join('\n')}`);
      await context.close();
    }
    console.log('browser-interaction desktop+mobile malformed-state+layout: PASS');
  }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
