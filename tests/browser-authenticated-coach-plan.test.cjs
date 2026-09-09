'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8778,baseURL=`http://127.0.0.1:${port}`;
const watchdog=setTimeout(()=>{console.error('browser-authenticated-coach-plan: WATCHDOG TIMEOUT');process.exit(1);},70000);
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await sleep(180);}throw new Error('coach plan server did not start');}
async function heartbeat(page,label){await Promise.race([page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,35)))),timeout(2200,`${label}: WebKit main thread stopped responding`)]);}
async function tap(page,selector,label=selector){const loc=page.locator(selector);await loc.waitFor({state:'visible',timeout:7000});await loc.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));await page.waitForTimeout(40);const box=await loc.boundingBox();assert.ok(box,`${label}: missing touch box`);const hit=await loc.evaluate(el=>{const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!h&&(h===el||el.contains(h));});assert.equal(hit,true,`${label}: does not own touch point`);await Promise.race([page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2),timeout(3500,`${label}: physical tap did not settle`)]);await heartbeat(page,label);}
async function coachState(page){return page.evaluate(()=>{const root=document.querySelector('.garang-coach-v2'),active=document.querySelector('#bottomNav button.active')?.dataset.page||null,r=root?.getBoundingClientRect();const planMessage=[...document.querySelectorAll('.g2-message.user .g2-message-text')].some(el=>String(el.textContent||'').includes('내 저장 기록을 기준으로 오늘 실행할 계획을 만들어주고'));return {active,coach:!!root&&!!r&&r.width>0&&r.height>0,screen:document.getElementById('main')?.dataset.garangScreen||'',prompts:document.querySelectorAll('[data-garang-prompt-id]').length,proposal:!!document.querySelector('.g4-agent-proposal'),planMessage,threadKeys:Object.keys(localStorage).filter(k=>k.startsWith('garang_coach_threads_v2::')).sort()};});}

(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});
  await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({status:200,contentType:'application/javascript',body:'/* firebase mocked */'}));
  await context.addInitScript(()=>{
   try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});}catch{}
   window.prompt=()=>{throw new Error('native prompt must not be used by Coach');};window.confirm=()=>{throw new Error('native confirm must not be used by Coach');};
   const date=new Date().toISOString().slice(0,10);
   const remote={meta:{schemaVersion:5,updatedAt:'2026-09-06T00:00:00.000Z',syncOwnerUid:'mock-user'},profile:{name:'Coach Plan User',goal:'퍼포먼스 향상',weight:70},onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',weeklyFrequency:4,availableMinutes:60,preferences:''},preferences:{language:'ko',unit:'metric'},checkins:[{id:'c1',date,sleep:8,energy:4,stress:2,soreness:2}],planner:[],workouts:[{id:'w1',date,name:'벤치프레스',weight:70,reps:8,sets:3}],meals:[],runs:[],body:[],aiChat:[],memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},actionLog:[],errors:[],analytics:{events:[]},plan:'FREE',clientUpdatedAt:'2026-09-06T00:00:00.000Z'};
   const staleDemo={meta:{schemaVersion:5,updatedAt:'2026-09-07T11:00:00.000Z'},profile:{name:'STALE DEMO',goal:'demo',weight:99},onboarding:{complete:true,skipped:false,goal:'demo',experience:'beginner',weeklyFrequency:2,availableMinutes:20,preferences:''},preferences:{language:'ko',unit:'metric'},checkins:[],planner:[],workouts:[],meals:[],runs:[],body:[],aiChat:[],memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},actionLog:[],errors:[],analytics:{events:[]},plan:'FREE'};
   localStorage.setItem('garang_demo_state_v3',JSON.stringify(staleDemo));
   const user={uid:'mock-user',displayName:'Coach Plan User',email:'coach@example.com',updateProfile:async()=>{}};let db;
   class DocRef{constructor(path){this.path=path;this.id=path.split('/').pop();this.firestore=db;}collection(name){return new CollectionRef(`${this.path}/${name}`);}async get(){if(this.path==='users/mock-user/app/state'){await new Promise(r=>setTimeout(r,2200));return {exists:true,id:this.id,ref:this,metadata:{},data:()=>structuredClone(remote),get:f=>remote[f]};}return {exists:false,id:this.id,ref:this,metadata:{},data:()=>null,get:()=>undefined};}async set(data){if(this.path==='users/mock-user/app/state'){Object.assign(remote,structuredClone(data||{}));}return undefined;}async delete(){return undefined;}}
   class CollectionRef{constructor(path,opts={}){this.path=path;this._after=opts.after||null;this._limit=opts.limit||null;}doc(id){return new DocRef(`${this.path}/${id}`);}orderBy(){return this;}startAfter(doc){return new CollectionRef(this.path,{after:doc?.id||String(doc||''),limit:this._limit});}limit(n){return new CollectionRef(this.path,{after:this._after,limit:Number(n)||null});}async get(){return {docs:[]};}}
   db={collection:name=>new CollectionRef(name),batch:()=>({set(){},delete(){},commit:async()=>{}}),runTransaction:async fn=>fn({get:ref=>ref.get(),set:()=>{}})};
   const auth={currentUser:user,onAuthStateChanged(cb){setTimeout(()=>cb(user),20);return ()=>{};},signOut:async()=>{auth.currentUser=null;}};function firestore(){return db;}firestore.FieldValue={serverTimestamp:()=>'mock-server-time'};firestore.FieldPath={documentId:()=>'__name__'};function authFn(){return auth;}authFn.GoogleAuthProvider=function(){};authFn.OAuthProvider=function(){};window.firebase={apps:[{}],initializeApp:()=>({}),auth:authFn,firestore};
   window.__coachRouteTrace=[];
   document.addEventListener('click',e=>{const route=e.target?.closest?.('[data-page]')?.dataset?.page||null;const prompt=e.target?.closest?.('[data-garang-prompt-id]')?.dataset?.garangPromptId||null;if(route||prompt)window.__coachRouteTrace.push({kind:'click',route,prompt,t:performance.now()});},true);
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e?.stack||e?.message||e)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
  await tap(page,'#bottomNav button[data-page="coach"]','open Coach');await page.waitForFunction(()=>document.querySelector('.garang-coach-v2')&&document.querySelector('.gcl-context-actions [data-gcl-coach="0"]'),null,{timeout:10000});
  let before=await coachState(page);assert.equal(before.active,'coach',`Coach must own route before plan tap: ${JSON.stringify(before)}`);assert.equal(before.coach,true);
  assert.ok(before.threadKeys.includes('garang_coach_threads_v2::garang_user_mock-user_v3'),`authenticated Coach must pin its thread store to the signed-in account even before cloud hydration: ${JSON.stringify(before)}`);
  assert.equal(before.threadKeys.some(k=>k.endsWith('garang_demo_state_v3')),false,`authenticated Coach must never bind to a stale demo record: ${JSON.stringify(before)}`);
  assert.equal(await page.locator('.gcl-context-actions [data-gcl-actions-toggle]').count(),1,'authenticated Coach must expose one quiet next-action disclosure');
  assert.equal(await page.locator('.gcl-context-actions [data-gcl-actions-panel]').isHidden(),true,'authenticated Coach actions must start closed');
  await tap(page,'.gcl-context-actions [data-gcl-actions-toggle]','open Coach next action');
  await page.locator('.gcl-context-actions [data-gcl-actions-panel]').waitFor({state:'visible',timeout:2500});
  assert.ok(await page.locator('.gcl-context-actions [data-gcl-actions-panel] [data-gcl-coach]:visible').count()>=2,'authenticated Coach actions must remain usable after disclosure');
  await tap(page,'.gcl-context-actions [data-gcl-coach="0"]','Create plan prompt');
  await page.waitForFunction(()=>[...document.querySelectorAll('.g2-message.user .g2-message-text')].some(el=>el.textContent.includes('내 저장 기록을 기준으로 오늘 실행할 계획을 만들어주고')),null,{timeout:5000});
  for(let i=0;i<12;i++){await sleep(250);await heartbeat(page,`plan settle ${i}`);const state=await coachState(page);assert.equal(state.active,'coach',`plan prompt must not leave Coach at sample ${i}: ${JSON.stringify(state)}`);assert.equal(state.coach,true,`Coach root disappeared at sample ${i}: ${JSON.stringify(state)}`);assert.ok(state.planMessage||state.proposal,`cloud hydration must not reset the active Coach conversation at sample ${i}: ${JSON.stringify(state)}`);}
  await page.waitForFunction(()=>document.querySelector('.g4-agent-proposal'),null,{timeout:7000});
  let proposed=await coachState(page);assert.equal(proposed.active,'coach',`plan proposal must remain in Coach: ${JSON.stringify(proposed)}`);assert.equal(proposed.proposal,true);
  await tap(page,'.g4-agent-proposal [data-g4-approve]','approve plan');
  await sleep(700);await heartbeat(page,'approved plan settles');
  const after=await coachState(page);assert.equal(after.active,'coach',`approved plan must not leave Coach: ${JSON.stringify(after)}`);assert.equal(after.coach,true);assert.ok(after.planMessage,`approval must not reset Coach thread: ${JSON.stringify(after)}`);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('garang_user_mock-user_v3')||'null'));
  assert.ok(Array.isArray(saved?.planner)&&saved.planner.some(p=>p.source==='ai'),`approved plan must persist: ${JSON.stringify(saved?.planner||[])}`);
  await tap(page,'.g2-mobile-threads','open Coach conversations');
  await tap(page,'.g2-thread-row.active [data-thread-menu]','open thread menu');
  await tap(page,'.g2-thread-popover [data-act="rename"]','rename conversation');
  const rename=page.locator('[data-g2-rename-input]');await rename.fill('계획 테스트 대화');await tap(page,'.g2-thread-popover [data-act="rename-save"]','save thread name');
  assert.equal((await coachState(page)).active,'coach','renaming a Coach thread must not navigate away');
  await tap(page,'.g2-thread-row.active [data-thread-menu]','reopen thread menu');
  await tap(page,'.g2-thread-popover [data-act="delete"]','arm delete');
  assert.match(await page.locator('.g2-thread-popover [data-act="delete"]').textContent(),/한 번 더/,'delete must require an in-app second tap');
  await tap(page,'.g2-thread-popover [data-act="delete"]','confirm delete');
  await heartbeat(page,'thread delete settles');assert.equal((await coachState(page)).active,'coach','deleting a Coach thread must not navigate away');
  const trace=await page.evaluate(()=>window.__coachRouteTrace||[]);assert.equal(trace.filter(x=>x.route&&x.route!=='coach').length,0,`plan/thread actions emitted unexpected route click: ${JSON.stringify(trace)}`);
  assert.deepEqual(errors,[],`authenticated Coach plan runtime errors:\n${errors.join('\n')}`);
  console.log('browser-authenticated-coach-plan: PASS');
 }finally{clearTimeout(watchdog);if(browser)await browser.close().catch(()=>{});if(server.exitCode===null)server.kill('SIGTERM');}
})().catch(error=>{clearTimeout(watchdog);console.error(error);process.exit(1);});
