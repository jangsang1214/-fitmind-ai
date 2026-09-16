'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const {startStaticServer}=require('./helpers/static-server.cjs');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8776,baseURL=`http://127.0.0.1:${port}`;
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,150));}throw new Error('Wanted browser server did not start');}

(async()=>{
  const server=startStaticServer(serveRoot,port);let browser;
  try{
    await waitForServer();
    browser=await webkit.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* firebase intentionally unavailable for local judging mode */'}));
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error?.message||error)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});

    const entry=page.locator('[data-wanted-demo-start]');
    await entry.waitFor({state:'visible',timeout:10000});
    assert.match(await entry.innerText(),/60초 심사 체험/);
    assert.match(await entry.innerText(),/14일/);
    assert.match(await page.locator('.wanted-submission-kicker').innerText(),/Personal Performance Intelligence/);

    await entry.tap();
    await page.waitForURL(/judge=1/,{timeout:10000});
    await page.waitForFunction(()=>localStorage.getItem('garang_wanted_demo_active_v1')==='1',{timeout:5000});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:10000});
    await page.locator('.wanted-demo-guide').waitFor({state:'visible',timeout:10000});
    assert.equal(await page.locator('#authView').isHidden(),true,'judge mode must bypass auth only for the isolated sample experience');
    assert.match(await page.locator('.wanted-demo-guide').innerText(),/14 DAYS SYNTHETIC DATA/);
    assert.match(await page.locator('.wanted-demo-guide').innerText(),/2주 누적 변화/);

    const sample=await page.evaluate(()=>JSON.parse(localStorage.getItem('garang_signed_out_v1')));
    assert.equal(sample?.wantedDemo,true);
    assert.equal(sample?.profile?.name,'GARANG Demo');
    assert.equal(sample?.meta?.judgeDataset?.synthetic,true);
    assert.equal(sample?.meta?.judgeDataset?.spanDays,14);
    assert.equal(sample?.checkins?.length,14);
    assert.equal(sample?.meals?.length,42);
    assert.ok(sample?.workouts?.length>=16);
    assert.equal(sample?.runs?.length,3);
    assert.equal(sample?.body?.length,3);
    assert.ok(sample?.actionLog?.length>=4);
    assert.equal(new Set(sample.meals.map(meal=>meal.date)).size,14,'meals must visibly span all 14 judging days');
    assert.equal(sample?.checkins?.at(-1)?.soreness>=4,true);
    assert.equal(sample?.checkins?.at(-1)?.stress>=4,true);
    assert.ok(sample?.workouts?.some(workout=>workout.name==='바벨 스쿼트'&&workout.rpe>=9),'recent heavy lower-body evidence must be present');

    await page.locator('[data-wanted-route="today"]').tap();
    await page.waitForFunction(()=>document.querySelector('#bottomNav [data-page="today"]')?.classList.contains('active'),null,{timeout:7000});
    const todayText=await page.locator('#main').innerText();
    assert.match(todayText,/GARANG|오늘/);
    assert.match(todayText,/REPLACE|대체|회복|판단/,'Today must expose an interpreted next-action decision from sample evidence');

    await page.locator('[data-wanted-route="coach"]').tap();
    await page.waitForFunction(()=>document.querySelector('#bottomNav [data-page="coach"]')?.classList.contains('active'),null,{timeout:7000});
    await page.locator('.wanted-coach-demo-note').waitFor({state:'visible',timeout:5000});
    const coachText=await page.locator('#main').innerText();
    assert.match(coachText,/Coach/);
    assert.match(coachText,/14일 합성 기록|deterministic intelligence|심사 체험 모드/);

    await page.locator('[data-wanted-route="progress"]').tap();
    await page.waitForFunction(()=>document.querySelector('#bottomNav [data-page="progress"]')?.classList.contains('active'),null,{timeout:7000});
    const progressText=await page.locator('#main').innerText();
    assert.match(progressText,/GARANG SCORE|진행 상황|Weekly Review/);
    assert.equal(errors.length,0,`Wanted judging journey browser errors: ${errors.join(' | ')}`);

    console.log('Wanted 60-second judging journey with 14-day synthetic history: PASS');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exit(1);});
