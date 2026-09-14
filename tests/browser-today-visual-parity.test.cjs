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
  throw new Error('GARANG Today rebuild preview server did not start');
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
    analytics:{events:[{name:'coach_recommendation_shown',date,props:{screen:'coach',date}}]},
    memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'
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
  await page.locator('#garangTodayRebuild').waitFor({state:'visible',timeout:10000});
  await page.waitForFunction(()=>{
    const main=document.getElementById('main');
    const flow=document.getElementById('garangTodayFlow');
    return main?.dataset?.garangScreen==='today'&&flow?.getAttribute('aria-hidden')==='true'&&flow?.classList.contains('gtr1-legacy-hidden');
  },null,{timeout:7000});
  await page.waitForFunction(()=>document.querySelector('#garangTodayRebuild .gtr1-next-card')?.getBoundingClientRect().height>0,{timeout:7000});
  /* Single-next-action performs one delayed canonical reconciliation (~420ms).
     Verify the settled rebuilt node rather than racing that intentional replacement. */
  await page.waitForTimeout(650);
  await page.waitForFunction(()=>{
    const root=document.getElementById('garangTodayRebuild');
    const detail=root?.querySelector('[data-gtr1-detail]');
    const flow=document.getElementById('garangTodayFlow');
    if(!root||!detail||flow?.getAttribute('aria-hidden')!=='true')return false;
    const r=detail.getBoundingClientRect(),cs=getComputedStyle(detail);
    return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>=44;
  },null,{timeout:7000});
  return {context,page,errors};
}

async function verifyViewport(browser,width,height,options={}){
  const {context,page,errors}=await bootContext(browser,width,height,options);
  const root=page.locator('#garangTodayRebuild');
  assert.equal(await page.locator('#main').getAttribute('data-garang-screen'),'today');
  assert.equal(await root.isVisible(),true,'rebuilt Today must own the visible Today surface');
  assert.equal(await page.locator('#garangTodayFlow').getAttribute('aria-hidden'),'true','canonical legacy Today remains internalized');
  assert.equal(await page.locator('#garangTodayFlow').evaluate(el=>el.classList.contains('gtr1-legacy-hidden')),true,'legacy Today must not compete visually');
  assert.equal(await page.locator('#garangTodayBrandHero:visible').count(),0,'retired brand hero must not be visible');
  assert.equal(await page.locator('#garangTodayDensity:visible').count(),0,'retired density surface must not be visible');
  assert.equal(await page.locator('.gtd3-motion-canvas').count(),0,'retired Ink Water canvas must not mount in rebuild');

  const style=await root.evaluate(node=>{
    const cs=getComputedStyle(node),hero=node.querySelector('.gtr1-hero h1'),next=node.querySelector('.gtr1-next-card');
    const heroStyle=hero?getComputedStyle(hero):null,nextStyle=next?getComputedStyle(next):null;
    return {
      bg:cs.backgroundColor,color:cs.color,width:node.getBoundingClientRect().width,
      heroSize:heroStyle?parseFloat(heroStyle.fontSize):0,
      heroLine:heroStyle?parseFloat(heroStyle.lineHeight):0,
      nextHeight:next?.getBoundingClientRect().height||0,
      nextBg:nextStyle?.backgroundColor||'',
      wordmark:getComputedStyle(document.querySelector('#appView .brand.mini b')).fontFamily
    };
  });
  assert.ok(style.width<=width+1,`rebuilt Today width must fit viewport ${width}: ${JSON.stringify(style)}`);
  assert.ok(style.heroSize>=34,`Today judgment must keep strong editorial hierarchy @${width}: ${style.heroSize}`);
  assert.ok(style.heroLine>0,'Today judgment line-height must resolve');
  assert.ok(style.nextHeight>=64,`Next Action must remain comfortably tappable @${width}: ${style.nextHeight}`);
  assert.match(style.wordmark,/Instrument Sans|Inter/i,'GARANG wordmark must use the locked Instrument Sans stack');

  const headline=(await root.locator('.gtr1-hero h1').innerText()).trim();
  const reason=(await root.locator('.gtr1-hero p').innerText()).trim();
  assert.ok(headline.length>0,'GARANG judgment headline must render from intelligence state');
  assert.ok(reason.length>0,'GARANG judgment support must render');
  assert.equal(await root.locator('.gtr1-track').count(),3,'training/recovery/nutrition must remain one glanceable three-track state');
  assert.equal(await root.locator('.gtr1-score').count(),1,'Today must keep one primary state score');

  const next=root.locator('.gtr1-next-card');
  assert.equal(await next.isVisible(),true,'one rebuilt Next Action must be visible');
  const canonical=await next.getAttribute('data-gtr1-canonical-action');
  assert.ok(canonical||await next.getAttribute('data-gtr1-route')||await next.getAttribute('data-gtr1-action'),'Next Action must retain a functional contract');
  assert.equal(await root.locator('.gtr1-next-card:visible').count(),1,'Today must expose one primary rebuilt CTA');

  const detail=page.locator('#garangTodayRebuild [data-gtr1-detail]');
  const detailMetrics=await detail.evaluate(node=>{const r=node.getBoundingClientRect();return {width:r.width,height:r.height,display:getComputedStyle(node).display,visibility:getComputedStyle(node).visibility};});
  assert.ok(detailMetrics.width>0&&detailMetrics.height>=44&&detailMetrics.display!=='none'&&detailMetrics.visibility!=='hidden',`evidence disclosure must remain touchable: ${JSON.stringify(detailMetrics)}`);
  assert.equal(await detail.getAttribute('aria-expanded'),'false','evidence starts progressively disclosed');
  await detail.click();
  const detailAfter=page.locator('#garangTodayRebuild [data-gtr1-detail]');
  assert.equal(await detailAfter.getAttribute('aria-expanded'),'true','evidence disclosure must open');
  assert.equal(await page.locator('#garangTodayRebuild .gtr1-detail-panel').isVisible(),true,'evidence panel must become visible');

  const layout=await page.evaluate(()=>({
    scroll:document.documentElement.scrollWidth,
    client:document.documentElement.clientWidth,
    body:document.body.getBoundingClientRect().width,
    main:document.getElementById('main')?.getBoundingClientRect().width||0,
    root:document.getElementById('garangTodayRebuild')?.getBoundingClientRect().width||0
  }));
  assert.ok(layout.scroll<=layout.client+1,`Today rebuild must not horizontally overflow ${width}px: ${JSON.stringify(layout)}`);
  assert.ok(layout.body<=width+1&&layout.main<=width+1&&layout.root<=width+1,`Today surfaces must respect viewport ${width}px: ${JSON.stringify(layout)}`);
  assert.deepEqual(errors,[],`Today rebuild browser errors @${width}:\n${errors.join('\n')}`);
  await context.close();
}

async function verifyInstagramInApp(browser){
  const {context,page,errors}=await bootContext(browser,390,844,{userAgent:instagramUA});
  assert.equal(await page.locator('#garangTodayRebuild').isVisible(),true,'Instagram WebKit must boot rebuilt Today');
  assert.equal(await page.locator('.gtd3-motion-canvas').count(),0,'Instagram path must not restore retired motion');
  const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert.ok(layout.scroll<=layout.client+1,`Instagram WebKit Today must not overflow: ${JSON.stringify(layout)}`);
  assert.deepEqual(errors,[],`Instagram in-app Today browser errors:\n${errors.join('\n')}`);
  await context.close();
}

async function verifyReducedMotion(browser){
  const {context,page,errors}=await bootContext(browser,390,844,{reducedMotion:'reduce'});
  assert.equal(await page.locator('#garangTodayRebuild').isVisible(),true,'reduced-motion users must receive the same rebuilt information hierarchy');
  assert.equal(await page.locator('.gtd3-motion-canvas').count(),0,'reduced-motion path must remain motion-free');
  const animated=await page.locator('#garangTodayRebuild *').evaluateAll(nodes=>nodes.filter(node=>{
    const cs=getComputedStyle(node);return cs.animationName&&cs.animationName!=='none'&&parseFloat(cs.animationDuration||'0')>0;
  }).length);
  assert.equal(animated,0,'rebuilt Today must not introduce decorative animation under reduced motion');
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
    console.log('browser-today-visual-parity rebuilt Today v1 + WebKit viewports + reduced motion: PASS');
  }finally{
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error);process.exit(1);});
