'use strict';
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const {startStaticServer}=require('./helpers/static-server.cjs');
const assert=require('node:assert/strict');
const path=require('node:path');
const {webkit}=require('playwright');

const root=path.resolve(__dirname,'..'),serveRoot=path.join(root,'dist'),port=8794,baseURL=`http://127.0.0.1:${port}`;
const MEAL_ENDPOINT='https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/meal/scan';
const LOOKUP_ENDPOINT='https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/nutrition/lookup';
const state=()=>({meta:{schemaVersion:5,updatedAt:new Date().toISOString()},profile:{name:'Meal Scan',age:29,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,skipped:false,goal:'근육 증가',experience:'intermediate',weeklyFrequency:4,availableMinutes:60,preferences:''},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]},plan:'FREE'});
async function waitForServer(){const deadline=Date.now()+15000;while(Date.now()<deadline){try{const response=await fetch(baseURL);if(response.ok)return;}catch{}await new Promise(resolve=>setTimeout(resolve,180));}throw new Error('real meal scan preview server did not start');}
async function route(page,screen){const ok=await page.evaluate(next=>window.GarangRouter?.navigate?.(next,{source:'real-meal-scan-browser',force:true}),screen);assert.equal(ok,true);await page.waitForFunction(expected=>document.getElementById('main')?.dataset?.garangScreen===expected,screen,{timeout:7000});}

(async()=>{
 const server=startStaticServer(serveRoot,port);let browser;
 try{
  await waitForServer();browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await installAuthenticatedFirebaseMock(context);
  await context.addInitScript(({mealEndpoint,lookupEndpoint})=>{
   const nativeFetch=window.fetch.bind(window);
   window.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:input?.url,method=String(init?.method||input?.method||'GET').toUpperCase();
    if(url===mealEndpoint&&method==='POST'){
     const headers=new Headers(init.headers||{}),request=JSON.parse(String(init.body||'{}'));
     if(request.mode==='label'){
      window.__GARANG_LABEL_SCAN_BROWSER_REQUEST__={authorization:headers.get('Authorization'),request};
      const label={productName:'GARANG 프로틴 바 QA',brand:'GARANG LABS',servingGrams:55,calories:210,protein:20,carbs:24,fat:6,confidence:.95,nutritionConfidence:.94,uncertain:false,notes:'fixture label'};
      return new Response(JSON.stringify({ok:true,label,data:{mode:'label',label,source:'vision',provider:'fixture',model:'fixture-vision',requestId:'label-browser-1'}}),{status:200,headers:{'Content-Type':'application/json'}});
     }
     window.__GARANG_MEAL_SCAN_BROWSER_REQUEST__={authorization:headers.get('Authorization'),request};
     const items=[
      {name:'닭가슴살',aliases:['chicken breast'],grams:120,confidence:.93,portionConfidence:.88,kcal:9999},
      {name:'GARANG QA 음료 ZX91',aliases:['GARANG QA beverage ZX91'],grams:355,confidence:.91,portionConfidence:.84,kcal:7777}
     ];
     return new Response(JSON.stringify({ok:true,items,data:{mode:'meal',items,overallConfidence:.91,uncertain:false,notes:'fixture',source:'vision',provider:'fixture',model:'fixture-vision',requestId:'meal-browser-1'}}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    if(url===lookupEndpoint&&method==='POST'){
     const headers=new Headers(init.headers||{}),request=JSON.parse(String(init.body||'{}'));
     window.__GARANG_NUTRITION_LOOKUP_BROWSER_REQUEST__={authorization:headers.get('Authorization'),request};
     return new Response(JSON.stringify({ok:true,items:[{
      inputIndex:0,name:'GARANG QA 음료 ZX91',grams:355,kcal:5,protein:.3,carbs:.7,fat:0,nutritionStatus:'estimated',
      nutritionSource:{source:'web_search',provider:'OpenAI web_search',sourceType:'manufacturer',title:'Official QA beverage nutrition',url:'https://example.com/official-qa-beverage',basis:'355g serving'}
     }],unresolved:[],data:{source:'web_search',provider:'fixture',model:'fixture-search',requestId:'lookup-browser-1',citationCount:1}}),{status:200,headers:{'Content-Type':'application/json'}});
    }
    return nativeFetch(input,init);
   };
  },{mealEndpoint:MEAL_ENDPOINT,lookupEndpoint:LOOKUP_ENDPOINT});
  await context.addInitScript(payload=>localStorage.setItem('garang_user_mock-user_v3',JSON.stringify(payload)),state());
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(String(error?.stack||error?.message||error)));
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('appView')&&!document.getElementById('appView').hidden,null,{timeout:15000});
  await route(page,'nutrition');
  assert.equal(await page.locator('#pickMealScan').count(),1,'Meal Scan should expose one clear photo entry');
  const chooserPromise=page.waitForEvent('filechooser');await page.locator('#pickMealScan').click();const chooser=await chooserPromise;
  await chooser.setFiles({name:'meal.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z2ioAAAAASUVORK5CYII=','base64')});
  await page.waitForFunction(()=>!!document.querySelector('.meal-scan-preview'));
  await page.locator('#analyzeMealScan').click();
  await page.waitForFunction(()=>document.querySelector('.meal-scan-results')?.innerText.includes('GARANG QA 음료 ZX91'),null,{timeout:7000});
  const requests=await page.evaluate(()=>({meal:window.__GARANG_MEAL_SCAN_BROWSER_REQUEST__,lookup:window.__GARANG_NUTRITION_LOOKUP_BROWSER_REQUEST__}));
  assert.equal(requests.meal.authorization,'Bearer mock-id-token-mock-user','Meal Scan must use authenticated transport');
  assert.equal(requests.lookup.authorization,'Bearer mock-id-token-mock-user','Nutrition lookup must use authenticated transport');
  assert.equal(requests.lookup.request.items.length,1,'Only DB-unmatched foods should use web lookup');
  assert.equal(requests.lookup.request.items[0].name,'GARANG QA 음료 ZX91');
  const resultText=await page.locator('.meal-scan-results').innerText();
  assert.match(resultText,/닭가슴살/);assert.match(resultText,/GARANG QA 음료 ZX91/);assert.match(resultText,/GARANG DB/);assert.match(resultText,/WEB ESTIMATE/);
  assert.doesNotMatch(resultText,/9999|7777/,'Vision provider nutrition must never be rendered as GARANG nutrition');
  assert.equal(await page.locator('.meal-source-link').count(),1,'Web-estimated nutrition should expose its source');
  await page.locator('#confirmMealScan').click();
  await page.evaluate(()=>{if(window.GarangPhotoEvidence){const api=window.GarangPhotoEvidence;window.GarangPhotoEvidence=Object.freeze({...api,store:async()=>true});}});
  await page.locator('.manual-entry').evaluate(node=>{node.open=true;});
  await page.waitForFunction(()=>document.querySelector('#mealDraftArea')?.textContent.includes('GARANG QA 음료 ZX91'));
  const before=await page.evaluate(()=>window.GarangAgentStateBridge.getState());assert.equal(before.meals.length,0,'Meal Scan confirmation must only create a draft');
  await page.locator('#saveMeal').click();await page.waitForTimeout(1200);
  const saved=await page.evaluate(()=>window.GarangAgentStateBridge.getState());
  assert.equal(saved.meals.length,1);assert.equal(saved.meals[0].items.length,2);
  const chicken=saved.meals[0].items.find(x=>x.name==='닭가슴살'),webFallback=saved.meals[0].items.find(x=>x.name==='GARANG QA 음료 ZX91');
  assert.equal(chicken.foodId,'F0486','Vision identity must resolve to canonical GARANG Food DB record');assert.equal(chicken.nutritionStatus,'verified');assert.ok(chicken.kcal>120&&chicken.kcal<140);
  assert.equal(webFallback.foodId,null);assert.equal(webFallback.nutritionStatus,'estimated');assert.equal(webFallback.nutritionSource.source,'web_search');assert.match(webFallback.nutritionSource.url,/official-qa-beverage/);assert.equal(webFallback.scanEvidence.source,'vision+web');
  assert.ok(saved.meals[0].photoEvidence?.id,'confirmed meal must retain Photo Evidence');

  await route(page,'nutrition');
  assert.equal(await page.locator('#pickLabelScan').count(),1,'Nutrition must expose a dedicated Label Scan entry');
  const labelChooserPromise=page.waitForEvent('filechooser');await page.locator('#pickLabelScan').click();const labelChooser=await labelChooserPromise;
  await labelChooser.setFiles({name:'label.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC0lEQVR42mP8/x8AAusB9Y9Z2ioAAAAASUVORK5CYII=','base64')});
  await page.waitForFunction(()=>!!document.querySelector('.meal-scan-preview'));
  await page.locator('#analyzeMealScan').click();
  await page.waitForFunction(()=>document.querySelector('.meal-scan-results')?.innerText.includes('GARANG LABS'),null,{timeout:7000});
  const labelRequest=await page.evaluate(()=>window.__GARANG_LABEL_SCAN_BROWSER_REQUEST__);
  assert.equal(labelRequest.authorization,'Bearer mock-id-token-mock-user','Label Scan must use authenticated transport');
  assert.equal(labelRequest.request.mode,'label','Label Scan must explicitly select the label vision contract');
  const labelText=await page.locator('.meal-scan-results').innerText();
  assert.match(labelText,/GARANG LABS/);assert.match(labelText,/210 kcal/);assert.match(labelText,/LABEL SCAN/);assert.match(labelText,/확인 필요/);
  await page.locator('#confirmMealScan').click();
  await page.locator('.manual-entry').evaluate(node=>{node.open=true;});
  await page.waitForFunction(()=>document.querySelector('#mealDraftArea')?.textContent.includes('GARANG LABS'));
  await page.locator('#saveMeal').click();await page.waitForTimeout(1200);
  const afterLabel=await page.evaluate(()=>window.GarangAgentStateBridge.getState());
  assert.equal(afterLabel.meals.length,2,'Label Scan confirmation must save through the canonical meal path');
  const labelItem=afterLabel.meals[1].items[0];
  assert.equal(labelItem.foodId,null);assert.equal(labelItem.nutritionStatus,'approximate');assert.equal(labelItem.nutritionSource.source,'nutrition_label_scan');assert.equal(labelItem.scanEvidence.source,'label+vision');assert.equal(labelItem.scanEvidence.confirmationRequired,true);
  assert.equal(Math.round(labelItem.kcal),210);assert.equal(Math.round(labelItem.protein),20);
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));assert.ok(width.scroll<=width.client+1,`Meal/Label Scan must not create horizontal overflow: ${JSON.stringify(width)}`);
  assert.deepEqual(errors,[],`Real Meal Scan browser errors:\n${errors.join('\n')}`);
  await context.close();console.log('browser-real-meal-scan WebKit mobile + web fallback + label scan: PASS');
 }finally{if(browser)await browser.close().catch(()=>{});server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exit(1);});
