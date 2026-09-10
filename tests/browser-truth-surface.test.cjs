'use strict';
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8783,baseURL='http://127.0.0.1:'+port;
const pad=value=>String(value).padStart(2,'0');
const localDate=(offset=0)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const response=await fetch(baseURL);if(response.ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,200));}throw new Error('truth-surface preview server did not start');}
function emptyState(){return {meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Truth Surface',age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'};}
async function route(page,screen){const ok=await page.evaluate(next=>window.GarangRouter?.navigate?.(next,{source:'truth-surface-browser',force:true}),screen);assert.equal(ok,true,screen+' must remain reachable through the canonical Router');await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,screen,{timeout:7000});}

(async()=>{
  const server=startStaticServer(serveRoot,port);let browser;
  try{
    await waitForServer();browser=await webkit.launch({headless:true});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.addInitScript(payload=>{localStorage.setItem('garang_demo','1');localStorage.setItem('garang_demo_state_v3',JSON.stringify(payload));},emptyState());
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error?.stack||error?.message||error)));
    await page.goto(baseURL,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,{timeout:15000});

    await route(page,'progress');
    const accumulation=page.locator('#garangAccumulationOverview');await accumulation.waitFor({state:'visible',timeout:7000});
    assert.equal(await page.locator('#garangAccumulationOverview').count(),1,'there must be one canonical accumulation surface');
    assert.equal(await page.locator('#garangAccumulationSummary').count(),0,'legacy duplicate accumulation layer must not paint');
    const emptyText=await accumulation.innerText();assert.match(emptyText,/—/,'empty goal fit must be unknown, not a fabricated percentage');assert.match(emptyText,/신호 기록/,'record coverage must be described as signals, not completed plans');assert.doesNotMatch(emptyText,/4일 연속/,'empty state must not claim a four-day streak');

    await accumulation.locator('[data-gx-details]').click();
    const detail=accumulation.locator('[data-gx-sheet]');await detail.waitFor({state:'visible',timeout:3000});
    const first=detail.locator('[data-gcl-first-record]');await first.waitFor({state:'visible',timeout:3000});await first.click();
    await page.waitForFunction(()=>document.getElementById('main')?.dataset?.garangScreen==='log',{timeout:7000});
    await page.locator('[data-garang-record-sheet="1"]').waitFor({state:'visible',timeout:5000});
    assert.equal(await page.locator('.garang-more-sheet').count(),0,'first record must not reopen the legacy More menu');

    await route(page,'planner');
    const draft=page.locator('[data-garang-daily-plan-draft="1"]');await draft.waitFor({state:'visible',timeout:7000});
    assert.equal(await page.locator('#garangPlanExecution').count(),1,'canonical Planner evidence must remain in the DOM behind an editable daily draft');
    assert.equal(await page.locator('#garangPlanExecution').isVisible(),false,'daily draft must own Planner until it is confirmed or dismissed');
    await draft.locator('[data-gdp-dismiss]').click();
    await draft.waitFor({state:'detached',timeout:3000});
    const planner=page.locator('#garangPlanExecution');await planner.waitFor({state:'visible',timeout:7000});
    assert.equal(await page.locator('#garangPlanExecution').count(),1,'there must be one canonical Planner surface after draft dismissal');
    assert.equal(await page.locator('[data-gx-plan-slot] #addPlan').count(),1,'the existing Planner form must move into the droplet detail');
    assert.equal(await page.locator('.grid.grid-2 .card').filter({hasText:'Agent Write'}).count(),1,'Agent Write capability remains in the DOM for compatibility');
    assert.equal(await page.locator('.grid.grid-2 .card').filter({hasText:'Agent Write'}).isVisible(),false,'duplicate Agent Write panel must stay out of the visible Planner surface');
    await planner.locator('[data-gx-details]').click();
    await planner.locator('[data-gx-sheet]').waitFor({state:'visible',timeout:3000});
    const fields=await page.evaluate(()=>({clientWidth:document.documentElement.clientWidth,fields:['planDate','planTime','planType','planTitle','addPlan'].map(id=>{const el=document.getElementById(id),r=el?.getBoundingClientRect();return {id,width:r?.width||0,right:r?.right||0};})}));
    assert.ok(fields.fields.every(field=>field.width>0&&field.right<=fields.clientWidth+1),'moved Planner fields must remain inside the mobile viewport: '+JSON.stringify(fields));
    await page.locator('#planTitle').fill('저녁 상체 45분');await page.locator('#addPlan').click();
    await page.waitForFunction(()=>document.getElementById('main')?.innerText.includes('저녁 상체 45분'),{timeout:7000});
    assert.equal(await page.locator('#garangPlanExecution').count(),1,'saving a plan must not create a second summary layer');

    const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,'truth surface must not create horizontal overflow: '+JSON.stringify(width));
    assert.deepEqual(errors,[],'truth surface browser errors:\n'+errors.join('\n'));
    await context.close();console.log('browser-truth-surface WebKit mobile: PASS');
  }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
