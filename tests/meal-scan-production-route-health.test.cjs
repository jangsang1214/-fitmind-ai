'use strict';
const assert=require('node:assert/strict');
const endpoint=String(process.env.GARANG_MEAL_SCAN_ENDPOINT||'https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/meal/scan').trim();
assert.ok(endpoint.startsWith('https://'),'production Meal Scan endpoint must use https');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchRetry(url,options={},attempts=3){let lastError;for(let i=0;i<attempts;i++){try{return await fetch(url,{redirect:'follow',...options});}catch(error){lastError=error;if(i<attempts-1)await sleep(500*(i+1));}}throw lastError;}
async function json(response){try{return await response.json();}catch{return {};}}
(async()=>{
 const unauth=await fetchRetry(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:{mediaType:'image/png',dataUrl:'data:image/png;base64,aGVsbG8='},language:'en'})}),body=await json(unauth);
 assert.equal(unauth.status,401,`production Meal Scan POST boundary expected 401, got ${unauth.status}`);assert.equal(body?.error?.code,'UNAUTHENTICATED');
 const wrong=await fetchRetry(endpoint,{method:'GET',headers:{accept:'application/json'}}),wrongBody=await json(wrong);assert.equal(wrong.status,405,`production Meal Scan GET boundary expected 405, got ${wrong.status}`);assert.equal(wrongBody?.error?.code,'METHOD_NOT_ALLOWED');
 console.log(JSON.stringify({status:'PASS',endpoint:new URL(endpoint).origin+new URL(endpoint).pathname,postUnauthenticated:unauth.status,getWrongMethod:wrong.status,providerInvoked:false},null,2));
})().catch(error=>{console.error(`production Meal Scan route health: FAIL ${error?.message||error}`);process.exit(1);});
