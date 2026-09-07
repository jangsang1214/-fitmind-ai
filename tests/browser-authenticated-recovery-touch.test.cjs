'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8776,baseURL=`http://127.0.0.1:${port}`;
const watchdog=setTimeout(()=>{console.error('browser-authenticated-recovery-touch: WATCHDOG TIMEOUT');process.exit(1);},60000);
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms));
const stage=name=>console.log(`authenticated-recovery-stage: ${name}`);

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,180));}
  throw new Error('authenticated recovery server did not start');
}
async function heartbeat(page,label){
  await Promise.race([
    page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,40))),
    timeout(1800,`${label}: WebKit main thread stalled`)
  ]);
}
async function tap(page,selector,label=selector){
  stage(`tap ${label}`);
  const loc=page.locator(selector);
  await loc.waitFor({state:'visible',timeout:7000});
  await loc.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));
  await page.waitForTimeout(35);
  const box=await loc.boundingBox();assert.ok(box,`${label}: no touch box`);
  const owns=await loc.evaluate(el=>{const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!h&&(h===el||el.contains(h));});
  assert.equal(owns,true,`${label}: does not own hit point`);
  await Promise.race([page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2),timeout(3000,`${label}: physical tap did not settle`)]);
  await heartbeat(page,label);
  stage(`tap ${label} settled`);
}

(async()=>{
  const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:serveRoot,stdio:'ignore'});
  let browser;
  try{
    stage('server');
    await waitForServer();
    browser=await webkit.launch({headless:true});
    const context=await browser.newContext({
      viewport:{width:390,height:844},isMobile:true,hasTouch:true,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
    });
    await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* firebase mocked */'}));
    await context.addInitScript(()=>{
      try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});}catch{}
      window.__mockRecoveryDelay=0;
      window.__mockRecoveryLoadHistory=false;
      const remote={
        meta:{schemaVersion:5,updatedAt:'2026-09-07T00:00:00.000Z',syncOwnerUid:'mock-user'},
        profile:{name:'Recovery User',goal:'퍼포먼스 향상',weight:70},
        onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',weeklyFrequency:4,availableMinutes:60,preferences:''},
        preferences:{language:'ko',unit:'metric'},workouts:[{id:'w-cloud',date:'2026-09-07',name:'스쿼트',weight:80,reps:5,sets:3}],
        meals:[],runs:[],body:[],planner:[],checkins:[],aiChat:[],memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},actionLog:[],errors:[],analytics:{events:[]},plan:'FREE',clientUpdatedAt:'2026-09-07T00:00:00.000Z'
      };
      const user={uid:'mock-user',displayName:'Recovery User',email:'recovery@example.com',updateProfile:async()=>{}};
      let db;
      const delay=()=>new Promise(resolve=>setTimeout(resolve,Number(window.__mockRecoveryDelay)||0));
      class DocRef{
        constructor(path){this.path=path;this.id=path.split('/').pop();this.firestore=db;}
        collection(name){return new CollectionRef(`${this.path}/${name}`);}
        async get(){if(this.path==='users/mock-user/app/state')return {exists:true,id:this.id,ref:this,data:()=>structuredClone(remote)};return {exists:false,id:this.id,ref:this,data:()=>null};}
        async set(){return undefined;}
      }
      class CollectionRef{
        constructor(path){this.path=path;}
        doc(id){return new DocRef(`${this.path}/${id}`);}
        orderBy(){return this;}
        limit(){return this;}
        async get(){
          if(this.path==='users/mock-user/app')return {docs:[]};
          const recoveryLoad=window.__mockRecoveryLoadHistory===true;
          if(recoveryLoad&&(this.path.includes('History')||this.path.endsWith('recoverySnapshots')))await delay();
          const docs=[];
          if(recoveryLoad&&this.path.endsWith('workoutHistory'))for(let i=0;i<120;i++)docs.push({id:`wh-${i}`,data:()=>({record:{id:`wh-${i}`,date:'2026-09-06',name:'벤치프레스',weight:60,reps:8,sets:3,updatedAt:'2026-09-06T00:00:00Z'}})});
          if(recoveryLoad&&this.path.endsWith('recoverySnapshots'))for(let i=0;i<8;i++)docs.push({id:`snap-${i}`,data:()=>({shell:structuredClone(remote)})});
          return {docs};
        }
      }
      db={collection:name=>new CollectionRef(name),runTransaction:async fn=>fn({get:ref=>ref.get(),set:()=>{}})};
      const auth={currentUser:user,onAuthStateChanged(cb){setTimeout(()=>cb(user),20);return ()=>{};},signOut:async()=>{auth.currentUser=null;}};
      function firestore(){return db;}firestore.FieldValue={serverTimestamp:()=>'mock-server-time'};firestore.FieldPath={documentId:()=>'__name__'};
      function authFn(){return auth;}authFn.GoogleAuthProvider=function(){};authFn.OAuthProvider=function(){};
      window.firebase={apps:[{}],initializeApp:()=>({}),auth:authFn,firestore};
    });

    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
    stage('goto');
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
    await page.waitForFunction(()=>window.GarangDataMigrationV2?.version==='v3.3',null,{timeout:8000});
    await heartbeat(page,'authenticated boot settled');

    await tap(page,'#settingsTopBtn','settings gear');
    await page.locator('#importLegacy').waitFor({state:'visible',timeout:7000});
    await page.waitForFunction(()=>document.getElementById('importLegacy')?.textContent?.trim()==='데이터 복구 확인',null,{timeout:2500});
    assert.equal((await page.locator('#importLegacy').innerText()).trim(),'데이터 복구 확인');

    await page.evaluate(()=>{window.__mockRecoveryLoadHistory=true;window.__mockRecoveryDelay=2500;});
    await tap(page,'#importLegacy','authenticated recovery open');
    await page.locator('.garang-data-recovery-modal').waitFor({state:'visible',timeout:900});
    assert.match(await page.locator('.garang-data-recovery-loading').innerText(),/저장된 기록을 안전하게 확인/);
    assert.equal(await page.evaluate(()=>window.GarangDataMigrationV2.scanActive),true,'authenticated scan must be active while cloud history is pending');
    assert.equal(await page.evaluate(()=>/저장된 기록을 안전하게 확인/.test(document.getElementById('toast')?.textContent||'')&&document.getElementById('toast')?.classList.contains('show')),false,'recovery loading must use the closable panel, never the legacy toast');
    await heartbeat(page,'recovery loading remains responsive');

    await tap(page,'.garang-data-recovery-close','close pending recovery');
    await page.locator('.garang-data-recovery-modal').waitFor({state:'detached',timeout:1200});
    assert.equal(await page.evaluate(()=>window.GarangDataMigrationV2.scanActive),false,'closing recovery must detach the UI scan immediately');
    await page.evaluate(()=>{window.__mockRecoveryLoadHistory=false;window.__mockRecoveryDelay=0;});
    await heartbeat(page,'after recovery cancel before navigation');
    await tap(page,'#bottomNav button[data-page="today"]','touch after recovery cancel');
    await page.waitForFunction(()=>document.querySelector('#bottomNav button[data-page="today"]')?.classList.contains('active'),null,{timeout:3000});
    await heartbeat(page,'first navigation heartbeat after recovery cancel');
    await page.waitForTimeout(250);
    await heartbeat(page,'second navigation heartbeat after recovery cancel');

    await page.waitForTimeout(2800);
    assert.equal(await page.locator('.garang-data-recovery-modal').count(),0,'cancelled scan must not reopen a stale modal');
    assert.equal(await page.evaluate(()=>window.GarangDataMigrationV2.scanActive),false,'cancelled Firestore read must stay detached after it eventually settles');
    await heartbeat(page,'post-cancel heartbeat');

    await tap(page,'#settingsTopBtn','settings gear second');
    await page.locator('#importLegacy').waitFor({state:'visible',timeout:7000});
    await page.waitForFunction(()=>document.getElementById('importLegacy')?.textContent?.trim()==='데이터 복구 확인',null,{timeout:2500});
    await page.evaluate(()=>{window.__mockRecoveryLoadHistory=true;window.__mockRecoveryDelay=15;});
    await tap(page,'#importLegacy','authenticated recovery second open');
    await page.waitForFunction(()=>document.querySelector('.garang-data-recovery-panel')?.innerText?.includes('현재 계정의 기기 저장소'),null,{timeout:7000});
    await heartbeat(page,'recovery report responsive');
    await tap(page,'.garang-data-recovery-close','close recovery report');
    await page.locator('.garang-data-recovery-modal').waitFor({state:'detached',timeout:1500});
    await page.evaluate(()=>{window.__mockRecoveryLoadHistory=false;window.__mockRecoveryDelay=0;});
    await heartbeat(page,'final recovery close');

    assert.deepEqual(errors,[],`authenticated recovery runtime errors:\n${errors.join('\n')}`);
    stage('pass');
    console.log('browser-authenticated-recovery-touch: PASS');
  }finally{
    clearTimeout(watchdog);
    if(browser)await browser.close().catch(()=>{});
    if(server.exitCode===null)server.kill('SIGTERM');
  }
})().catch(error=>{clearTimeout(watchdog);console.error(error);process.exit(1);});