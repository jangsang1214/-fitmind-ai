'use strict';

const assert=require('node:assert/strict');
const Tools=require('../src/autonomous-data-tools-v1.cjs');
const Metrics=require('../src/longitudinal-learning-metrics-v1.cjs');
const Policy=require('../src/personalization-policy-v1.cjs');
const BrowserMetrics=require('../../02_core/longitudinal-learning-metrics-v1.js');
const BrowserPolicy=require('../../02_core/personalization-policy-v1.js');
const Episodes=require('../src/intelligence-episode-v1.cjs');
const ResponseModel=require('../src/user-response-model-v1.cjs');
const RecommendationPolicy=require('../src/recommendation-policy-eval-v1.cjs');
const BrowserEpisodes=require('../../02_core/intelligence-episode-v1.js');
const BrowserResponseModel=require('../../02_core/user-response-model-v1.js');
const BrowserRecommendationPolicy=require('../../02_core/recommendation-policy-eval-v1.js');
const {buildAgentContext}=require('../src/agent-context.cjs');
const {executeGeneratedTools}=require('../src/coach-gateway.cjs');
const {parseCoachResponse,systemPrompt,COACH_RESPONSE_SCHEMA}=require('../src/llm-provider.cjs');

let passed=0;
async function test(name,fn){await fn();passed++;console.log(`PASS ${name}`);}
const baseState=()=>({schemaVersion:6,profile:{goal:'근육 증가'},onboarding:{goal:'근육 증가',weeklyFrequency:4},planner:[],workouts:[],meals:[],body:[],dailyCheckins:[],memory:{entries:[]},actionLog:[],meta:{syncOwnerUid:'user-1',dailyPlanDrafts:{}}});

(async()=>{
 await test('bounded tool registry excludes destructive and raw database operations',()=>{
  const names=Tools.publicToolRegistry().map(row=>row.name);
  assert.ok(names.includes('createPlan'));assert.ok(names.includes('recordWorkout'));
  for(const forbidden of ['deleteAccount','deleteRecord','rawQuery','firestore','schemaMigration'])assert.equal(names.includes(forbidden),false);
 });

 await test('explicit low-risk plan write is autonomous, idempotent and reversible',()=>{
  const message='내일 상체 50분 계획 만들어서 저장해줘';
  const call={name:'createPlan',callId:'call-plan-1',args:{title:'상체 훈련',duration:50,intensityScale:.8,volumeScale:.8},evidenceQuote:message,evidenceSource:'explicit_user',reason:'사용자 요청'};
  const first=Tools.executeOnState(baseState(),call,{uid:'user-1',message,now:new Date('2026-09-20T12:00:00Z')});
  assert.equal(first.executed,true);assert.equal(first.duplicate,false);assert.equal(first.state.planner.length,1);assert.equal(first.state.planner[0].revision,1);assert.equal(first.state.meta.syncOwnerUid,'user-1');
  const second=Tools.executeOnState(first.state,call,{uid:'user-1',message,now:new Date('2026-09-20T12:01:00Z')});
  assert.equal(second.executed,true);assert.equal(second.duplicate,true);assert.equal(second.state.planner.length,1);
  const rolled=Tools.rollbackState(second.state,'call-plan-1',{uid:'user-1',now:new Date('2026-09-20T12:02:00Z')});
  assert.equal(rolled.rolledBack,true);assert.equal(rolled.state.planner.length,0);assert.ok(rolled.state.actionLog.some(row=>row.event==='autonomous_tool_rolled_back'));
 });

 await test('factual writes require grounded user evidence and reject invented values',()=>{
  const message='오늘 벤치프레스 80kg 5회 3세트 기록해줘';
  const good={name:'recordWorkout',callId:'workout-1',args:{name:'벤치프레스',weight:80,reps:5,sets:3},evidenceQuote:message,evidenceSource:'explicit_user'};
  const ok=Tools.executeOnState(baseState(),good,{uid:'user-1',message});
  assert.equal(ok.executed,true);assert.equal(ok.state.workouts[0].weight,80);
  const invented={...good,callId:'workout-2',args:{...good.args,weight:85}};
  const blocked=Tools.executeOnState(baseState(),invented,{uid:'user-1',message});
  assert.equal(blocked.executed,false);assert.equal(blocked.policy.status,'confirmation_required');assert.equal(blocked.policy.code,'FACTUAL_VALUES_NOT_GROUNDED');
  const inferred={...good,callId:'workout-3',evidenceSource:'inferred'};
  const inferredBlocked=Tools.executeOnState(baseState(),inferred,{uid:'user-1',message});
  assert.equal(inferredBlocked.policy.code,'INFERRED_WRITE_REQUIRES_CONFIRMATION');
 });

 await test('sensitive memory keys and cross-owner writes fail closed',()=>{
  const message='내 이메일을 기억해줘';
  const sensitive=Tools.executeOnState(baseState(),{name:'saveMemory',callId:'memory-1',args:{key:'email',value:'x@example.com'},evidenceQuote:message,evidenceSource:'explicit_user'},{uid:'user-1',message});
  assert.equal(sensitive.executed,false);assert.equal(sensitive.policy.status,'denied');assert.equal(sensitive.policy.code,'SENSITIVE_MEMORY_KEY_BLOCKED');
  assert.throws(()=>Tools.executeOnState(baseState(),{name:'createPlan',callId:'owner-1',args:{title:'A'},evidenceQuote:'계획 만들어줘',evidenceSource:'explicit_user'},{uid:'other-user',message:'계획 만들어줘'}),error=>error?.code==='ACTION_OWNER_MISMATCH');
 });

 await test('personalization can constrain autonomous progression but never increase it',()=>{
  const personalizationPolicy={adjustments:{suppressProgression:true,intensityCap:.85,volumeCap:.9}};
  const progress=Tools.executeOnState(baseState(),{name:'createPlan',callId:'p1',args:{title:'증량',decisionMode:'progress',intensityScale:.8,volumeScale:.8},evidenceQuote:'계획 만들어줘',evidenceSource:'explicit_user'},{uid:'user-1',message:'계획 만들어줘',personalizationPolicy});
  assert.equal(progress.executed,false);assert.equal(progress.policy.code,'PERSONALIZATION_SUPPRESSES_AUTONOMOUS_PROGRESS');
  const overCap=Tools.executeOnState(baseState(),{name:'createPlan',callId:'p2',args:{title:'유지',decisionMode:'maintain',intensityScale:1,volumeScale:.8},evidenceQuote:'계획 만들어줘',evidenceSource:'explicit_user'},{uid:'user-1',message:'계획 만들어줘',personalizationPolicy});
  assert.equal(overCap.executed,false);assert.equal(overCap.policy.code,'PERSONALIZATION_INTENSITY_CAP');
 });

 await test('longitudinal metrics and personalization policy have browser/server parity',()=>{
  const state=baseState();
  state.actionLog=[
   {id:'shown',event:'recommendation_shown',recommendationId:'r1',at:'2026-09-18T08:00:00Z'},
   {id:'accepted',event:'recommendation_accepted',recommendationId:'r1',at:'2026-09-18T08:01:00Z'}
  ];
  const graph={asOf:'2026-09-20',lookbackDays:28,cycles:[
   {date:'2026-09-18',recommendationId:'r1',planId:'p1',executionId:'e1',outcomeId:'o1',attribution:{complete:true},outcome:{classification:'completed',rate:90}},
   {date:'2026-09-19',recommendationId:'r2',planId:'p2',executionId:'e2',outcomeId:'o2',attribution:{complete:true},outcome:{classification:'partial',rate:50}}
  ]};
  assert.deepEqual(Metrics.build(state,graph,{days:28,asOf:'2026-09-20'}),BrowserMetrics.build(state,graph,{days:28,asOf:'2026-09-20'}));
  const model={dimensions:{planAdherence:{value:40,confidence:.8,sampleSize:8,evidenceIds:['p1']},recommendationResponsiveness:{value:35,confidence:.8,sampleSize:8,evidenceIds:['r1']},recoveryStability:{value:45,confidence:.8,sampleSize:8,evidenceIds:['c1']},attributedOutcomeScore:{value:50,confidence:.8,sampleSize:6,evidenceIds:['o1']}}};
  const outcome={decisionSupport:{suppressProgression:true,preferReducedLoad:true}};
  assert.deepEqual(Policy.build(model,outcome),BrowserPolicy.build(model,outcome));
  const policy=Policy.build(model,outcome);assert.equal(policy.adjustments.suppressProgression,true);assert.ok(policy.adjustments.intensityCap<=.85);assert.equal(policy.guardrails.noAutomaticProgressionIncrease,true);
 });

 await test('episode response model and candidate policy close the learning loop conservatively',()=>{
  const state=baseState();
  state.planner=[
   {id:'p1',recommendationId:'r1',duration:30,intensityScale:1,volumeScale:1,decisionEngineVersion:'decision-intelligence-v1'},
   {id:'p2',recommendationId:'r2',duration:30,intensityScale:1,volumeScale:1,decisionEngineVersion:'decision-intelligence-v1'},
   {id:'p3',recommendationId:'r3',duration:30,intensityScale:1,volumeScale:1,decisionEngineVersion:'decision-intelligence-v1'},
   {id:'p4',recommendationId:'r4',duration:60,intensityScale:1,volumeScale:1,decisionEngineVersion:'decision-intelligence-v1'},
   {id:'p5',recommendationId:'r5',duration:60,intensityScale:1,volumeScale:1,decisionEngineVersion:'decision-intelligence-v1'}
  ];
  state.actionLog=[1,2,3,4,5].map(i=>({id:'a'+i,event:'recommendation_accepted',recommendationId:'r'+i,at:'2026-09-'+String(10+i).padStart(2,'0')+'T08:00:00Z'}));
  const graph={asOf:'2026-09-20',lookbackDays:28,cycles:[
   {date:'2026-09-11',decisionId:'d1',decisionMode:'maintain',recommendationId:'r1',planId:'p1',executionId:'e1',outcomeId:'o1',execution:{status:'observed',score:100},outcome:{classification:'completed',score:90},attribution:{complete:true}},
   {date:'2026-09-12',decisionId:'d2',decisionMode:'maintain',recommendationId:'r2',planId:'p2',executionId:'e2',outcomeId:'o2',execution:{status:'observed',score:100},outcome:{classification:'completed',score:95},attribution:{complete:true}},
   {date:'2026-09-13',decisionId:'d3',decisionMode:'maintain',recommendationId:'r3',planId:'p3',executionId:'e3',outcomeId:'o3',execution:{status:'observed',score:90},outcome:{classification:'completed',score:85},attribution:{complete:true}},
   {date:'2026-09-14',decisionId:'d4',decisionMode:'maintain',recommendationId:'r4',planId:'p4',executionId:null,outcomeId:'o4',execution:{status:'not_observed',score:0},outcome:{classification:'missed',score:0},attribution:{complete:false}},
   {date:'2026-09-15',decisionId:'d5',decisionMode:'maintain',recommendationId:'r5',planId:'p5',executionId:null,outcomeId:'o5',execution:{status:'not_observed',score:0},outcome:{classification:'missed',score:0},attribution:{complete:false}}
  ]};
  const episodes=Episodes.build(state,graph,{asOf:'2026-09-20'}),browserEpisodes=BrowserEpisodes.build(state,graph,{asOf:'2026-09-20'});
  assert.deepEqual(episodes,browserEpisodes);assert.equal(episodes.episodes.length,5);assert.equal(episodes.episodes[0].userResponse.status,'accepted');
  const response=ResponseModel.build(episodes,{asOf:'2026-09-20'}),browserResponse=BrowserResponseModel.build(browserEpisodes,{asOf:'2026-09-20'});
  assert.deepEqual(response,browserResponse);assert.equal(response.training.preferredDurationBand,'short');assert.ok(response.confidence>=.35);
  const decision={decisionId:'d-next',mode:'maintain',recommendation:{duration:50,intensityScale:1,volumeScale:1}};
  const policy=RecommendationPolicy.build(decision,response),browserPolicy=BrowserRecommendationPolicy.build(decision,browserResponse);
  assert.deepEqual(policy,browserPolicy);assert.ok(policy.selected.durationScale<=1);assert.ok(policy.selected.intensityScale<=1);assert.ok(policy.selected.volumeScale<=1);assert.equal(policy.guardrails.neverExceedsDeterministicDecision,true);
  const personalized=Policy.build({dimensions:{}},{},{responseModel:response,candidatePolicy:policy});
  assert.ok(personalized.adjustments.durationScale<=1);assert.ok(personalized.adjustments.intensityCap<=1);assert.ok(personalized.adjustments.volumeCap<=1);assert.equal(personalized.guardrails.responseLearningCanConstrainOnly,true);
 });

 await test('Agent Context exposes longitudinal learning and deterministic personalization',()=>{
  const context=buildAgentContext(baseState(),{ownerUid:'user-1',now:new Date('2026-09-20T12:00:00Z')});
  assert.equal(context.longitudinalLearning.version,'longitudinal-learning-metrics-v1.0.0');
  assert.equal(context.personalizationPolicy.version,'personalization-policy-v1.0.0');
  assert.equal(context.personalizationPolicy.guardrails.deterministic,true);
  assert.equal(context.personalizationPolicy.guardrails.llmCannotOverride,true);
  assert.equal(context.intelligenceEpisodes.version,'intelligence-episode-v1.0.0');
  assert.equal(context.userResponseModel.version,'user-response-model-v1.0.0');
  assert.equal(context.recommendationPolicy.version,'recommendation-policy-eval-v1.0.0');
  assert.equal(context.recommendationPolicy.guardrails.neverExceedsDeterministicDecision,true);
 });

 await test('LLM structured response accepts only bounded typed tool calls',()=>{
  const raw={answer:'계획을 반영할게요.',decisionSummary:'유지',reasoningSummary:'현재 수준을 유지합니다.',suggestedNextStep:'계획 저장',confidence:.7,alignment:{decisionId:'d1',decisionMode:'maintain',reasonCodesUsed:[]},toolCalls:[{name:'createPlan',callId:'tc1',argsJson:'{"title":"상체","duration":45}',evidenceQuote:'계획 저장해줘',evidenceSource:'explicit_user',reason:'사용자 요청'}]};
  const parsed=parseCoachResponse(JSON.stringify(raw));
  assert.equal(parsed.toolCalls.length,1);assert.deepEqual(parsed.toolCalls[0].args,{title:'상체',duration:45});
  assert.ok(COACH_RESPONSE_SCHEMA.required.includes('toolCalls'));
  assert.match(systemPrompt(),/Never emit raw database paths/);
  assert.throws(()=>parseCoachResponse(JSON.stringify({...raw,toolCalls:[{...raw.toolCalls[0],name:'deleteAccount'}]})),error=>error?.code==='LLM_TOOL_CALL_INVALID');
 });

 await test('gateway executes generated writes only through authenticated transaction boundary',async()=>{
  let saved=null,uidSeen=null;
  const message='내일 상체 계획 만들어서 저장해줘';
  const results=await executeGeneratedTools({
   toolCalls:[{name:'createPlan',callId:'gateway-plan-1',args:{title:'상체',duration:45},evidenceQuote:message,evidenceSource:'explicit_user',reason:'사용자 요청'}],
   uid:'user-1',message,requestId:'req-1',now:new Date('2026-09-20T12:00:00Z'),
   context:{garangDecision:{decisionId:'decision-1',mode:'maintain'},personalizationPolicy:{adjustments:{suppressProgression:false,intensityCap:1,volumeCap:1}}},
   mutateUser:async(uid,mutator)=>{uidSeen=uid;const outcome=mutator(baseState());saved=outcome.state;return outcome;}
  });
  assert.equal(uidSeen,'user-1');assert.equal(results[0].executed,true);assert.equal(saved.planner.length,1);assert.equal(saved.planner[0].decisionId,'decision-1');assert.equal(saved.planner[0].decisionMode,'maintain');assert.equal(saved.planner[0].recommendationId,'coach:req-1');
 });

 console.log(`${passed} autonomous intelligence loop tests passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
