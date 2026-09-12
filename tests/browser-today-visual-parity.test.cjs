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
    preferences:{language:'ko',unit:'metric'},
    planner:[],
    workouts:[{id:'vp-workout',date,name:'하체 운동',sets:4,reps:8,weight:80,rpe:7,duration:45,createdAt:now,updatedAt:now}],
    meals:[{id:'vp-meal',date,name:'계란후라이 + 크림파스타',kcal:1073,protein:48,carbs:112,fat:44,items:[{name:'계란후라이',kcal:273},{name:'크림파스타',kcal:800}],createdAt:now,updatedAt:now}],
    runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],
    analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'
  };
}

async function canvasHash(locator){
  return locator.evaluate(canvas=>{
    const ctx=canvas.getContext('2d');if(!ctx||!canvas.width||!canvas.height)return 0;
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    const stride=Math.max(4,Math.floor(data.length/2400/4)*4);
    let hash=0,alpha=0;
    for(let i=0;i<data.length;i+=stride){hash=(hash*33+data[i]+data[i+1]*3+data[i+2]*7+data[i+3]*11)>>>0;alpha+=data[i+3];}
    return alpha>0?hash:0;
  });
}

async function bootContext(browser,width,height,options={}){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:options.reducedMotion||'no-preference'});
  await context.addInitScript(payload=>{
    localStorage.setItem('garang_demo','1');
    localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));
  },seedState());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
  await page.waitForFunction(()=>window.GarangTodayDensityV1?.version==='3.0.0',{timeout:10000});
  await page.waitForFunction(()=>window.GarangAccumulationMotionV1?.version==='2.0.0',{timeout:10000});
  await page.waitForFunction(()=>window.GarangAccumulationMotionV1?.quality==='fluid-v2'&&window.GarangAccumulationMotionV1?.renderer==='canvas2d-composite',{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayBrandHero')&&document.querySelector('#garangTodayDensity')&&document.querySelector('#garangTodayFlow .gtd3-score-head'),{timeout:10000});
  await page.waitForFunction(()=>document.querySelectorAll('#main [data-garang-motion-surface]').length===3,{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('.garang-daily-workout')?.dataset?.expanded==='0',{timeout:10000});
  await page.waitForTimeout(320);
  return {context,page,errors};
}

async function verifyViewport(browser,width,height){
  const {context,page,errors}=await bootContext(browser,width,height);
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today');
  assert.equal(await page.locator('#main').getAttribute('data-garang-motion'),'active');
  assert.equal(await page.locator('#main').getAttribute('data-garang-motion-quality'),'fluid-v2');
  assert.equal(await page.locator('#garangTodayBrandHero h1').innerText(),'오늘도, 조금 쌓였습니다.');
  assert.match(await page.locator('#garangTodayBrandHero').innerText(),/작은 기록이 오늘의 몸을 만듭니다/);
  assert.equal(await page.locator('#garangTodayBrandHero [data-gtd-coach]').count(),1,'Hero must keep one Coach CTA');

  const legacyRipple=page.locator('#garangTodayBrandHero .gtd3-ripple>img');
  assert.equal(await legacyRipple.count(),1,'legacy asset may remain as non-visible compatibility markup');
  assert.equal(await legacyRipple.evaluate(img=>getComputedStyle(img).display),'none','legacy SVG ripple must never be user-visible');

  const heroCanvas=page.locator('[data-garang-motion-surface="hero"]');
  const scoreCanvas=page.locator('[data-garang-motion-surface="score"]');
  const checkinCanvas=page.locator('[data-garang-motion-surface="checkin"]');
  for(const [name,canvas] of [['hero',heroCanvas],['score',scoreCanvas],['checkin',checkinCanvas]]){
    await canvas.waitFor({state:'visible',timeout:5000});
    const meta=await canvas.evaluate(node=>({w:node.width,h:node.height,pointer:getComputedStyle(node).pointerEvents,quality:node.dataset.garangMotionQuality}));
    assert.ok(meta.w>0&&meta.h>0,`${name} canvas must have a real backing buffer`);
    assert.equal(meta.pointer,'none',`${name} canvas must never block interaction`);
    assert.equal(meta.quality,'fluid-v2',`${name} canvas must use premium fluid renderer`);
    assert.notEqual(await canvasHash(canvas),0,`${name} canvas must render non-empty pixels`);
  }
  const heroHashA=await canvasHash(heroCanvas);await page.waitForTimeout(260);const heroHashB=await canvasHash(heroCanvas);
  assert.notEqual(heroHashA,heroHashB,'Hero fluid surface must animate when motion is allowed');

  const scoreHead=await page.locator('#garangTodayFlow .gtd3-score-head').innerText();
  assert.match(scoreHead,/GARANG SCORE/);assert.match(scoreHead,/오늘/);
  assert.equal(await page.locator('#garangTodayFlow .gtf-track').count(),3,'score composition keeps three state tracks');

  const checkin=page.locator('#garangTodayFlow [data-garang-checkin-access="1"]');
  await checkin.waitFor({state:'visible',timeout:5000});
  assert.match(await checkin.innerText(),/오늘 상태 체크인/);assert.match(await checkin.innerText(),/30초/);
  const checkinBox=await checkin.boundingBox();
  assert.ok(checkinBox&&checkinBox.x>=0&&checkinBox.x+checkinBox.width<=width+1,`check-in card must stay inside viewport ${width}: ${JSON.stringify(checkinBox)}`);
  const smallBox=await checkin.locator('small').boundingBox();
  assert.ok(smallBox&&smallBox.x>=checkinBox.x-1&&smallBox.x+smallBox.width<=checkinBox.x+checkinBox.width+1,`check-in meta must not clip right: ${JSON.stringify({checkinBox,smallBox})}`);
  await checkin.click();await page.locator('.modal-backdrop').waitFor({state:'visible',timeout:3000});
  await page.locator('.modal-close').click();

  const metrics=page.locator('#garangTodayDensity .gtd3-metric');
  assert.equal(await metrics.count(),4,'Today accumulation must remain one four-signal composition');
  const metricText=(await metrics.allInnerTexts()).join(' | ');
  assert.match(metricText,/45분/,'workout duration must use real Today data');
  assert.match(metricText,/1,073 kcal/,'nutrition metric must use real Today data');
  assert.match(metricText,/2개/,'record count must reflect real Today records');
  assert.equal(await page.locator('#garangTodayDensity .gtd3-record').count(),2,'recent trace should expose at most two rows');

  const workout=page.locator('.garang-daily-workout');
  assert.equal(await workout.getAttribute('data-expanded'),'0','daily workout must be compact by default');
  assert.equal(await workout.locator('[data-daily-expand]').isHidden(),true,'workout builder controls stay progressive-disclosure by default');

  const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,main:document.getElementById('main')?.getBoundingClientRect().width||0,body:document.body.getBoundingClientRect().width}));
  assert.ok(layout.scroll<=layout.client+1,`Today visual parity must not horizontally overflow ${width}px: ${JSON.stringify(layout)}`);
  assert.ok(layout.main<=width+1&&layout.body<=width+1,`Today root surfaces must respect viewport ${width}px: ${JSON.stringify(layout)}`);
  assert.deepEqual(errors,[],`Today visual parity browser errors @${width}:\n${errors.join('\n')}`);
  await context.close();
}

async function verifyReducedMotion(browser){
  const {context,page,errors}=await bootContext(browser,390,844,{reducedMotion:'reduce'});
  assert.equal(await page.locator('#main').getAttribute('data-garang-motion'),'reduced');
  assert.equal(await page.evaluate(()=>window.GarangAccumulationMotionV1?.reducedMotion),true,'runtime must respect prefers-reduced-motion');
  const hero=page.locator('[data-garang-motion-surface="hero"]');
  const before=await canvasHash(hero);await page.waitForTimeout(260);const after=await canvasHash(hero);
  assert.notEqual(before,0,'reduced-motion fallback must still render a branded static frame');
  assert.equal(before,after,'reduced-motion fallback must remain static');
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
    await verifyReducedMotion(browser);
    console.log('browser-today-visual-parity premium fluid motion v2 + reduced fallback @390/393/430: PASS');
  }finally{
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error);process.exit(1);});
