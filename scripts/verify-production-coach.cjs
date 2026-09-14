'use strict';
const assert=require('node:assert/strict');

const endpoint=String(process.env.GARANG_COACH_ENDPOINT||'https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/coach').trim();
const token=String(process.env.GARANG_FIREBASE_ID_TOKEN||'').trim();
const altToken=String(process.env.GARANG_FIREBASE_ID_TOKEN_ALT||'').trim();
const message=String(process.env.GARANG_SMOKE_MESSAGE||'오늘 벤치 세게 해도 돼?').trim();
const language=process.env.GARANG_SMOKE_LANGUAGE==='en'?'en':'ko';
const expectDifferentMode=String(process.env.GARANG_EXPECT_DIFFERENT_MODE||'').trim()==='1';

if(!token)throw new Error('GARANG_FIREBASE_ID_TOKEN is required for authenticated production Coach smoke verification.');
if(!endpoint.startsWith('https://'))throw new Error('GARANG_COACH_ENDPOINT must use https.');

async function call(idToken,label){
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${idToken}`,'Content-Type':'application/json'},body:JSON.stringify({message,language})});
 let body={};try{body=await response.json();}catch{}
 assert.equal(response.ok,true,`${label}: live Coach request failed with HTTP ${response.status} code=${body?.error?.code||'unknown'}`);
 const data=body?.data||{};
 assert.equal(data.source,'llm',`${label}: live endpoint did not return source=llm`);
 assert.ok(data.garangDecision?.decisionId,`${label}: deterministic GARANG decision missing`);
 assert.ok(data.garangDecision?.mode,`${label}: deterministic GARANG decision mode missing`);
 assert.equal(data.metadata?.alignment?.contractVerified,true,`${label}: provider alignment contract was not verified`);
 assert.equal(data.metadata?.alignment?.decisionId,data.garangDecision.decisionId,`${label}: provider decision identity diverged from GARANG`);
 assert.equal(data.metadata?.alignment?.decisionMode,data.garangDecision.mode,`${label}: provider decision mode diverged from GARANG`);
 return {label,source:data.source,decisionId:data.garangDecision.decisionId,decisionMode:data.garangDecision.mode,confidence:data.confidence??null,provider:String(data.metadata?.provider||'unknown'),model:String(data.metadata?.model||'unknown'),alignmentVerified:true,outcomeClassification:String(data.metadata?.alignment?.outcomeClassification||'unknown'),outcomeLongitudinalClassification:String(data.metadata?.alignment?.outcomeLongitudinalClassification||'unknown')};
}

(async()=>{
 const primary=await call(token,'primary'),results=[primary];
 if(altToken){const alternate=await call(altToken,'alternate');results.push(alternate);assert.notEqual(primary.decisionId,alternate.decisionId,'two-user smoke must not collapse to the exact same deterministic decision identity');if(expectDifferentMode)assert.notEqual(primary.decisionMode,alternate.decisionMode,'GARANG_EXPECT_DIFFERENT_MODE=1 requires materially different prepared user states');}
 console.log(JSON.stringify({status:'PASS',endpoint:new URL(endpoint).origin+new URL(endpoint).pathname,authenticatedCases:results.length,results:results.map(({decisionId,...safe})=>safe)},null,2));
})().catch(error=>{console.error(`production Coach smoke: FAIL ${error?.message||error}`);process.exit(1);});
