'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','07_config/garang-services-config.js'),'utf8');
let calls=[];const nativeFetch=async(input,init)=>{calls.push({input,init});return {ok:true,status:200,json:async()=>({answer:'remote'})};};
function boot(user){calls=[];const window={fetch:nativeFetch,firebase:{auth:()=>({currentUser:user})}};const sandbox={window,document:{documentElement:{lang:'ko'}},Headers,console};vm.runInNewContext(source,sandbox,{filename:'garang-services-config.js'});return window;}
(async()=>{
 const user={getIdToken:async()=> 'id-token-1'},window=boot(user),endpoint=window.GARANG_SERVICES.coachEndpoint;
 assert.match(endpoint,/cloudfunctions\.net\/api\/coach$/);assert.equal(window.GARANG_LLM_ENDPOINT,endpoint,'final Coach orchestrator must use the authenticated production gateway endpoint');
 await window.fetch(endpoint,{method:'POST',headers:{'X-Test':'1'},body:JSON.stringify({message:'오늘 벤치 세게 해도 돼?',context:{email:'secret@example.com',profile:{name:'Secret'}},uid:'other-user'})});
 assert.equal(calls.length,1);let sent=calls[0];assert.equal(sent.input,endpoint);assert.equal(sent.init.headers.get('Authorization'),'Bearer id-token-1');let body=JSON.parse(sent.init.body);assert.deepEqual(body,{message:'오늘 벤치 세게 해도 돼?',language:'ko'});assert.equal('context' in body,false);assert.equal('uid' in body,false);
 await window.fetch(endpoint,{method:'POST',body:JSON.stringify({version:'GARANG FINAL AI BASE 1.0',question:'오늘 벤치 세게 해도 돼?',category:'workout',context:{profile:{email:'secret@example.com'}},instructions:'legacy orchestrator packet'})});
 assert.equal(calls.length,2);sent=calls[1];body=JSON.parse(sent.init.body);assert.deepEqual(body,{message:'오늘 벤치 세게 해도 돼?',language:'ko'},'legacy final-orchestrator packet must be normalized to the minimal gateway contract');assert.equal(sent.init.headers.get('Authorization'),'Bearer id-token-1');
 await window.fetch('https://example.com/health',{method:'GET'});assert.equal(calls.at(-1).input,'https://example.com/health','non-Coach fetch must remain untouched');
 const noAuth=boot(null),countBefore=calls.length;await assert.rejects(()=>noAuth.fetch(noAuth.GARANG_SERVICES.coachEndpoint,{method:'POST',body:JSON.stringify({message:'x',context:{secret:true}})}),error=>error?.code==='COACH_AUTH_REQUIRED');assert.equal(calls.length,countBefore,'unauthenticated Coach call must not hit network');
 const appSource=fs.readFileSync(path.join(__dirname,'..','01_app/app.js'),'utf8');assert.match(appSource,/catch\(e\)[\s\S]{0,1200}generateLocalAnswer\(q\)/,'existing deterministic fallback must remain reachable after gateway failure');
 assert.equal(JSON.stringify(window.GARANG_SERVICES).includes('API_KEY'),false,'browser config must contain no provider secret');
 console.log('coach gateway browser transport: PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});