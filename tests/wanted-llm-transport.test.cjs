'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

(async()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../07_config/garang-services-config.js'),'utf8');
 const store=new Map();
 const state={wantedDemo:true,meta:{judgeDataset:{contractVersion:'garang-wanted-judge-data-v1',synthetic:true,spanDays:14}}};
 store.set('garang_wanted_demo_active_v1','1');store.set('garang_signed_out_v1',JSON.stringify(state));
 let nativeCall=null;
 const sandbox={Headers,Response,console,document:{documentElement:{lang:'ko'}},localStorage:{getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)},GARANG_FIREBASE_CONFIG:{projectId:'fitfind-ai'},firebase:{auth:()=>({currentUser:null})},fetch:async(input,init)=>{nativeCall={input,init};return {ok:true,status:200,json:async()=>({ok:true,data:{source:'llm'}})};}};
 sandbox.window=sandbox;sandbox.globalThis=sandbox;
 vm.runInNewContext(source,sandbox,{filename:'garang-services-config.js'});
 const coach=sandbox.GARANG_SERVICES.coachEndpoint,wanted=sandbox.GARANG_SERVICES.wantedCoachEndpoint;
 await sandbox.fetch(coach,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'오늘 회복 상태를 알려줘',language:'ko'})});
 assert.equal(nativeCall.input,wanted);
 const sent=JSON.parse(nativeCall.init.body);assert.equal(sent.message,'오늘 회복 상태를 알려줘');assert.equal(sent.wantedDemo.contractVersion,'garang-wanted-judge-data-v1');assert.equal(sent.wantedDemo.synthetic,true);assert.equal(sent.wantedDemo.state.wantedDemo,true);
 assert.equal(new Headers(nativeCall.init.headers).has('Authorization'),false,'Wanted public demo must not impersonate a signed-in GARANG user');
 assert.equal(sandbox.__GARANG_SERVICE_TRANSPORT_V2__.diagnostics.lastRequest.mode,'wanted_synthetic');
 store.delete('garang_wanted_demo_active_v1');
 await assert.rejects(()=>sandbox.fetch(coach,{method:'POST',body:JSON.stringify({message:'x'})}),/COACH_AUTH_REQUIRED/);
 console.log('Wanted LLM transport isolation: PASS');
})().catch(error=>{console.error(error);process.exit(1);});
