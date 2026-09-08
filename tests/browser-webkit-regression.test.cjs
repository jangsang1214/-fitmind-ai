'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8768,baseURL=`http://127.0.0.1:${port}`;

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{const r=await fetch(baseURL);if(r.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  throw new Error('WebKit GARANG server did not start');
}

async function tap(page,selector){
  const loc=page.locator(selector);
  await loc.waitFor({state:'visible',timeout:7000});
  const box=await loc.boundingBox();
  assert.ok(box,`${selector} must have touch box`);
  const hit=await loc.evaluate(el=>{
    const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,h=document.elementFromPoint(x,y);
    return !!h&&(h===el||el.contains(h));
  });
  assert.equal(hit,true,`${selector} must own hit point`);
  await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
}

async function tapRecordRoute(page,route){
  await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="log"]');
  const sheet=page.locator('[data-garang-record-sheet="1"]');
  await sheet.waitFor({state:'visible',timeout:3000});
  await tap(page,`[data-garang-record-sheet="1"] [data-garang-record-route="${route}"]`);
  await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,route,{timeout:5000});
  assert.equal(await page.locator('#bottomNav [data-garang-primary-nav="1"][data-page="log"]').getAttribute('aria-current'),'page',`${route} must remain owned by Record`);
}

async function tapVisibleBackdrop(page){
  const loc=page.locator('.g2-sidebar-backdrop');
  await loc.waitFor({state:'visible',timeout:7000});
  const point=await loc.evaluate(el=>{
    const r=el.getBoundingClientRect();
    const minX=Math.max(4,Math.floor(r.left)+4);
    const maxX=Math.min(window.innerWidth-4,Math.ceil(r.right)-4);
    const minY=Math.max(4,Math.floor(r.top)+4);
    const maxY=Math.min(window.innerHeight-70,Math.ceil(r.bottom)-4);
    for(let x=maxX;x>=minX;x-=12){
      for(let y=minY;y<=maxY;y+=24){
        const h=document.elementFromPoint(x,y);
        if(h&&(h===el||el.contains(h)))return {x,y};
      }
    }
    return null;
  });
  assert.ok(point,'.g2-sidebar-backdrop must expose a tappable point outside the open sidebar');
  await page.touchscreen.tap(point.x,point.y);
}

async function waitForSidebarClosed(page){
  await page.waitForFunction(()=>{
    const root=document.querySelector('.garang-coach-v2');
    const sidebar=root?.querySelector('.g2-chat-sidebar');
    if(!root||!sidebar||root.classList.contains('sidebar-open'))return false;
    const r=sidebar.getBoundingClientRect();
    return r.right<=1;
  },{timeout:1500});
}

async function assertCoachSettles(page){
  await page.waitForFunction(()=>document.querySelector('.garang-coach-v2 .g2-chat-head'),{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('.garang-decision-toggle'),{timeout:10000});
  await page.waitForTimeout(250);

  const idleMutations=await page.evaluate(()=>new Promise(resolve=>{
    let childListMutations=0;
    const target=document.getElementById('main');
    const observer=new MutationObserver(records=>{
      childListMutations+=records.filter(record=>record.type==='childList').length;
    });
    observer.observe(target,{childList:true,subtree:true});
    setTimeout(()=>{
      observer.disconnect();
      resolve(childListMutations);
    },400);
  }));
  assert.ok(
    idleMutations<=4,
    `Coach shell must settle instead of self-triggering MutationObserver writes; childList mutations=${idleMutations}`
  );

  await tap(page,'.garang-decision-toggle');
  await page.waitForFunction(()=>document.querySelector('.garang-decision-card')?.dataset.expanded==='true');
  await tap(page,'.garang-decision-toggle');
  await page.waitForFunction(()=>document.querySelector('.garang-decision-card')?.dataset.expanded==='false');

  await tap(page,'.g2-mobile-threads');
  await page.waitForFunction(()=>document.querySelector('.garang-coach-v2')?.classList.contains('sidebar-open'));
  await tapVisibleBackdrop(page);
  await page.waitForFunction(()=>!document.querySelector('.garang-coach-v2')?.classList.contains('sidebar-open'));
  await waitForSidebarClosed(page);

  await tap(page,'.g2-head-new');
  await page.waitForTimeout(80);

  const hitState=await page.evaluate(()=>{
    const selectors=['.g2-mobile-threads','.g2-head-new','.garang-decision-toggle','#bottomNav [data-garang-primary-nav="1"][data-page="today"]'];
    return selectors.map(selector=>{
      const el=document.querySelector(selector);
      if(!el)return {selector,hit:false};
      const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return {selector,hit:!!h&&(h===el||el.contains(h))};
    });
  });
  assert.ok(hitState.every(item=>item.hit),`Coach controls must remain hit-testable after repeated touches: ${JSON.stringify(hitState)}`);
}

(async()=>{
  const server=startStaticServer(serveRoot,port);
  let browser;
  try{
    await waitForServer();
    browser=await webkit.launch({headless:true});
    const context=await browser.newContext({
      viewport:{width:390,height:844},
      isMobile:true,
      hasTouch:true,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
    });
    await context.addInitScript(()=>{
      try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});}catch{}
      localStorage.setItem('garang_demo','1');
      localStorage.setItem('garang_demo_state_v3',JSON.stringify({
        meta:{schemaVersion:5,updatedAt:'2026-09-06T00:00:00Z'},
        profile:{name:'WebKit',weight:70},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},
        preferences:{language:'ko',unit:'metric'},
        workouts:[null,{id:'w1',date:'2026-09-06',name:'Squat'}],
        meals:[null,{id:'m1',date:'2026-09-06',name:'Meal',items:[null,{id:'f1',name:'Egg',grams:100,kcal:150,protein:13,carbs:1,fat:10}]}],
        runs:[],body:[],planner:[],checkins:[],aiChat:[],actionLog:[],errors:[],
        memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},
        analytics:{events:[]},plan:'FREE'
      }));
    });

    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));

    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});
    await page.waitForFunction(()=>document.querySelector('.today-body-panel'),{timeout:10000});

    const layout=await page.evaluate(()=>{
      const main=document.getElementById('main'),s=getComputedStyle(main),top=document.querySelector('.topbar'),menu=document.getElementById('menuBtn'),record=document.querySelector('#bottomNav [data-garang-primary-nav="1"][data-page="log"]'),
        tr=top?.getBoundingClientRect(),mr=menu?.getBoundingClientRect(),rr=record?.getBoundingClientRect(),menuHit=mr?document.elementFromPoint(mr.left+mr.width/2,mr.top+mr.height/2):null,recordHit=rr?document.elementFromPoint(rr.left+rr.width/2,rr.top+rr.height/2):null;
      return {
        x:s.overflowX,y:s.overflowY,max:s.maxHeight,
        quickHidden:!!document.querySelector('.quick-visual-grid')&&getComputedStyle(document.querySelector('.quick-visual-grid')).display==='none',
        primaryCount:document.querySelectorAll('#bottomNav [data-garang-primary-nav="1"]').length,
        top:{top:tr?.top,bottom:tr?.bottom,height:tr?.height},
        menu:{display:menu?getComputedStyle(menu).display:'none',height:mr?.height,hit:!!menuHit&&(menuHit===menu||menu?.contains(menuHit))},
        record:{height:rr?.height||0,hit:!!recordHit&&(recordHit===record||record?.contains(recordHit))}
      };
    });
    assert.equal(layout.x,'visible');
    assert.equal(layout.y,'visible');
    assert.equal(layout.max,'none');
    assert.equal(layout.quickHidden,true,'Today duplicate quick-record grid must stay internalized on WebKit');
    assert.equal(layout.primaryCount,4,'WebKit must expose exactly four primary navigation axes');
    assert.ok(layout.record.height>=44&&layout.record.hit,'Record must replace the hidden quick cards as a real touch target');
    assert.ok(layout.top.height>=50&&layout.top.bottom>0,'physical-iOS topbar must remain on screen');
    assert.notEqual(layout.menu.display,'none');
    assert.ok(layout.menu.height>=30&&layout.menu.hit,'hamburger must own its hit point');

    await tap(page,'[data-today-view="back"]');
    await page.waitForFunction(()=>document.querySelector('[data-today-view="back"]')?.classList.contains('active'));
    await tap(page,'[data-today-view="front"]');

    await page.evaluate(()=>window.scrollTo({top:Math.max(0,document.documentElement.scrollHeight-window.innerHeight),behavior:'auto'}));
    await page.waitForTimeout(80);
    const scrolled=await page.evaluate(()=>{
      const top=document.querySelector('.topbar')?.getBoundingClientRect(),menu=document.getElementById('menuBtn'),mr=menu?.getBoundingClientRect(),record=document.querySelector('#bottomNav [data-garang-primary-nav="1"][data-page="log"]'),rr=record?.getBoundingClientRect(),
        mh=mr?document.elementFromPoint(mr.left+mr.width/2,mr.top+mr.height/2):null,rh=rr?document.elementFromPoint(rr.left+rr.width/2,rr.top+rr.height/2):null;
      return {
        topVisible:!!top&&top.bottom>0&&top.top>=-1,
        menuHit:!!mh&&(mh===menu||menu?.contains(mh)),
        recordHit:!!rh&&(rh===record||record?.contains(rh)),
        scrollY:window.scrollY
      };
    });
    assert.ok(scrolled.scrollY>0,'test must exercise the long Today scroll seen on physical iPhone');
    assert.ok(scrolled.topVisible,'sticky topbar must survive Today scroll');
    assert.ok(scrolled.menuHit,'hamburger must stay tappable after Today scroll');
    assert.ok(scrolled.recordHit,'Record must stay tappable after Today scroll');

    await tap(page,'#menuBtn');
    await page.locator('.garang-more-sheet').waitFor({state:'visible'});
    assert.equal(await page.locator('.garang-more-sheet [data-route="running"]').isHidden(),true,'duplicate Running entry must stay hidden from More');
    await tap(page,'.garang-more-sheet [data-route="planner"]');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='planner',{timeout:5000});

    await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="coach"]');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='coach',{timeout:5000});
    await assertCoachSettles(page);

    await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="today"]');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:5000});
    await tapRecordRoute(page,'workout');
    await tapRecordRoute(page,'body');
    await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="progress"]');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='progress',{timeout:5000});
    await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="coach"]');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='coach',{timeout:5000});
    await tap(page,'#bottomNav [data-garang-primary-nav="1"][data-page="today"]');
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='today',{timeout:5000});

    assert.deepEqual(errors,[],`WebKit runtime errors:\n${errors.join('\n')}`);
    console.log('browser-webkit-regression: PASS');
  }finally{
    if(browser)await browser.close().catch(()=>{});
    server.kill('SIGTERM');
  }
})().catch(error=>{console.error(error);process.exit(1);});
