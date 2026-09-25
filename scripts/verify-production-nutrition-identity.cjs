'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');

const mealEndpoint=String(process.env.GARANG_MEAL_SCAN_ENDPOINT||'https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/meal/scan').trim();
const lookupEndpoint=String(process.env.GARANG_NUTRITION_LOOKUP_ENDPOINT||'https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/nutrition/lookup').trim();
const token=String(process.env.GARANG_FIREBASE_ID_TOKEN||'').trim();
const upc='028400090896',gtin14='00028400090896';
const barcodePng=fs.readFileSync(path.join(__dirname,'fixtures/barcode-028400090896.b64'),'utf8').trim();
if(!token)throw new Error('GARANG_FIREBASE_ID_TOKEN is required for authenticated Nutrition Identity production smoke.');
for(const endpoint of [mealEndpoint,lookupEndpoint])if(!endpoint.startsWith('https://'))throw new Error('Production Nutrition Identity endpoints must use https.');

(async()=>{
 const visionResponse=await fetch(mealEndpoint,{
  method:'POST',
  headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:JSON.stringify({mode:'barcode',language:'en',image:{mediaType:'image/png',dataUrl:`data:image/png;base64,${barcodePng}`}})
 });
 const visionBody=await visionResponse.json().catch(()=>({}));
 assert.equal(visionResponse.ok,true,`barcode Vision failed HTTP ${visionResponse.status} code=${visionBody?.error?.code||'unknown'}`);
 const vision=visionBody?.data||{};
 assert.equal(vision.mode,'barcode');
 assert.equal(vision.source,'vision');
 assert.equal(vision.provider,'openai');
 assert.equal(vision?.barcode?.barcode,gtin14,`barcode Vision read unexpected GTIN: ${JSON.stringify(vision?.barcode||{})}`);
 assert.ok(Number(vision?.barcode?.confidence)>=.7,'barcode Vision confidence below release threshold');

 const lookupResponse=await fetch(lookupEndpoint,{
  method:'POST',
  headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:JSON.stringify({items:[{name:'Doritos Nacho Cheese Flavored Tortilla Chips 1 oz',aliases:['Doritos Nacho Cheese 1 oz'],grams:28.3,barcode:upc}],language:'en'})
 });
 const lookupBody=await lookupResponse.json().catch(()=>({}));
 assert.equal(lookupResponse.ok,true,`GTIN-aware nutrition lookup failed HTTP ${lookupResponse.status} code=${lookupBody?.error?.code||'unknown'}`);
 const item=Array.isArray(lookupBody?.items)?lookupBody.items[0]:null;
 assert.ok(item,'GTIN-aware lookup returned no exact source-backed Doritos result');
 assert.equal(item.barcode,gtin14);
 assert.equal(item.nutritionStatus,'estimated');
 assert.equal(item.nutritionSource?.matchRule,'barcode_source_backed');
 const sourceUrl=String(item.nutritionSource?.url||'');
 assert.ok(/^https:\/\//.test(sourceUrl),'GTIN-aware lookup must expose an https primary source URL');
 const host=new URL(sourceUrl).hostname.toLowerCase();
 const official=host==='pepsico.info'||host.endsWith('.pepsico.info')||host==='doritos.com'||host.endsWith('.doritos.com')||host==='fritolay.com'||host.endsWith('.fritolay.com')||host==='pepsico.com'||host.endsWith('.pepsico.com');
 assert.equal(official,true,`GTIN smoke must resolve through an official PepsiCo/Doritos/Frito-Lay source, got ${host}`);
 for(const key of ['kcal','protein','carbs','fat'])assert.ok(Number.isFinite(Number(item[key]))&&Number(item[key])>=0,`GTIN lookup ${key} must be non-negative`);
 assert.ok(Number(item.kcal)>=100&&Number(item.kcal)<=200,`Doritos 1 oz kcal implausible: ${item.kcal}`);

 console.log(JSON.stringify({
  status:'PASS',
  barcodeVision:{endpoint:new URL(mealEndpoint).pathname,upc,gtin14,confidence:vision.barcode.confidence,productText:vision.barcode.productText||null,provider:vision.provider,model:vision.model},
  gtinLookup:{endpoint:new URL(lookupEndpoint).pathname,name:item.name,barcode:item.barcode,kcal:item.kcal,source:sourceUrl,matchRule:item.nutritionSource?.matchRule}
 },null,2));
})().catch(error=>{console.error(`production Nutrition Identity smoke: FAIL ${error?.message||error}`);process.exit(1);});
