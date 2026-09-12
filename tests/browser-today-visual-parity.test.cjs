'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8791;
const baseURL=`http://127.0.0.1:${port}`;
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const instagramUA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 398.0.0.0.0';

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{const r=await fetch(baseURL);if(r.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  throw new Error('GARANG Today visual parity preview server did not start');
}

function seedState(){
  const date=today(),now=new Date().toISOString();
  return {
    meta:{schemaVersion:5,updatedAt:now},
    profile:{name:'Visual Parity',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},
    onboarding:{complete:true,skipped:false,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},
    preferences:{language:'ko',unit:'metric'},planner:[],
    workouts:[{id:'vp-workout',date,name:'하체 운동',sets:4,reps:8,weight:80,rpe:7,duration:45,createdAt:now,updatedAt:now}],
    meals:[{id:'vp-meal',date,name:'계란후라이 + 크림파스타',kcal:1073,protein:48,carbs:112,fat:44,items:[{name:'계란후라이',kcal:273},{name:'크림파스타',kcal:800}],createdAt:now,updatedAt:now}],
    runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'
  };
}

async function bootContext(browser,width,height,options={}){
  const contextOptions={viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:options.reducedMotion||'no-preference'};
  if(options.userAgent)contextOptions.userAgent=options.userAgent;
  const context=await browser.newContext(contextOptions);
  await context.addInitScript(payload=>{
    localStorage.setItem('garang_demo','1');
    localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));
  },seedState());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  await page.waitForFunction(()=>window.GarangTodayDensityV1?.version==='4.0.0',{timeout:10000});
  await page.waitForFunction(()=>window.GarangAccumulationMotionV1?.version==='5.0.0',{timeout:10000});
  await page.waitForFunction(()=>window.GarangAccumulationMotionV1?.quality==='cinematic-asset-v1'&&window.GarangAccumulationMotionV1?.renderer==='media-asset-controller',{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayBrandHero .gac5-shell')&&document.querySelector('#garangTodayDensity')&&document.querySelector('#garangTodayFlow .gtd3-score-head'),{timeout:10000});
  await page.waitForFunction(()=>window.GarangAccumulationMotionV1?.assetStatus!=='manifest-pending',{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('.garang-daily-workout')?.dataset?.expanded==='0',{timeout:10000});
  await page.waitForTimeout(260);
  return {context,page,errors};
}

async function verifyHeroStable(page){
  const same=await page.evaluate(()=>new Promise(resolve=>{
    const hero=document.querySelector('#garangTodayBrandHero');
    const shell=hero?.querySelector('.gac5-shell');
    window.dispatchEvent(new CustomEvent('garang:state-updated'));
    window.dispatchEvent(new CustomEvent('garang:workout-intelligence-rendered'));
    setTimeout(()=>resolve({hero:hero===document.querySelector('#garangTodayBrandHero'),shell:shell===document.querySelector('#garangTodayBrandHero .gac5-shell')}),520);
  }));
  assert.equal(same.hero,true,'Today Hero node must stay mounted across state/lifecycle events');
  assert.equal(same.shell,true,'cinematic media shell must stay mounted across lifecycle events');
}

async function verifyCinematicContract(page,width){
  assert.equal(await page.locator('#main').getAttribute('data-garang-motion-quality'),'cinematic-asset-v1');
  assert.equal(await page.locator('#main').getAttribute('data-garang-motion-renderer'),'media-asset-controller');
  assert.equal(await page.evaluate(()=>window.GarangAccumulationMotionV1?.assetStatus),'production-required','branch intentionally waits for mastered cinematic binaries rather than synthesizing fake water');
  assert.equal(await page.locator('#main').getAttribute('data-garang-cinematic-status'),'production-required');

  const stage=page.locator('#garangTodayBrandHero .gtd3-ripple');
  const stageBox=await stage.boundingBox();
  assert.ok(stageBox&&stageBox.width>=width*.78&&stageBox.height>=80,`mobile cinematic stage must remain large enough @${width}: ${JSON.stringify(stageBox)}`);

  const shell=page.locator('#garangTodayBrandHero .gac5-shell');
  await shell.waitFor({state:'visible',timeout:5000});
  assert.equal(await shell.evaluate(node=>getComputedStyle(node).pointerEvents),'none','cinematic shell must never block interaction');
  assert.equal(await shell.getAttribute('data-garang-cinematic-surface'),'hero');
  assert.equal(await shell.locator('video[data-garang-cinematic-media="idle"]').count(),1,'one stable idle media layer is required');
  assert.equal(await shell.locator('video[data-garang-cinematic-media="event"]').count(),1,'one event media layer is required');
  assert.equal(await shell.locator('canvas').count(),0,'luxury Hero must not synthesize water with Canvas');
  assert.equal(await page.locator('#main .gtd3-motion-canvas').count(),0,'legacy procedural water canvases must be absent');
  assert.equal(typeof await page.evaluate(()=>window.GarangAccumulationMotionV1?.playEvent),'string'==='function'?'function':'function');

  const legacyRipple=page.locator('#garangTodayBrandHero .gtd3-ripple>img');
  assert.equal(await legacyRipple.count(),1,'legacy SVG may remain only as hidden compatibility markup');
  assert.equal(await legacyRipple.evaluate(img=>getComputedStyle(img).display),'none','legacy SVG ripple must never be visible');
}

async function verifyViewport(browser,width,height){
  const {context,page,errors}=await bootContext(browser,width,height);
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today');
  assert.equal(await page.locator('#main').getAttribute('data-garang-motion'),'active');
  assert.equal(await page.locator('#garangTodayBrandHero h1').innerText(),'오늘도, 조금 쌓였습니다.');
  assert.match(await page.locator('#garangTodayBrandHero').innerText(),/작은 기록이 오늘의 몸을 만듭니다/);
  assert.doesNotMatch(await page.locator('#garangTodayBrandHero').innerText(),/QUIETLY|BECOMING/,'Hero must not carry detached decorative English copy');
  assert.equal(await page.locator('#garangTodayBrandHero [data-gtd-coach]').count(),1,'Hero must keep one Coach CTA');
  await verifyCinematicContract(page,width);
  await verifyHeroStable(page);

  const scoreHead=await page.locator('#garangTodayFlow .gtd3-score-head').innerText();
  assert.match(scoreHead,/GARANG SCORE/);assert.match(scoreHead,/오늘/);
  assert.equal(await page.locator('#garangTodayFlow .gtf-track').count(),3,'score composition keeps three state tracks');
  const signalStyle=await page.locator('#garangTodayFlow .gtf-signal').evaluate(node=>({radius:getComputedStyle(node).borderRadius,width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height}));
  assert.ok(parseFloat(signalStyle.radius||'0')<8,'GARANG Score must not fall back to a generic giant donut');
  assert.ok(signalStyle.width<=115&&signalStyle.height<=95,`GARANG Score should stay editorial and compact: ${JSON.stringify(signalStyle)}`);

  const checkin=page.locator('#garangTodayFlow [data-garang-checkin-access="1"]');
  await checkin.waitFor({state:'visible',timeout:5000});
  assert.match(await checkin.innerText(),/오늘 상태 체크인/);assert.match(await checkin.innerText(),/30초/);
  assert.equal(await checkin.locator('canvas').count(),0,'check-in must not repeat decorative procedural water');
  const checkinBox=await checkin.boundingBox();
  assert.ok(checkinBox&&checkinBox.x>=0&&checkinBox.x+checkinBox.width<=width+1,`check-in row must stay inside viewport ${width}: ${JSON.stringify(checkinBox)}`);
  const checkinRadius=await checkin.evaluate(node=>parseFloat(getComputedStyle(node).borderRadius||'0'));
  assert.ok(checkinRadius<4,'check-in must read as a quiet editorial row');
  await checkin.click();await page.locator('.modal-backdrop').waitFor({state:'visible',timeout:3000});await page.locator('.modal-close').click();

  const metrics=page.locator('#garangTodayDensity .gtd3-metric');
  assert.equal(await metrics.count(),4,'Today accumulation must remain one four-signal composition');
  const metricText=(await metrics.allInnerTexts()).join(' | ');
  assert.match(metricText,/45분/);assert.match(metricText,/1,073 kcal/);assert.match(metricText,/2개/);
  assert.equal(await page.locator('#garangTodayDensity .gtd3-record').count(),2,'recent trace should expose at most two rows');

  const workout=page.locator('.garang-daily-workout');
  assert.equal(await workout.getAttribute('data-expanded'),'0');
  assert.equal(await workout.locator('[data-daily-expand]').isHidden(),true);

  const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,main:document.getElementById('main')?.getBoundingClientRect().width||0,body:document.body.getBoundingClientRect().width}));
  assert.ok(layout.scroll<=layout.client+1,`Today must not horizontally overflow ${width}px: ${JSON.stringify(layout)}`);
  assert.ok(layout.main<=width+1&&layout.body<=width+1,`Today root surfaces must respect viewport ${width}px: ${JSON.stringify(layout)}`);
  assert.deepEqual(errors,[],`Today cinematic browser errors @${width}:\n${errors.join('\n')}`);
  await context.close();
}

async function verifyInstagramInApp(browser){
  const {context,page,errors}=await bootContext(browser,390,844,{userAgent:instagramUA});
  assert.equal(await page.evaluate(()=>window.GarangAccumulationMotionV1?.inAppBrowser),true,'Instagram UA must enable in-app media path');
  assert.equal(await page.locator('#garangTodayBrandHero video[playsinline]').count(),2,'both media layers must be inline-playback safe for iOS WebKit');
  assert.equal(await page.locator('#garangTodayBrandHero canvas').count(),0,'Instagram path must not fall back to procedural Canvas water');
  await verifyHeroStable(page);
  assert.deepEqual(errors,[],`Instagram in-app Today browser errors:\n${errors.join('\n')}`);
  await context.close();
}

async function verifyReducedMotion(browser){
  const {context,page,errors}=await bootContext(browser,390,844,{reducedMotion:'reduce'});
  assert.equal(await page.locator('#main').getAttribute('data-garang-motion'),'reduced');
  assert.equal(await page.evaluate(()=>window.GarangAccumulationMotionV1?.reducedMotion),true);
  const videos=page.locator('#garangTodayBrandHero video');
  assert.equal(await videos.count(),2);
  for(let i=0;i<await videos.count();i++)assert.equal(await videos.nth(i).evaluate(v=>v.paused),true,'reduced-motion media must remain paused');
  assert.equal(await page.locator('#garangTodayBrandHero canvas').count(),0,'reduced-motion fallback must remain asset/still based, never Canvas generated');
  const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert.ok(layout.scroll<=layout.client+1,`reduced-motion Today must not overflow: ${JSON.stringify(layout)}`);
  assert.deepEqual(errors,[],`Today reduced-motion browser errors:\n${errors.join('\n')}`);
  await context.close();
}

(async()=>{
  const server=startStaticServer(serveRoot,port);let browser;
  try{
    await waitForServer();browser=await webkit.launch({headless:true});
    await verifyViewport(browser,390,844);
    await verifyViewport(browser,393,852);
    await verifyViewport(browser,430,932);
    await verifyInstagramInApp(browser);
    await verifyReducedMotion(browser);
    console.log('browser-today-visual-parity GARANG cinematic asset controller v5: PASS');
  }finally{
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error);process.exit(1);});