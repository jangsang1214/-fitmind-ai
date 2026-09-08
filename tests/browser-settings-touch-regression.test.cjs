'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8771;
const baseURL=`http://127.0.0.1:${port}`;
const watchdog=setTimeout(()=>{console.error('browser-settings-touch-regression: WATCHDOG TIMEOUT');process.exit(1);},55000);
function stage(name){console.log(`settings-touch-stage: ${name}`);}
const timeout=(ms,label)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(label)),ms));

async function flushRafs(page,count=4){await page.evaluate(n=>new Promise(resolve=>{let left=Math.max(1,Number(n)||1);const next=()=>{left-=1;if(left<=0)resolve();else requestAnimationFrame(next);};requestAnimationFrame(next);}),count);}
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw new Error('WebKit settings regression server did not start');}
async function tap(page,selector){const loc=page.locator(selector);await loc.waitFor({state:'visible',timeout:7000});await loc.scrollIntoViewIfNeeded();await page.waitForTimeout(30);const box=await loc.boundingBox();assert.ok(box,`${selector} must have a touch box`);const hit=await loc.evaluate(el=>{const r=el.getBoundingClientRect(),h=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!h&&(h===el||el.contains(h));});assert.equal(hit,true,`${selector} must own its hit point`);await Promise.race([page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2),timeout(4000,`${selector} physical tap did not settle`)]);}
async function routerNavigate(page,name,source='webkit-settings-test'){const ok=await page.evaluate(({name,source})=>window.GarangRouter?.navigate?.(name,{source,force:true})===true,{name,source});assert.equal(ok,true,`GarangRouter must navigate to ${name}`);await page.waitForFunction(n=>document.getElementById('main')?.dataset?.garangScreen===n,name,{timeout:5000});}
async function route(page,name){await tap(page,`#bottomNav button[data-page="${name}"]`);await page.waitForFunction(n=>document.querySelector(`#bottomNav button[data-page="${n}"]`)?.classList.contains('active'),name,{timeout:5000});}

async function injectStaleLayers(page){
 await page.evaluate(()=>{
  document.querySelector('#settings-test-stale-coach')?.remove();document.querySelector('#settings-test-stale-sheet')?.remove();document.querySelector('#settings-test-stale-modal')?.remove();
  const coach=document.createElement('section');coach.id='settings-test-stale-coach';coach.className='garang-coach-v2 sidebar-open gcp-open';
  const backdrop=document.createElement('div');backdrop.className='g2-sidebar-backdrop';Object.assign(backdrop.style,{position:'fixed',inset:'0',zIndex:'11990',pointerEvents:'auto'});coach.appendChild(backdrop);document.body.appendChild(coach);
  const sheet=document.createElement('div');sheet.id='settings-test-stale-sheet';sheet.className='garang-more-sheet';Object.assign(sheet.style,{position:'fixed',inset:'0',zIndex:'12000',display:'block',visibility:'visible',pointerEvents:'auto',background:'transparent'});document.body.appendChild(sheet);
  const modal=document.createElement('div');modal.id='settings-test-stale-modal';modal.className='modal-backdrop';Object.assign(modal.style,{position:'fixed',inset:'0',zIndex:'12001',display:'block',visibility:'visible',pointerEvents:'auto',background:'transparent'});document.body.appendChild(modal);
  document.body.classList.add('menu-open');
 });
}

async function assertSettingsSettles(page,label){
 const result=await Promise.race([page.evaluate(()=>new Promise(resolve=>{const main=document.getElementById('main');let childListMutations=0;const observer=new MutationObserver(records=>{childListMutations+=records.filter(record=>record.type==='childList').length;});observer.observe(main,{childList:true,subtree:true});setTimeout(()=>{observer.disconnect();resolve({childListMutations,prototypePatched:window.__garangSettingsTextGuardInstalled===true});},500);})),timeout(2500,`${label}: Settings DOM did not settle`)]);
 assert.ok(result.childListMutations<=3,`${label}: Settings must settle; childList mutations=${result.childListMutations}`);assert.equal(result.prototypePatched,false,`${label}: Settings must not monkeypatch Node.prototype`);
}

async function assertSettingsInteractive(page,label){
 stage(`${label}: wait settings controls`);await page.locator('#savePreferences').waitFor({state:'visible',timeout:7000});await page.locator('[data-garang-privacy-v1="1"]').waitFor({state:'visible',timeout:7000});const proInfo=page.locator('#proInfo');await proInfo.waitFor({state:'visible',timeout:7000});await page.waitForFunction(()=>document.getElementById('main')?.dataset.garangScreen==='settings',null,{timeout:3000});await proInfo.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));await page.waitForTimeout(60);
 const state=await page.evaluate(()=>{const target=document.getElementById('proInfo'),r=target?.getBoundingClientRect(),hit=r?document.elementFromPoint(r.left+r.width/2,r.top+r.height/2):null;const blockers=[...document.querySelectorAll('.garang-more-sheet,.modal-backdrop,.gcp-backdrop,.gcp-panel,.g2-sidebar-backdrop')].filter(el=>{const s=getComputedStyle(el),box=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&s.pointerEvents!=='none'&&box.width>0&&box.height>0;}).map(el=>el.className||el.id||el.tagName);return {hit:!!target&&!!hit&&(hit===target||target.contains(hit)),blockers,screen:document.getElementById('main')?.dataset.garangScreen||'',gearHandler:typeof document.getElementById('settingsTopBtn')?.onclick,router:window.GarangRouter?.version||null,privacy:window.GarangPrivacySecurityRuntime?.version||null,legacySafety:window.GarangSettingsTouchSafety?.version||null};});
 assert.equal(state.screen,'settings',`${label}: Settings must own screen id`);assert.equal(state.gearHandler,'function',`${label}: canonical top gear handler must remain intact`);assert.equal(state.router,'garang-router-v1.1.0',`${label}: canonical router must own route transport`);assert.equal(state.privacy,'v1.4',`${label}: canonical privacy runtime must own Settings privacy`);assert.equal(state.legacySafety,null,`${label}: retired Settings safety overlay must stay absent`);assert.equal(state.hit,true,`${label}: Settings control must be hit-testable; ${JSON.stringify(state)}`);assert.deepEqual(state.blockers,[],`${label}: no stale blocker may remain; ${JSON.stringify(state)}`);
 await assertSettingsSettles(page,label);stage(`${label}: tap PRO info`);await tap(page,'#proInfo');await page.locator('#toast.show').waitFor({state:'visible',timeout:3000});
}

(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  stage('server');await waitForServer();browser=await webkit.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});
  await context.addInitScript(()=>{try{Object.defineProperty(navigator,'standalone',{configurable:true,get:()=>true});}catch{}localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify({meta:{schemaVersion:5,updatedAt:'2026-09-07T00:00:00Z'},profile:{name:'WebKit Settings',weight:70},onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},workouts:[],meals:[],runs:[],body:[],planner:[],checkins:[],aiChat:[],actionLog:[],errors:[],memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},analytics:{events:[]},plan:'FREE'}));});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>{const msg=String(e?.stack||e?.message||e);errors.push(msg);console.error(`settings-pageerror: ${msg}`);});
  stage('goto');await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});await page.waitForFunction(()=>document.querySelector('.today-body-panel'),null,{timeout:10000});await page.waitForFunction(()=>window.GarangRouter?.version==='garang-router-v1.1.0'&&window.GarangPrivacySecurityRuntime?.version==='v1.4',null,{timeout:7000});
  const baseline=await page.evaluate(()=>({router:window.GarangRouter?.version||null,legacySafety:window.GarangSettingsTouchSafety?.version||null,gear:typeof document.getElementById('settingsTopBtn')?.onclick,prototypePatched:window.__garangSettingsTextGuardInstalled===true}));assert.equal(baseline.router,'garang-router-v1.1.0');assert.equal(baseline.legacySafety,null,'retired Settings safety runtime must not boot');assert.equal(baseline.gear,'function');assert.equal(baseline.prototypePatched,false);

  stage('physical top gear');await tap(page,'#settingsTopBtn');await assertSettingsInteractive(page,'top-bar settings');
  stage('return today');await route(page,'today');await page.waitForFunction(()=>document.querySelector('.today-body-panel'),null,{timeout:7000});

  stage('inject stale transient layers');await injectStaleLayers(page);const blocked=await page.evaluate(()=>({coach:!!document.getElementById('settings-test-stale-coach'),sheet:!!document.getElementById('settings-test-stale-sheet'),modal:!!document.getElementById('settings-test-stale-modal')}));assert.deepEqual(blocked,{coach:true,sheet:true,modal:true});
  stage('canonical route cleanup into Settings');await routerNavigate(page,'settings','stale-layer-regression');const cleanup=await page.evaluate(()=>({staleCoach:!!document.getElementById('settings-test-stale-coach'),sheet:!!document.getElementById('settings-test-stale-sheet'),modal:!!document.getElementById('settings-test-stale-modal'),menuOpen:document.body.classList.contains('menu-open'),openCoach:[...document.querySelectorAll('.garang-coach-v2.sidebar-open')].length}));assert.deepEqual(cleanup,{staleCoach:false,sheet:false,modal:false,menuOpen:false,openCoach:0},`router cleanup failed: ${JSON.stringify(cleanup)}`);await assertSettingsInteractive(page,'settings after canonical cleanup');

  stage('block native dialogs');await page.evaluate(()=>{window.prompt=()=>{throw new Error('native prompt forbidden in Settings')};window.confirm=()=>{throw new Error('native confirm forbidden in Settings')};});
  stage('privacy demo deletion stays non-destructive');await tap(page,'#deleteAccountSecure');await page.locator('#toast.show').waitFor({state:'visible',timeout:3000});const demoDelete=await page.evaluate(()=>({panelHidden:document.getElementById('deleteAccountPanel')?.hidden===true,message:document.getElementById('toast')?.textContent||''}));assert.equal(demoDelete.panelHidden,true,'demo mode must not expose destructive account deletion');assert.match(demoDelete.message,/로그인 상태/,'demo deletion must require an authenticated account without native dialogs');

  stage('Coach visible gear uses router');await route(page,'coach');await page.waitForFunction(()=>document.querySelector('.garang-coach-v2 .g5-settings')&&document.documentElement.getAttribute('data-garang-coach-shell')==='active',null,{timeout:7000});await flushRafs(page,5);await page.evaluate(()=>{const gear=document.getElementById('settingsTopBtn');window.__settingsHiddenClickEvents=0;gear?.addEventListener('click',()=>{window.__settingsHiddenClickEvents+=1;});});await tap(page,'.garang-coach-v2 .g5-settings');assert.equal(await page.evaluate(()=>window.__settingsHiddenClickEvents||0),0,'Coach Settings must use GarangRouter, not synthetic hidden-gear click');await assertSettingsInteractive(page,'Coach visible settings gear');

  stage('route continuity stress');for(let i=0;i<4;i++){await routerNavigate(page,'coach',`settings-stress-${i}`);await page.waitForFunction(()=>document.querySelector('.garang-coach-v2'),null,{timeout:5000});await routerNavigate(page,'settings',`settings-stress-${i}`);await page.locator('#savePreferences').waitFor({state:'visible',timeout:5000});await flushRafs(page,2);}const continuity=await page.evaluate(()=>({screen:document.getElementById('main')?.dataset?.garangScreen||'',router:window.GarangRouter?.current?.(),legacySafety:!!window.GarangSettingsTouchSafety,stale:[...document.querySelectorAll('#settings-test-stale-coach,#settings-test-stale-sheet,#settings-test-stale-modal')].length}));assert.deepEqual(continuity,{screen:'settings',router:'settings',legacySafety:false,stale:0});

  assert.deepEqual(errors,[],`WebKit settings runtime errors:\n${errors.join('\n')}`);stage('pass');console.log('browser-settings-touch-regression: PASS');
 }finally{clearTimeout(watchdog);if(browser)await Promise.race([browser.close().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,4000))]);if(server.exitCode===null)server.kill('SIGKILL');}
})().catch(error=>{clearTimeout(watchdog);console.error(error);process.exit(1);});
