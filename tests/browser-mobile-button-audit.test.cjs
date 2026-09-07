'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8773;
const baseURL=`http://127.0.0.1:${port}`;
const watchdog=setTimeout(()=>{console.error('browser-mobile-button-audit: WATCHDOG TIMEOUT');process.exit(1);},60000);
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms));

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{const r=await fetch(baseURL);if(r.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,180));
  }
  throw new Error('button audit server did not start');
}

async function heartbeat(page,label){
  await Promise.race([
    page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(()=>resolve(true),35)))),
    timeout(2200,`${label}: WebKit main thread stopped responding`)
  ]);
}

async function center(page,selector){
  const loc=page.locator(selector);
  await loc.waitFor({state:'visible',timeout:7000});
  await loc.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));
  await page.waitForTimeout(35);
  return loc;
}

async function tap(page,selector,label=selector){
  const loc=await center(page,selector);
  const box=await loc.boundingBox();
  assert.ok(box,`${label}: button needs a touch box`);
  const hit=await loc.evaluate(el=>{
    const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return !!h&&(h===el||el.contains(h));
  });
  assert.equal(hit,true,`${label}: button must own its touch point`);
  await Promise.race([
    page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2),
    timeout(3500,`${label}: physical tap did not settle`)
  ]);
  await heartbeat(page,label);
}

async function tapVisibleBackdrop(page,selector,label){
  const loc=page.locator(selector);
  await loc.waitFor({state:'visible',timeout:7000});
  const point=await loc.evaluate(el=>{
    const r=el.getBoundingClientRect();
    const inset=12;
    const candidates=[
      [r.left+inset,r.top+r.height/2],
      [r.right-inset,r.top+r.height/2],
      [r.left+r.width/2,r.top+inset],
      [r.left+r.width/2,r.bottom-inset]
    ];
    for(const [x,y] of candidates){
      if(x<0||y<0||x>innerWidth||y>innerHeight)continue;
      const hit=document.elementFromPoint(x,y);
      if(hit&&(hit===el||el.contains(hit)))return {x,y};
    }
    for(let y=Math.max(r.top,0)+8;y<Math.min(r.bottom,innerHeight)-8;y+=32){
      for(let x=Math.max(r.left,0)+8;x<Math.min(r.right,innerWidth)-8;x+=32){
        const hit=document.elementFromPoint(x,y);
        if(hit&&(hit===el||el.contains(hit)))return {x,y};
      }
    }
    return null;
  });
  assert.ok(point,`${label}: no visible backdrop hit area found`);
  await Promise.race([
    page.touchscreen.tap(point.x,point.y),
    timeout(3500,`${label}: physical tap did not settle`)
  ]);
  await heartbeat(page,label);
}

async function route(page,name){
  await tap(page,`#bottomNav button[data-page="${name}"]`,`route ${name}`);
  await page.waitForFunction(route=>document.querySelector(`#bottomNav button[data-page="${route}"]`)?.classList.contains('active'),name,{timeout:5000});
}

(async()=>{
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:serveRoot,stdio:'ignore'});
  let browser;
  try{
    await waitForServer();
    browser=await webkit.launch({headless:true});
    const context=await browser.newContext({
      viewport:{width:390,height:844},isMobile:true,hasTouch:true,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
    });
    await context.addInitScript(()=>{
      try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});}catch{}
      const current={
        meta:{schemaVersion:5,updatedAt:'2026-09-07T00:00:00Z'},profile:{name:'Button Audit',age:23,height:174,weight:67,goal:'퍼포먼스 향상'},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',weeklyFrequency:4,availableMinutes:60,preferences:''},
        preferences:{language:'ko',unit:'metric'},checkins:[],planner:[],workouts:[],meals:[],runs:[],body:[],aiChat:[],actionLog:[],errors:[],
        memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},analytics:{events:[]},plan:'FREE'
      };
      const backup=JSON.parse(JSON.stringify(current));
      backup.meta.updatedAt='2026-09-06T23:00:00Z';
      backup.workouts=[{id:'audit-w1',date:'2026-09-06',name:'Squat',updatedAt:'2026-09-06T23:00:00Z'}];
      backup.meals=[{id:'audit-m1',date:'2026-09-06',name:'Meal',updatedAt:'2026-09-06T23:00:00Z',items:[]}];
      localStorage.setItem('garang_demo','1');
      localStorage.setItem('garang_demo_state_v3',JSON.stringify(current));
      localStorage.setItem('garang_state_recovery_backup_v1::garang_demo_state_v3::audit',JSON.stringify(backup));
    });

    const page=await context.newPage();
    const errors=[];
    const dialogs=[];
    page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
    page.on('dialog',async dialog=>{dialogs.push(`${dialog.type()}:${dialog.message()}`);await dialog.dismiss().catch(()=>{});});

    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
    await page.waitForFunction(()=>document.querySelector('.today-body-panel'),null,{timeout:10000});
    await page.waitForFunction(()=>window.GarangDataMigrationV2?.version==='v3.1',null,{timeout:7000});
    await heartbeat(page,'initial boot');

    for(const name of ['coach','workout','body','progress','today'])await route(page,name);

    await route(page,'coach');
    await page.waitForFunction(()=>document.querySelector('.garang-decision-card')&&document.querySelector('.g2-chat-scroll'),null,{timeout:10000});
    await page.waitForTimeout(150);
    const compact=await page.evaluate(()=>{
      const card=document.querySelector('.garang-decision-card'),toggle=document.querySelector('.garang-decision-toggle'),scroll=document.querySelector('.g2-chat-scroll'),main=document.querySelector('.g2-chat-main');
      return {
        card:card?.getBoundingClientRect().height||0,
        toggle:toggle?.getBoundingClientRect().height||0,
        scroll:scroll?.getBoundingClientRect().height||0,
        rows:main?getComputedStyle(main).gridTemplateRows:'',
        marked:main?.classList.contains('garang-has-decision-card')||false
      };
    });
    assert.equal(compact.marked,true,`Coach decision must own an explicit grid row: ${JSON.stringify(compact)}`);
    assert.ok(compact.card>30&&compact.card<=70,`collapsed GARANG decision must stay compact: ${JSON.stringify(compact)}`);
    assert.ok(compact.toggle<=55,`decision toggle is too tall: ${JSON.stringify(compact)}`);
    assert.ok(compact.scroll>120,`decision row must not consume the chat flex track: ${JSON.stringify(compact)}`);
    await tap(page,'.garang-decision-toggle','decision expand');
    await page.waitForFunction(()=>document.querySelector('.garang-decision-card')?.dataset.expanded==='true');
    await tap(page,'.garang-decision-toggle','decision collapse');
    await page.waitForFunction(()=>document.querySelector('.garang-decision-card')?.dataset.expanded==='false');

    await tap(page,'.g2-head-new','new Coach conversation');
    await tap(page,'.g2-mobile-threads','Coach menu');
    await page.waitForFunction(()=>document.querySelector('.garang-coach-v2')?.classList.contains('sidebar-open'));
    await tapVisibleBackdrop(page,'.g2-sidebar-backdrop','Coach menu backdrop');
    await page.waitForFunction(()=>!document.querySelector('.garang-coach-v2')?.classList.contains('sidebar-open'));

    await page.evaluate(()=>{
      window.__garangAuditSyncClicks=[];
      document.getElementById('syncBadge')?.addEventListener('click',()=>window.__garangAuditSyncClicks.push(performance.now()),true);
    });
    await tap(page,'.g2-mobile-threads','Coach menu for sync');
    await page.waitForFunction(()=>document.querySelector('.garang-coach-v2')?.classList.contains('sidebar-open'));
    await tap(page,'[data-g5-action="sync"]','Coach sidebar sync');
    await page.waitForFunction(()=>!document.querySelector('.garang-coach-v2')?.classList.contains('sidebar-open'),null,{timeout:3000});
    const immediateSyncClicks=await page.evaluate(()=>window.__garangAuditSyncClicks?.length||0);
    assert.equal(immediateSyncClicks,0,'Coach sync must not start persistence work inside the sidebar touch task');
    await page.waitForFunction(()=>window.__garangAuditSyncClicks?.length===1,null,{timeout:3000});
    await page.waitForTimeout(80);
    await heartbeat(page,'Coach deferred sync');
    const coachAfterSync=await page.evaluate(()=>{
      const app=document.getElementById('appView'),root=document.querySelector('.garang-coach-v2'),r=root?.getBoundingClientRect();
      return {
        appVisible:!!app&&!app.hidden,
        coachVisible:!!root&&!!r&&r.width>0&&r.height>0,
        sidebarOpen:root?.classList.contains('sidebar-open')||false,
        syncClicks:window.__garangAuditSyncClicks?.length||0
      };
    });
    assert.equal(coachAfterSync.appVisible,true,`Coach sync must not blank the app: ${JSON.stringify(coachAfterSync)}`);
    assert.equal(coachAfterSync.coachVisible,true,`Coach must remain rendered after sync: ${JSON.stringify(coachAfterSync)}`);
    assert.equal(coachAfterSync.sidebarOpen,false,`Coach sidebar must stay closed after sync: ${JSON.stringify(coachAfterSync)}`);
    assert.equal(coachAfterSync.syncClicks,1,`Coach sync must dispatch once: ${JSON.stringify(coachAfterSync)}`);

    await route(page,'today');
    const mobileChrome=await page.evaluate(()=>({
      syncVisible:!!document.getElementById('syncBadge')&&getComputedStyle(document.getElementById('syncBadge')).display!=='none'&&document.getElementById('syncBadge').getBoundingClientRect().width>0,
      profileVisible:!!document.getElementById('profileTopBtn')&&getComputedStyle(document.getElementById('profileTopBtn')).display!=='none'&&document.getElementById('profileTopBtn').getBoundingClientRect().width>0
    }));
    if(mobileChrome.syncVisible)await tap(page,'#syncBadge','top sync');
    await tap(page,'#menuBtn','hamburger');
    await page.locator('.garang-more-sheet').waitFor({state:'visible',timeout:5000});
    await tap(page,'.garang-more-head button','hamburger close');
    await page.locator('.garang-more-sheet').waitFor({state:'detached',timeout:5000});

    if(mobileChrome.profileVisible){
      await tap(page,'#profileTopBtn','top profile');
      await page.locator('#saveProfile').waitFor({state:'visible',timeout:5000});
      await tap(page,'#saveProfile','save profile');
      await page.locator('#saveProfile').waitFor({state:'visible',timeout:5000});
    }

    await tap(page,'#settingsTopBtn','top settings');
    await page.locator('#savePreferences').waitFor({state:'visible',timeout:5000});
    await tap(page,'#savePreferences','save settings');
    await page.locator('#savePreferences').waitFor({state:'visible',timeout:5000});
    await tap(page,'#retrySync','retry sync');
    await tap(page,'#proInfo','PRO info');

    const downloadPromise=page.waitForEvent('download',{timeout:5000});
    await tap(page,'#exportData','export data');
    const download=await downloadPromise;
    assert.ok((await download.suggestedFilename()).endsWith('.json'),'export button must create a JSON backup');

    await tap(page,'#importLegacy','data recovery check');
    const modal=page.locator('.garang-data-recovery-modal');
    await modal.waitFor({state:'visible',timeout:7000});
    const recoveryLayout=await page.evaluate(()=>{
      const overlay=document.querySelector('.garang-data-recovery-modal'),panel=document.querySelector('.garang-data-recovery-panel'),r=panel?.getBoundingClientRect();
      return {open:document.documentElement.classList.contains('garang-recovery-open'),height:r?.height||0,top:r?.top||0,bottom:r?.bottom||0,viewport:innerHeight,overlayPointer:overlay?getComputedStyle(overlay).pointerEvents:''};
    });
    assert.equal(recoveryLayout.open,true,`recovery modal must own an explicit open state: ${JSON.stringify(recoveryLayout)}`);
    assert.equal(recoveryLayout.overlayPointer,'auto');
    assert.ok(recoveryLayout.height>120&&recoveryLayout.height<=recoveryLayout.viewport-20,`recovery panel must fit the iPhone viewport: ${JSON.stringify(recoveryLayout)}`);
    await heartbeat(page,'recovery modal open');

    await tap(page,'[data-recovery-rescan]','recovery rescan');
    await page.locator('.garang-data-recovery-modal').waitFor({state:'visible',timeout:7000});
    await heartbeat(page,'recovery rescan');

    const restore=page.locator('[data-recovery-restore]');
    await restore.waitFor({state:'visible',timeout:5000});
    assert.equal(await restore.isDisabled(),false,'seeded backup should make recovery action available');
    await tap(page,'[data-recovery-restore]','recovery confirm step');
    const confirmState=await restore.evaluate(el=>({confirming:el.dataset.confirming,text:el.textContent,disabled:el.disabled}));
    assert.equal(confirmState.confirming,'true','recovery must use an in-app second-tap confirmation instead of native confirm');
    assert.equal(confirmState.disabled,false);
    assert.match(confirmState.text,/한 번 더/);
    assert.deepEqual(dialogs,[],`button audit must not trigger blocking browser dialogs: ${dialogs.join(' | ')}`);
    await tap(page,'[data-recovery-close]','recovery close');
    await page.locator('.garang-data-recovery-modal').waitFor({state:'detached',timeout:5000});
    assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('garang-recovery-open')),false,'closing recovery must fully release page scroll state');
    await heartbeat(page,'recovery close');

    await tap(page,'#settingsLogout','settings logout');
    await page.waitForFunction(()=>!document.getElementById('authView')?.hidden,null,{timeout:5000});
    await heartbeat(page,'logout');

    assert.deepEqual(errors,[],`button audit runtime errors:\n${errors.join('\n')}`);
    assert.deepEqual(dialogs,[],`unexpected native dialogs:\n${dialogs.join('\n')}`);
    console.log('browser-mobile-button-audit: PASS');
  }finally{
    clearTimeout(watchdog);
    if(browser)await browser.close().catch(()=>{});
    if(server.exitCode===null)server.kill('SIGTERM');
  }
})().catch(error=>{clearTimeout(watchdog);console.error(error);process.exit(1);});
