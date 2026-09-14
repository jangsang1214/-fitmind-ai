'use strict';
const assert=require('node:assert/strict');
const {createOpenAIProvider,parseCoachResponse}=require('../src/llm-provider.cjs');
let passed=0;const test=async(name,fn)=>{await fn();passed++;console.log(`PASS ${name}`);};
const response=text=>({ok:true,json:async()=>({id:'resp_1',output:[{content:[{text}]}]})});
const aligned=(decisionId='d1',decisionMode='reduce',reasonCodesUsed=['SHORT_SLEEP'])=>({decisionId,decisionMode,reasonCodesUsed});
(async()=>{
 await test('LLM Gateway provider accepts structured explanation success',async()=>{
  let request=null;const provider=createOpenAIProvider({apiKey:'secret',model:'model-a',fetchImpl:async(url,init)=>{request={url,init};return response(JSON.stringify({answer:'오늘은 강도를 낮추세요.',decisionSummary:'REDUCE',reasoningSummary:'수면과 회복이 낮습니다.',suggestedNextStep:'볼륨을 낮춥니다.',confidence:.82,alignment:aligned()}));}});
  const out=await provider.generate({message:'오늘 벤치 세게 해도 돼?',context:{garangDecision:{decisionId:'d1',mode:'reduce'},decisionReasons:['SHORT_SLEEP']},requestId:'r1'});
  assert.equal(out.answer,'오늘은 강도를 낮추세요.');assert.equal(out.alignment.decisionMode,'reduce');assert.equal(out.actionIntent,undefined);assert.equal(out.metadata.provider,'openai');assert.equal(out.metadata.model,'model-a');
  assert.equal(request.url,'https://api.openai.com/v1/responses');assert.match(request.init.headers.Authorization,/Bearer secret/);const body=JSON.parse(request.init.body);assert.equal(body.model,'model-a');assert.equal(body.text?.format?.type,'json_schema');assert.equal(body.text?.format?.strict,true);assert.equal(body.text?.format?.name,'garang_coach_response');assert.equal(body.text?.format?.schema?.properties?.actionIntent,undefined);assert.deepEqual(body.text?.format?.schema?.required,['answer','decisionSummary','reasoningSummary','suggestedNextStep','confidence','alignment']);assert.deepEqual(body.text?.format?.schema?.properties?.alignment?.required,['decisionId','decisionMode','reasonCodesUsed']);
 });
 await test('malformed provider response is rejected',()=>assert.throws(()=>parseCoachResponse('not-json'),error=>error?.code==='LLM_RESPONSE_MALFORMED'));
 await test('missing required structured fields are rejected',()=>assert.throws(()=>parseCoachResponse('{"answer":"x"}'),error=>error?.code==='LLM_RESPONSE_INVALID'));
 await test('missing alignment contract is rejected',()=>assert.throws(()=>parseCoachResponse(JSON.stringify({answer:'a',decisionSummary:'d',reasoningSummary:'r',suggestedNextStep:'s',confidence:.5})),error=>error?.code==='LLM_RESPONSE_INVALID'));
 await test('unknown decision mode in alignment is rejected',()=>assert.throws(()=>parseCoachResponse(JSON.stringify({answer:'a',decisionSummary:'d',reasoningSummary:'r',suggestedNextStep:'s',confidence:.5,alignment:aligned('d1','invented',[])})),error=>error?.code==='LLM_RESPONSE_INVALID'));
 await test('missing API secret fails before any network call',()=>assert.throws(()=>createOpenAIProvider({apiKey:''}),error=>error?.code==='LLM_SECRET_MISSING'));
 await test('timeout abort is surfaced explicitly',async()=>{
  const provider=createOpenAIProvider({apiKey:'secret',timeoutMs:20,fetchImpl:(_url,init)=>new Promise((_resolve,reject)=>{init.signal.addEventListener('abort',()=>{const e=new Error('aborted');e.name='AbortError';reject(e);});})});
  await assert.rejects(()=>provider.generate({message:'x',context:{}}),error=>error?.code==='LLM_TIMEOUT');
 });
 await test('provider response cannot encode an action contract',()=>{const out=parseCoachResponse(JSON.stringify({answer:'a',decisionSummary:'d',reasoningSummary:'r',suggestedNextStep:'s',actionIntent:{type:'deleteAccount'},confidence:4,alignment:aligned()}));assert.equal(out.actionIntent,undefined);assert.equal(out.confidence,1);assert.equal(out.alignment.decisionId,'d1');});
 console.log(`${passed} llm provider tests passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
