'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'07_config/firebase-config.js'),'utf8');
const sandbox={window:{}};
vm.runInNewContext(source,sandbox,{filename:'firebase-config.js'});
const cfg=sandbox.window.GARANG_FIREBASE_CONFIG;
assert.ok(cfg&&cfg.apiKey&&cfg.projectId&&cfg.authDomain,'Firebase browser config must be complete');

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fetchRetry(url,options={},attempts=3){
  let lastError;
  for(let i=0;i<attempts;i++){
    try{
      const response=await fetch(url,{redirect:'follow',...options});
      return response;
    }catch(error){lastError=error;if(i<attempts-1)await sleep(500*(i+1));}
  }
  throw lastError;
}

(async()=>{
  const sdkFiles=['firebase-app-compat.js','firebase-auth-compat.js','firebase-firestore-compat.js'];
  for(const file of sdkFiles){
    const primary=`https://www.gstatic.com/firebasejs/10.13.0/${file}`;
    const fallback=`https://cdn.jsdelivr.net/npm/firebase@10.13.0/${file}`;
    const [a,b]=await Promise.all([fetchRetry(primary),fetchRetry(fallback)]);
    assert.equal(a.status,200,`gstatic Firebase SDK unavailable: ${file} -> ${a.status}`);
    assert.equal(b.status,200,`jsDelivr Firebase SDK fallback unavailable: ${file} -> ${b.status}`);
  }

  const authUrl=`https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(cfg.apiKey)}`;
  const authResponse=await fetchRetry(authUrl,{headers:{accept:'application/json'}});
  const authText=await authResponse.text();
  assert.equal(authResponse.ok,true,`Firebase Auth public project config failed: ${authResponse.status} ${authText.slice(0,240)}`);
  let authJson={};try{authJson=JSON.parse(authText);}catch{}
  assert.ok(authJson&&typeof authJson==='object','Firebase Auth public project config must return JSON');

  const firestoreUrl=`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/(default)/documents/garang_health_probe/probe?key=${encodeURIComponent(cfg.apiKey)}`;
  const firestoreResponse=await fetchRetry(firestoreUrl,{headers:{accept:'application/json'}});
  const firestoreText=await firestoreResponse.text();
  let firestoreJson={};try{firestoreJson=JSON.parse(firestoreText);}catch{}
  const status=firestoreJson?.error?.status||'';
  const reachable=firestoreResponse.ok||['PERMISSION_DENIED','UNAUTHENTICATED','NOT_FOUND'].includes(status);
  assert.equal(reachable,true,`Firestore endpoint not reachable for configured project: ${firestoreResponse.status} ${firestoreText.slice(0,240)}`);

  console.log(JSON.stringify({
    status:'PASS',
    projectId:cfg.projectId,
    authDomain:cfg.authDomain,
    gstatic:'reachable',
    jsdelivrFallback:'reachable',
    authPublicConfigStatus:authResponse.status,
    firestoreStatus:firestoreResponse.status,
    firestoreResult:status||'OK'
  },null,2));
})().catch(error=>{console.error(error);process.exit(1);});
