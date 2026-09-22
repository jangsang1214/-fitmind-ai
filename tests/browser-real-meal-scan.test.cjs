'use strict';
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8794,baseURL=`http://127.0.0.1:${port}`;
const MEAL_ENDPOINT='https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/meal/scan';
const pad=value=>String(value).padStart(2,'0');
const state=()=>({meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Meal Scan',age:29,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',experience:'intermediate',weeklyFrequency:4,availableMinutes:60,preferences:''},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'});
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const response=await fetch(baseURL);if(response.ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,180));}throw new Error('real meal scan preview server did not start');}
async function route(page,screen){const ok=await page.evaluate(next=>window.GarangRouter?.navigate?.(next,{source:'real-meal-scan-browser',force:true}),screen);assert.equal(ok,true);await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,screen,{timeout:7000});}

(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await installAuthenticatedFirebaseMock(context);
  await context.addInitScript(({endpoint})=>{
   const nativeFetch=window.fetch.bind(window);
   window.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:input?.url,method=String(init?.method||input?.method||'GET').toUpperCase();
    if(url===endpoint&&method==='POST'){
     const headers=new Headers(init.headers||{}),request=JSON.parse(String(init.body||'{}'));
     window.__GARANG_MEAL_SCAN_BROWSER_REQUEST__={authorization:headers.get('Authorization'),request};
     return new Response(JSON.stringify({ok:true,items:[{name:'닭가슴살',aliases:['chicken breast'],grams:120,confidence:.93,kcal:9999}],data:{items:[{name:'닭가슴살',aliases:['chicken breast'],grams:120,confidence:.93,kcal:9999}],overallConfidence:.91,uncertain:false,notes:'fixture',source:'vision',provider:'fixture',model:'fixture-vision',requestId:'meal-browser-1'}}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    return nativeFetch(input,init);
   };
  },{endpoint:MEAL_ENDPOINT});
  await context.addInitScript(payload=>localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload)),state());
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error?.stack||error?.message||error)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
  await route(page,'nutrition');
  const chooserPromise=page.waitForEvent('filechooser');await page.locator('#pickMealScan').click();const chooser=await chooserPromise;
  await chooser.setFiles({name:'meal.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z2ioAAAAASUVORK5CYII=','base64')});
  await page.waitForFunction(()=>!!document.querySelector('.meal-camera-stage.has-photo'));
  await page.locator('#analyzeMealScan').click();
  await page.waitForFunction(()=>document.querySelector('.scan-result-card')?.innerText.includes('닭가슴살'),null,{timeout:7000});
  const request=await page.evaluate(()=>window.__GARANG_MEAL_SCAN_BROWSER_REQUEST__);
  assert.equal(request.authorization,'Bearer mock-id-token-mock-user','Meal Scan must use authenticated transport');
  assert.equal(request.request.image.mediaType,'image/png');assert.ok(String(request.request.image.dataUrl||'').startsWith('data:image/png;base64,'));
  const resultText=await page.locator('.scan-result-card').innerText();assert.match(resultText,/닭가슴살/);assert.doesNotMatch(resultText,/9999/,'provider nutrition must never be rendered as GARANG nutrition');
  assert.match(await page.locator('.photo-evidence-estimate-note').innerText(),/VISION → FOOD DB/);
  await page.locator('#confirmMealScan').click();await page.locator('.manual-entry summary').click();
  await page.waitForFunction(()=>document.querySelector('#mealDraftArea')?.textContent.includes('닭가슴살'));
  const before=await page.evaluate(()=>window.GarangAgentStateBridge.getState());assert.equal(before.meals.length,0,'Meal Scan confirmation must only create a draft');
  await page.locator('#saveMeal').click();await page.waitForFunction(()=>window.GarangAgentStateBridge.getState()?.meals?.length===1,null,{timeout:7000});
  const saved=await page.evaluate(()=>window.GarangAgentStateBridge.getState());const item=saved.meals[0].items[0];
  assert.equal(item.foodId,'F0486','Vision identity must resolve to canonical GARANG Food DB record');assert.equal(item.nutritionStatus,'verified');assert.ok(item.kcal>120&&item.kcal<140,'nutrition must be calculated from Food DB basis, not provider output');assert.equal(item.scanEvidence?.source,'vision');assert.ok(saved.meals[0].photoEvidence?.id,'confirmed meal must retain Photo Evidence');
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,`Meal Scan must not create horizontal overflow: ${JSON.stringify(width)}`);
  assert.deepEqual(errors,[],`Real Meal Scan browser errors:\n${errors.join('\n')}`);await context.close();console.log('browser-real-meal-scan WebKit mobile: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
