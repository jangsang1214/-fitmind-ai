'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');
const {startStaticServer}=require('./helpers/static-server.cjs');
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');

const root=path.resolve(__dirname,'..');
const serveRoot=path.join(root,'dist');
const port=8799;
const baseURL=`http://127.0.0.1:${port}`;

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
      assert.equal(errors.length,0,`Commercial polish must not introduce page errors at ${width}px: ${errors.join('\\n')}`);
      await context.close();
    }
    console.log('browser-founder-approved-polish commercial quality + approved owner boundary 320/360/390/430: PASS');
  }finally{
    if(browser)await browser.close().catch(()=>{});
    await server.close();
  }
})().catch(error=>{console.error(error);process.exit(1);});
