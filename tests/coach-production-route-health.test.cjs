'use strict';
const assert=require('node:assert/strict');

const endpoint=String(process.env.GARANG_COACH_ENDPOINT||'https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/coach').trim();
assert.ok(endpoint.startsWith('https://'),'production Coach endpoint must use https');

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchRetry(url,options={},attempts=3){
  let lastError;
  for(let i=0;i<attempts;i++){
    try{return await fetch(url,{redirect:'follow',...options});}
    catch(error){lastError=error;if(i<attempts-1)await sleep(500*(i+1));}
  }
  throw lastError;
}
async function json(response){try{return await response.json();}catch{return {};}}

(async()=>{
  const unauthenticated=await fetchRetry(endpoint,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({message:'production route health probe',language:'en'})
  });
  const unauthenticatedBody=await json(unauthenticated);
  assert.equal(unauthenticated.status,401,`production Coach POST boundary expected 401, got ${unauthenticated.status}`);
  assert.equal(unauthenticatedBody?.error?.code,'UNAUTHENTICATED','production Coach route must fail closed before user-state/provider access');

  const wrongMethod=await fetchRetry(endpoint,{method:'GET',headers:{accept:'application/json'}});
  const wrongMethodBody=await json(wrongMethod);
  assert.equal(wrongMethod.status,405,`production Coach GET boundary expected 405, got ${wrongMethod.status}`);
  assert.equal(wrongMethodBody?.error?.code,'METHOD_NOT_ALLOWED','production Coach route must preserve its method boundary');

  console.log(JSON.stringify({status:'PASS',endpoint:new URL(endpoint).origin+new URL(endpoint).pathname,postUnauthenticated:unauthenticated.status,getWrongMethod:wrongMethod.status,providerInvoked:false,userDataRead:false},null,2));
})().catch(error=>{console.error(`production Coach route health: FAIL ${error?.message||error}`);process.exit(1);});
