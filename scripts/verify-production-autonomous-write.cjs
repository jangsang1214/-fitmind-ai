'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');

const origin=String(process.env.GARANG_COACH_ORIGIN||'https://asia-northeast3-fitfind-ai.cloudfunctions.net/api').replace(/\/$/,'');
const token=String(process.env.GARANG_FIREBASE_ID_TOKEN||'').trim();
const runKey=String(process.env.GITHUB_RUN_ID||Date.now())+'-'+String(process.env.GITHUB_RUN_ATTEMPT||'1');
const marker='GARANG-SMOKE-'+runKey;
const planMessage=`내일 ${marker} 상체 45분 계획을 만들어서 저장해줘`;
const sensitiveValue=`smoke-${runKey}@example.com`;
const sensitiveMessage=`내 이메일 ${sensitiveValue}을 기억해줘`;

if(!token)throw new Error('GARANG_FIREBASE_ID_TOKEN is required.');
if(!origin.startsWith('https://'))throw new Error('GARANG_COACH_ORIGIN must use https.');

async function jsonRequest(path,{method='GET',body}={}){
 const response=await fetch(origin+path,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 let payload={};try{payload=await response.json();}catch{}
 return {response,payload};
}
async function coach(message){
 const {response,payload}=await jsonRequest('/coach',{method:'POST',body:{message,language:'ko'}});
 assert.equal(response.ok,true,`Coach request failed HTTP ${response.status} code=${payload?.error?.code||'unknown'}`);
 assert.equal(payload?.data?.source,'llm','Coach source must be llm');
 assert.equal(payload?.data?.metadata?.alignment?.contractVerified,true,'Coach alignment must be verified');
 return payload.data;
}
async function context(){
 const {response,payload}=await jsonRequest('/agent/context?limit=20&memoryLimit=20');
 assert.equal(response.ok,true,`Agent context failed HTTP ${response.status} code=${payload?.error?.code||'unknown'}`);
 return payload?.data?.context||{};
}
async function deleteDisposableAccount(){
 const {response,payload}=await jsonRequest('/account/delete',{method:'POST',body:{}});
 if(response.ok){if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,'GARANG_SMOKE_ACCOUNT_DELETED=1\n');return {deleted:true};}
 throw new Error(`Disposable account cleanup failed HTTP ${response.status} code=${payload?.error?.code||'unknown'}`);
}

(async()=>{
 let cleanup=null;
 try{
  const write=await coach(planMessage),toolResults=Array.isArray(write.toolResults)?write.toolResults:[];
  const planWrite=toolResults.find(row=>row?.name==='createPlan'&&row?.executed===true);
  assert.ok(planWrite,'Explicit plan-save request did not execute bounded createPlan tool');
  assert.ok(planWrite.targetId,'Executed createPlan tool did not return a target id');

  const afterWrite=await context(),planner=Array.isArray(afterWrite.planner)?afterWrite.planner:[];
  const persisted=planner.find(row=>String(row?.id||'')===String(planWrite.targetId));
  assert.ok(persisted,'Executed plan was not visible through authenticated canonical Agent Context');
  assert.equal(persisted.source,'ai','Persisted autonomous plan must retain AI source');
  assert.equal(persisted.confirmed,true,'Persisted autonomous plan must be explicitly marked confirmed');

  const sensitive=await coach(sensitiveMessage),sensitiveResults=Array.isArray(sensitive.toolResults)?sensitive.toolResults:[];
  assert.equal(sensitiveResults.some(row=>row?.executed===true),false,'Sensitive memory smoke must fail closed without executing a write');
  if(sensitiveResults.length){
   assert.ok(sensitiveResults.every(row=>['denied','confirmation_required'].includes(String(row?.status||''))),'Sensitive write tool results must be denied or confirmation-required');
  }
  const afterSensitive=await context();
  assert.equal(JSON.stringify(afterSensitive).includes(sensitiveValue),false,'Sensitive email value must not enter canonical Agent Context');

  console.log(JSON.stringify({
   status:'PASS',
   write:{tool:'createPlan',executed:true,persisted:true,targetId:String(planWrite.targetId)},
   sensitiveBoundary:{executed:false,toolResults:sensitiveResults.map(row=>({name:row.name,status:row.status,code:row.code||null}))},
   cleanup:'pending'
  },null,2));
 }finally{
  cleanup=await deleteDisposableAccount();
  console.log(JSON.stringify({cleanup},null,2));
 }
})().catch(error=>{console.error(`production autonomous write smoke: FAIL ${error?.message||error}`);process.exit(1);});
