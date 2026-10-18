'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {webkit}=require('playwright');
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8799;
const baseURL=`http://127.0.0.1:${port}`;

const indexSource=fs.readFileSync(path.join(root,'index.html'),'utf8');
const coachQuietSource=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-coach-quiet-surface-v1.js'),'utf8');
const swSource=fs.readFileSync(path.join(root,'02_core/sw-runtime.js'),'utf8');
const commercialEntrySource=fs.readFileSync(path.join(root,'03_styles/runtime/garang-reference-ui-commercial-v1.css'),'utf8');
const founderVisualSource=fs.readFileSync(path.join(root,'03_styles/runtime/garang-commercial-target-v3-9.css'),'utf8');
assert.match(indexSource,/garang-core-loop-v1\.js\?v=1\.1\.4-commercial-v3/,'Modified core loop must use a rotated direct-script cache key');
assert.match(indexSource,/garang-coach-quiet-surface-v1\.js\?v=1\.0\.3-route-reset/,'Modified Coach quiet surface must use a rotated direct-script cache key');
assert.match(coachQuietSource,/if\(main\.dataset\.garangScreen!=='coach'\)\{\s*coachActionDisclosureExpanded=false;\s*return;/,'Coach disclosure state must reset when leaving Coach');
assert.match(commercialEntrySource,/garang-commercial-target-v3-9\.css\?v=3\.9\.1-founder-board-exact/,'Founder-approved final visual layer must use the exact-board cache key');
for(const asset of [
  './03_styles/runtime/garang-reference-ui-commercial-v1.css?v=1.0.1-layout-safe',
  './03_styles/runtime/garang-commercial-target-v3.css?v=3.0.0-founder-approved',
  './03_styles/runtime/garang-commercial-target-v3-1.css?v=3.1.0-screenshot-driven',
  './03_styles/runtime/garang-commercial-target-v3-2.css?v=3.2.0-live-set-contract',
  './03_styles/runtime/garang-commercial-target-v3-3.css?v=3.3.0-detail-access',
  './03_styles/runtime/garang-commercial-target-v3-4.css?v=3.4.0-progressive-details',
  './03_styles/runtime/garang-commercial-target-v3-5.css?v=3.5.0-nutrition-actions',
  './03_styles/runtime/garang-commercial-target-v3-6.css?v=3.6.0-draft-reset-access',
  './03_styles/runtime/garang-commercial-target-v3-7.css?v=3.7.0-screenshot-integrity',
  './03_styles/runtime/garang-commercial-target-v3-8.css?v=3.8.0-workout-draft-touch',
  './03_styles/runtime/garang-commercial-target-v3-9.css?v=3.9.1-founder-board-exact',
  './03_styles/runtime/garang-commercial-i18n-v1.css?v=1.0.0-language-safe',
  './05_assets/commercial-approved-v3/today-anatomy-hero.jpg',
  './05_assets/commercial-approved-v3/workout-benchpress-hero.jpg',
  './05_assets/commercial-approved-v3/nutrition-meal-hero.jpg',
  './05_assets/commercial-approved-v3/body-anatomy-hero.jpg',
  './05_assets/commercial-approved-v3/session-summary-anatomy.jpg'
])assert.ok(swSource.includes(asset),`PWA app shell must precache ${asset}`);
for(const asset of [
  'today-anatomy-hero.jpg',
  'workout-benchpress-hero.jpg',
  'nutrition-meal-hero.jpg',
  'body-anatomy-hero.jpg',
  'session-summary-anatomy.jpg'
])assert.ok(founderVisualSource.includes(asset),`Final Founder visual layer must actually consume ${asset}`);

async function waitServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{const response=await fetch(baseURL);if(response.ok)return;}catch{}
    await new Promise(resolve=>setTimeout(resolve,160));
  }
  throw new Error('Founder-approved polish preview server did not start');
}

function state(){
  const now=new Date().toISOString();
  return {
    meta:{schemaVersion:5,updatedAt:now,dailyPlanDrafts:{}},
    profile:{name:'Commercial Polish',age:29,height:176,weight:73,gender:'male',goal:'퍼포먼스 향상'},
    onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',equipmentProfile:'full_gym',weeklyFrequency:4,availableMinutes:55},
    preferences:{language:'ko',unit:'metric'},settings:{},privacy:{consent:{analytics:false}},planner:[],
    workouts:[],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],physiologicalSignals:[],aiChat:[],actionLog:[],errors:[],
    memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},analytics:{events:[]},foodIdentity:{barcodes:[],misses:[],corrections:[]},plan:'FREE'
  };
}

(async()=>{
  const server=startStaticServer(serveRoot,port);
  let browser;
  try{
    await waitServer();
    browser=await webkit.launch({headless:true});
    for(const width of [320,360,390,430]){
      const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
      await installAuthenticatedFirebaseMock(context);
      await context.addInitScript(payload=>localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload)),state());
      const page=await context.newPage();
      const errors=[];page.on('pageerror',error=>errors.push(String(error?.message||error)));
      await page.goto(baseURL,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
      await page.waitForFunction(()=>window.GarangReferenceUIV2?.version==='garang-reference-ui-v2.0.0',null,{timeout:8000});
      await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangReferenceUi==='v2',null,{timeout:8000});
      assert.equal(await page.locator('link[data-garang-reference-ui-commercial="1"]').count(),1,'Founder-approved commercial polish stylesheet must be loaded exactly once');
      assert.equal(await page.locator('#garangGoldenMaster').count(),0,'Commercial polish must not introduce a competing Golden Master shell');
      const geometry=await page.evaluate(()=>({viewport:innerWidth,doc:document.documentElement.scrollWidth,body:document.body.scrollWidth,navButtons:[...document.querySelectorAll('#bottomNav [data-garang-primary-nav="1"]')].map(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height};})}));
      assert.ok(geometry.doc<=geometry.viewport+2&&geometry.body<=geometry.viewport+2,`Commercial polish must not overflow at ${width}px: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.navButtons.length===4&&geometry.navButtons.every(box=>box.w>=44&&box.h>=44),`Approved four-tab navigation must remain touch safe at ${width}px: ${JSON.stringify(geometry.navButtons)}`);
      if(width===390){
        const languageState=await page.evaluate(()=>{
          document.documentElement.lang='en';
          document.documentElement.dispatchEvent(new CustomEvent('garang:language-changed'));
          const label=document.querySelector('.g-ref-screen-today .g-ref-date-copy span');
          if(!label)return null;
          return {fontSize:getComputedStyle(label).fontSize,after:getComputedStyle(label,'::after').content};
        });
        assert.ok(languageState,'Today language-safe label must exist at 390px');
        assert.notEqual(languageState.fontSize,'0px','English Today runtime text must remain visible');
        assert.equal(languageState.after,'none','English Today must not receive the Korean generated pseudo-copy');
      }
      assert.equal(errors.length,0,`Commercial polish must not introduce page errors at ${width}px: ${errors.join('\\n')}`);
      await context.close();
    }
    console.log('browser-founder-approved-polish commercial quality + approved owner boundary 320/360/390/430: PASS');
  }finally{
    if(browser)await browser.close().catch(()=>{});
    await server.close();
  }
})().catch(error=>{console.error(error);process.exit(1);});
