'use strict';
const assert=require('node:assert/strict');
const endpoint=String(process.env.GARANG_MEAL_SCAN_ENDPOINT||'https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/meal/scan').trim();
const token=String(process.env.GARANG_FIREBASE_ID_TOKEN||'').trim();
if(!token)throw new Error('GARANG_FIREBASE_ID_TOKEN is required for authenticated production Meal Scan smoke verification.');
if(!endpoint.startsWith('https://'))throw new Error('GARANG_MEAL_SCAN_ENDPOINT must use https.');
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z2ioAAAAASUVORK5CYII=';
(async()=>{
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({image:{mediaType:'image/png',dataUrl:image},language:'ko'})});let body={};try{body=await response.json();}catch{}
 if(response.status===422){assert.equal(body?.error?.code,'MEAL_SCAN_NO_FOOD_DETECTED');console.log(JSON.stringify({status:'PASS',endpoint:new URL(endpoint).pathname,authenticated:true,visionBoundary:'live',result:'NO_FOOD_DETECTED'},null,2));return;}
 assert.equal(response.ok,true,`live Meal Scan failed HTTP ${response.status} code=${body?.error?.code||'unknown'}`);const data=body?.data||{};assert.equal(data.source,'vision');assert.ok(Array.isArray(data.items)&&data.items.length>0);for(const item of data.items){assert.ok(item.name);assert.ok(Number.isFinite(Number(item.grams)));assert.ok(Number.isFinite(Number(item.confidence)));assert.equal('kcal' in item,false,'Vision boundary must not return nutrition');assert.equal('protein' in item,false,'Vision boundary must not return nutrition');}
 console.log(JSON.stringify({status:'PASS',endpoint:new URL(endpoint).pathname,authenticated:true,visionBoundary:'live',provider:String(data.provider||'unknown'),model:String(data.model||'unknown'),items:data.items.length},null,2));
})().catch(error=>{console.error(`production Meal Scan smoke: FAIL ${error?.message||error}`);process.exit(1);});
