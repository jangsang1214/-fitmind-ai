'use strict';
const assert=require('node:assert/strict');

const endpoint=String(process.env.GARANG_MEAL_SCAN_ENDPOINT||'https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/meal/scan').trim();
const token=String(process.env.GARANG_FIREBASE_ID_TOKEN||'').trim();
const positiveImageUrl=String(process.env.GARANG_MEAL_SCAN_POSITIVE_IMAGE_URL||'https://commons.wikimedia.org/wiki/Special:Redirect/file/Caf%C3%A9_americano_2026.jpg?width=500').trim();
if(!token)throw new Error('GARANG_FIREBASE_ID_TOKEN is required for authenticated production Meal Scan smoke verification.');
if(!endpoint.startsWith('https://'))throw new Error('GARANG_MEAL_SCAN_ENDPOINT must use https.');

const negativeImage='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAABMElEQVR4nO3RMQ0AIADAMEADwhCLQGT0YFWwZHOfO+IsHfC7BmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYA7AGbrQIYAoGb4AAAAABJRU5ErkJggg==';

async function callMealScan(image,language='ko'){
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({image,language})});
 let body={};try{body=await response.json();}catch{}
 return {response,body};
}
async function positivePhotoDataUrl(){
 const response=await fetch(positiveImageUrl,{headers:{'User-Agent':'GARANG-production-smoke/1.0'}});
 assert.equal(response.ok,true,`positive Meal Scan fixture download failed HTTP ${response.status}`);
 const type=String(response.headers.get('content-type')||'image/jpeg').split(';')[0].trim().toLowerCase();
 assert.ok(['image/jpeg','image/png','image/webp'].includes(type),`unsupported positive fixture type ${type}`);
 const bytes=Buffer.from(await response.arrayBuffer());assert.ok(bytes.length>1000,'positive Meal Scan fixture unexpectedly small');
 return {mediaType:type,dataUrl:`data:${type};base64,${bytes.toString('base64')}`};
}

(async()=>{
 const negative=await callMealScan({mediaType:'image/png',dataUrl:negativeImage});
 if(negative.response.status===422)assert.equal(negative.body?.error?.code,'MEAL_SCAN_NO_FOOD_DETECTED');
 else throw new Error(`negative Meal Scan should reject non-food image, got HTTP ${negative.response.status} code=${negative.body?.error?.code||'unknown'} items=${JSON.stringify(negative.body?.data?.items||[])}`);

 const image=await positivePhotoDataUrl(),positive=await callMealScan(image);
 assert.equal(positive.response.ok,true,`positive live Meal Scan failed HTTP ${positive.response.status} code=${positive.body?.error?.code||'unknown'}`);
 const data=positive.body?.data||{},items=Array.isArray(data.items)?data.items:[];
 assert.equal(data.source,'vision');assert.equal(data.provider,'openai');assert.ok(String(data.model||'').length>0);assert.ok(items.length>0,'positive live Meal Scan returned no foods');
 const coffee=items.find(item=>[item?.name,...(Array.isArray(item?.aliases)?item.aliases:[])].some(value=>/americano|아메리카노|coffee|커피/i.test(String(value||''))));
 assert.ok(coffee,`positive live Meal Scan did not identify coffee: ${JSON.stringify(items)}`);
 assert.ok(Number(coffee.confidence)>=0&&Number(coffee.confidence)<=1);assert.ok(Number(coffee.grams)>=5);

 console.log(JSON.stringify({
  status:'PASS',endpoint:new URL(endpoint).pathname,authenticated:true,negative:'NO_FOOD_DETECTED',
  positive:{fixture:'Wikimedia Commons Café americano 2026',sourceUrl:positiveImageUrl,provider:data.provider,model:data.model,identified:coffee.name,grams:coffee.grams,confidence:coffee.confidence}
 },null,2));
})().catch(error=>{console.error(`production Meal Scan smoke: FAIL ${error?.message||error}`);process.exit(1);});
