'use strict';
const assert=require('node:assert/strict');
const endpoint=String(process.env.GARANG_NUTRITION_LOOKUP_ENDPOINT||'https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/nutrition/lookup').trim();
const token=String(process.env.GARANG_FIREBASE_ID_TOKEN||'').trim();
if(!token)throw new Error('GARANG_FIREBASE_ID_TOKEN is required for authenticated production nutrition lookup verification.');
(async()=>{
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({items:[{name:'아메리카노',aliases:['Americano','black coffee'],grams:355}],language:'ko'})});
 const body=await response.json().catch(()=>({}));
 assert.equal(response.ok,true,`nutrition lookup failed HTTP ${response.status} code=${body?.error?.code||'unknown'}`);
 const item=Array.isArray(body?.items)?body.items[0]:null;
 assert.ok(item,'nutrition lookup returned no source-backed Americano result');
 assert.equal(item.nutritionStatus,'estimated_web');assert.equal(item.nutritionSource?.source,'web_search');
 assert.ok(/^https:\/\//.test(String(item.nutritionSource?.url||'')),'nutrition lookup must expose a source URL');
 for(const key of ['kcal','protein','carbs','fat'])assert.ok(Number.isFinite(Number(item[key]))&&Number(item[key])>=0,`nutrition lookup ${key} must be a non-negative number`);
 assert.ok(Number(item.kcal)<200,'plain Americano estimate is implausibly high; fail closed instead of saving');
 console.log(JSON.stringify({status:'PASS',endpoint:new URL(endpoint).pathname,item:{name:item.name,grams:item.grams,kcal:item.kcal,protein:item.protein,carbs:item.carbs,fat:item.fat,status:item.nutritionStatus,source:item.nutritionSource?.url,title:item.nutritionSource?.title}},null,2));
})().catch(error=>{console.error(`production nutrition lookup smoke: FAIL ${error?.message||error}`);process.exit(1);});
