'use strict';
const assert=require('node:assert/strict');
const {parseCoachResponse}=require('../src/llm-provider.cjs');
const {verifyGeneratedAlignment,alignGenerated}=require('../src/coach-gateway.cjs');

let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};
const context={garangDecision:{decisionId:'2026-09-14:reduce:MODE_REDUCE|SHORT_SLEEP',mode:'reduce',confidence:.62},decisionReasons:['MODE_REDUCE','SHORT_SLEEP','OUTCOME_PARTIAL'],outcomeLearning:{classification:'partial',longitudinal:{classification:'fragile_execution'}}};
const generated=(overrides={})=>({answer:'오늘은 강도나 볼륨을 낮추는 편이 좋습니다.',decisionSummary:'GARANG은 reduce로 판단했습니다.',reasoningSummary:'최근 수면과 실행 결과를 근거로 강도를 낮춥니다.',suggestedNextStep:'평소보다 낮은 볼륨으로 진행하세요.',confidence:.9,alignment:{decisionId:context.garangDecision.decisionId,decisionMode:'reduce',reasonCodesUsed:['SHORT_SLEEP','OUTCOME_PARTIAL']},metadata:{provider:'mock'},...overrides});

test('provider structured response carries the deterministic decision identity',()=>{const parsed=parseCoachResponse(JSON.stringify(generated()));assert.equal(parsed.alignment.decisionId,context.garangDecision.decisionId);assert.equal(parsed.alignment.decisionMode,'reduce');assert.deepEqual(parsed.alignment.reasonCodesUsed,['SHORT_SLEEP','OUTCOME_PARTIAL']);});
test('matching decision and supported reasons verify successfully',()=>{const verified=verifyGeneratedAlignment(generated(),context);assert.equal(verified.verified,true);assert.equal(verified.decisionMode,'reduce');assert.deepEqual(verified.reasonCodesUsed,['SHORT_SLEEP','OUTCOME_PARTIAL']);});
test('provider cannot reverse the GARANG decision mode',()=>{assert.throws(()=>verifyGeneratedAlignment(generated({alignment:{decisionId:context.garangDecision.decisionId,decisionMode:'progress',reasonCodesUsed:['SHORT_SLEEP']}}),context),error=>error?.code==='LLM_ALIGNMENT_MISMATCH');});
test('provider cannot attach unsupported evidence codes',()=>{assert.throws(()=>verifyGeneratedAlignment(generated({alignment:{decisionId:context.garangDecision.decisionId,decisionMode:'reduce',reasonCodesUsed:['SHORT_SLEEP','INVENTED_RECOVERY_FACT']}}),context),error=>error?.code==='LLM_ALIGNMENT_UNSUPPORTED_REASON');});
test('verified explanation confidence remains capped by deterministic confidence',()=>{const out=alignGenerated(generated(),context);assert.equal(out.confidence,.62);assert.equal(out.metadata.alignment.contractVerified,true);assert.equal(out.metadata.alignment.confidenceCapped,true);assert.equal(out.metadata.alignment.outcomeLongitudinalClassification,'fragile_execution');});
test('alignment metadata contains no raw user message or memory values',()=>{const out=alignGenerated(generated(),context),serialized=JSON.stringify(out.metadata.alignment);assert.equal(serialized.includes('오늘은'),false);assert.equal(serialized.includes('memory'),false);});
console.log(`${passed} semantic alignment tests passed`);
