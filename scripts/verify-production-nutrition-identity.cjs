'use strict';
const assert=require('node:assert/strict');

const mealEndpoint=String(process.env.GARANG_MEAL_SCAN_ENDPOINT||'https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/meal/scan').trim();
const lookupEndpoint=String(process.env.GARANG_NUTRITION_LOOKUP_ENDPOINT||'https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/nutrition/lookup').trim();
const token=String(process.env.GARANG_FIREBASE_ID_TOKEN||'').trim();

const visionFixtureUrl='https://commons.wikimedia.org/wiki/Special:Redirect/file/Ean13-Beispiel_k.png?width=800';
const visionEan13='5903039449022',visionGtin14='05903039449022';
const lookupUpc='028400090896',lookupGtin14='00028400090896';

if(!token)throw new Error('GARANG_FIREBASE_ID_TOKEN is required for authenticated Nutrition Identity production smoke.');
for(const endpoint of [mealEndpoint,lookupEndpoint])if(!endpoint.startsWith('https://'))throw new Error('Production Nutrition Identity endpoints must use https.');

async function barcodeFixture(){
 const response=await fetch(visionFixtureUrl,{headers:{'User-Agent':'GARANG-production-nutrition-identity-smoke/1.0'}});
 assert.equal(response.ok,true,`barcode fixture download failed HTTP ${response.status}`);
 const mediaType=String(response.headers.get('content-type')||'image/png').split(';')[0].trim().toLowerCase();
 assert.ok(['image/png','image/jpeg','image/webp'].includes(mediaType),`unsupported barcode fixture type ${mediaType}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 assert.ok(bytes.length>1000,'barcode fixture unexpectedly small');
 return {mediaType,dataUrl:`data:${mediaType};base64,${bytes.toString('base64')}`};
}

(async()=>{
 const image=await barcodeFixture();
 const visionResponse=await fetch(mealEndpoint,{
  method:'POST',
  headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:JSON.stringify({mode:'barcode',language:'en',image})
 });
 const visionBody=await visionResponse.json().catch(()=>({}));
 assert.equal(visionResponse.ok,true,`barcode Vision failed HTTP ${visionResponse.status} code=${visionBody?.error?.code||'unknown'}`);
 const vision=visionBody?.data||{};
 assert.equal(vision.mode,'barcode');
 assert.equal(vision.source,'vision');
 assert.equal(vision.provider,'openai');
 assert.equal(vision?.barcode?.barcode,visionGtin14,`barcode Vision read unexpected GTIN: ${JSON.stringify(vision?.barcode||{})}`);
 assert.ok(Number(vision?.barcode?.confidence)>=.7,'barcode Vision confidence below release threshold');

 const lookupResponse=await fetch(lookupEndpoint,{
  method:'POST',
  headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:JSON.stringify({items:[{name:'Doritos Nacho Cheese Flavored Tortilla Chips 1 oz',aliases:['Doritos Nacho Cheese 1 oz'],grams:28.3,barcode:lookupUpc}],language:'en'})
 });
 const lookupBody=await lookupResponse.json().catch(()=>({}));
 assert.equal(lookupResponse.ok,true,`GTIN-aware nutrition lookup failed HTTP ${lookupResponse.status} code=${lookupBody?.error?.code||'unknown'}`);
 const item=Array.isArray(lookupBody?.items)?lookupBody.items[0]:null;
 assert.ok(item,'GTIN-aware lookup returned no exact source-backed Doritos result');
 assert.equal(item.barcode,lookupGtin14);
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
  barcodeVision:{fixture:'Wikimedia EAN-13 example',sourceUrl:visionFixtureUrl,ean13:visionEan13,gtin14:visionGtin14,confidence:vision.barcode.confidence,productText:vision.barcode.productText||null,provider:vision.provider,model:vision.model},
  gtinLookup:{endpoint:new URL(lookupEndpoint).pathname,name:item.name,barcode:item.barcode,kcal:item.kcal,source:sourceUrl,matchRule:item.nutritionSource?.matchRule}
 },null,2));
})().catch(error=>{console.error(`production Nutrition Identity smoke: FAIL ${error?.message||error}`);process.exit(1);});
