'use strict';
const assert=require('node:assert/strict');
const Memory=require('../functions/src/memory-engine.cjs');
const BrowserMemory=require('../02_core/memory-intelligence-v1.js');
const Grounding=require('../functions/src/coach-knowledge-grounding-v2.cjs');
const BrowserGrounding=require('../02_core/coach-knowledge-grounding-v2.js');
const Response=require('../functions/src/user-response-model-v1.cjs');
const BrowserResponse=require('../02_core/user-response-model-v1.js');
const Policy=require('../functions/src/recommendation-policy-eval-v1.cjs');
const BrowserPolicy=require('../02_core/recommendation-policy-eval-v1.js');
const Offline=require('../functions/src/offline-policy-evaluation-v1.cjs');
const BrowserOffline=require('../02_core/offline-policy-evaluation-v1.js');
const Workout=require('../functions/src/workout-prescription-shadow-v1.cjs');
const BrowserWorkout=require('../02_core/workout-prescription-shadow-v1.js');
const Nutrition=require('../functions/src/adaptive-nutrition-learning-v1.cjs');
const BrowserNutrition=require('../02_core/adaptive-nutrition-learning-v1.js');
const DataQuality=require('../functions/src/intelligence-data-quality-v1.cjs');
const BrowserDataQuality=require('../02_core/intelligence-data-quality-v1.js');
const Quality=require('../functions/src/recommendation-quality-eval-v1.cjs');
const BrowserQuality=require('../02_core/recommendation-quality-eval-v1.js');

let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};
const now=new Date('2026-09-24T12:00:00Z');

test('hybrid memory retrieval crosses Korean-English vocabulary without external embeddings',()=>{
 const corpus=[
  {id:'morning',type:'preference',key:'training_time',value:'morning strength training',importance:4,confidence:.95,utility:.9,userConfirmed:true,updatedAt:'2026-09-23T00:00:00Z'},
  {id:'protein',type:'preference',key:'nutrition',value:'high protein meals',importance:4,confidence:.95,utility:.9,userConfirmed:true,updatedAt:'2026-09-23T00:00:00Z'}
 ];
 const a=Memory.selectMemory(corpus,{query:'아침 웨이트 선호',now,limit:1}),b=BrowserMemory.selectMemory(corpus,{query:'아침 웨이트 선호',now,limit:1});
 assert.deepEqual(a,b);assert.equal(a[0].id,'morning');
});

test('hybrid Coach grounding retrieves semantically related evidence even without exact query token',()=>{
 const rules=[{id:'sleep-rule',title:'수면 부족',rule:'수면 부족이면 강도 또는 볼륨을 낮추고 회복을 우선한다.',tier:'A'},{id:'protein-rule',title:'단백질',rule:'단백질 섭취를 목표에 맞춘다.',tier:'A'}];
 const input={decision:{decisionId:'d1',mode:'maintain',reasonCodes:[]},query:'잠을 거의 못 잤는데 운동은?',coachRules:rules};
 const a=Grounding.ground(input),b=BrowserGrounding.ground(input);assert.deepEqual(a,b);assert.equal(a.version,'garang-coach-knowledge-grounding-v2.1-semantic');assert.equal(a.evidence[0].id,'sleep-rule');assert.ok(a.evidence[0].semanticScore>0);
});

test('response model shrinks small samples and exposes segment evidence quality',()=>{
 const episodes={asOf:'2026-09-24',episodes:[
  {date:'2026-09-20',context:{timeBucket:'morning',dayOfWeek:'sun',readiness:5},recommendation:{duration:30,intensityScale:.8,volumeScale:.8},userResponse:{status:'accepted'},execution:{executionId:'e1',completionRatio:1},outcome:{score:90,recoveryDelta:.3},attribution:{confidence:1}},
  {date:'2026-09-21',context:{timeBucket:'morning',dayOfWeek:'mon',readiness:4},recommendation:{duration:30,intensityScale:.8,volumeScale:.8},userResponse:{status:'accepted'},execution:{executionId:'e2',completionRatio:1},outcome:{score:88,recoveryDelta:.2},attribution:{confidence:1}},
  {date:'2026-09-22',context:{timeBucket:'evening',dayOfWeek:'tue',readiness:2},recommendation:{duration:60,intensityScale:1,volumeScale:1},userResponse:{status:'rejected'},execution:{},outcome:{score:30,recoveryDelta:-.4},attribution:{confidence:.8}}
 ]};
 const a=Response.build(episodes),b=BrowserResponse.build(episodes);assert.deepEqual(a,b);assert.equal(a.version,'user-response-model-v1.2.0');assert.equal(a.training.preferredDurationBand,'short');assert.equal(a.timing.preferredTimeBucket,'morning');assert.ok(a.training.durationStats.short.confidence<1);assert.ok(a.evidenceQuality.attributionMean>0);
 const decision={decisionId:'next',mode:'maintain',recommendation:{duration:60,intensityScale:1,volumeScale:1}},pa=Policy.build(decision,a),pb=BrowserPolicy.build(decision,b);assert.deepEqual(pa,pb);assert.equal(pa.version,'recommendation-policy-eval-v1.2.0');assert.ok(pa.selected.durationScale<=1);assert.equal(pa.guardrails.uncertaintyPenalized,true);
});

test('offline evaluation excludes future episodes from chronological replay',()=>{
 const episodes={asOf:'2026-09-24',episodes:Array.from({length:6},(_,i)=>({episodeId:'e'+i,date:i===5?'2026-10-01':'2026-09-'+String(18+i).padStart(2,'0'),decision:{decisionId:'d'+i,mode:'maintain'},recommendation:{duration:40,intensityScale:1,volumeScale:1},userResponse:{status:'accepted'},execution:{executionId:'x'+i,status:'observed',completionRatio:1},outcome:{score:80},attribution:{confidence:1}}))};
 const a=Offline.build(episodes,{asOf:'2026-09-24',minHistory:2}),b=BrowserOffline.build(episodes,{asOf:'2026-09-24',minHistory:2});assert.deepEqual(a,b);assert.equal(a.version,'offline-policy-evaluation-v1.1.0');assert.equal(a.inputEpisodes,5);assert.equal(a.guardrails.futureEpisodesExcluded,true);
});

test('workout prescription uses RIR e1RM and failure signals while remaining confirmation gated',()=>{
 const state={workouts:[
  {date:'2026-09-01',name:'스쿼트',setDetails:[{weight:100,reps:5,rpe:7,rir:3},{weight:100,reps:5,rpe:7,rir:3},{weight:100,reps:5,rpe:7,rir:3}]},
  {date:'2026-09-08',name:'스쿼트',setDetails:[{weight:100,reps:6,rpe:7.5,rir:2.5},{weight:100,reps:6,rpe:7.5,rir:2.5},{weight:100,reps:6,rpe:7.5,rir:2.5}]},
  {date:'2026-09-15',name:'스쿼트',setDetails:[{weight:102.5,reps:6,rpe:7.5,rir:2},{weight:102.5,reps:6,rpe:7.5,rir:2},{weight:102.5,reps:6,rpe:7.5,rir:2}]}
 ],dailyCheckins:[{date:'2026-09-24',sleepHours:8,energy:5,stress:1,soreness:1}]};
 const a=Workout.build(state,{asOf:'2026-09-24'}),b=BrowserWorkout.build(state,{asOf:'2026-09-24'});assert.deepEqual(a,b);assert.equal(a.version,'workout-prescription-shadow-v1.2.0');assert.equal(a.exercises[0].prescription.action,'review_progression');assert.ok(a.exercises[0].observed.e1rmTrend>=.98);assert.ok(a.exercises[0].prescription.recommended.weight>a.exercises[0].observed.latest.weight);assert.equal(a.exercises[0].prescription.requiresConfirmation,true);
 const fail={workouts:[...state.workouts,{date:'2026-09-23',name:'스쿼트',setDetails:[{weight:110,reps:3,rpe:10,rir:0,setType:'failure'}]}],dailyCheckins:state.dailyCheckins},f=Workout.build(fail,{asOf:'2026-09-24'});assert.equal(f.exercises[0].prescription.action,'reduce');assert.ok(f.exercises[0].prescription.recommended.weight<110);
});

test('adaptive nutrition smooths weight trend and checks multi-window consistency',()=>{
 const meals=Array.from({length:28},(_,i)=>({date:'2026-09-'+String(i+1).padStart(2,'0'),kcal:i===10?5000:2300}));
 const body=[{date:'2026-09-01',weight:70},{date:'2026-09-07',weight:70.1},{date:'2026-09-14',weight:70.15},{date:'2026-09-21',weight:70.2},{date:'2026-09-24',weight:70.2}];
 const state={profile:{goal:'체지방 감량'},meals,body},a=Nutrition.build(state,{asOf:'2026-09-24',days:28}),b=BrowserNutrition.build(state,{asOf:'2026-09-24',days:28});assert.deepEqual(a,b);assert.equal(a.version,'adaptive-nutrition-learning-v1.2.0');assert.equal(a.estimate.eligible,true);assert.equal(a.evidence.primaryWindow.weight.smoothing,'3-point-median');assert.ok(a.evidence.windowAgreement>=0&&a.evidence.windowAgreement<=1);assert.ok(Math.abs(a.recommendation.targetProposal.deltaKcal)<=100);assert.equal(a.guardrails.multiWindowConsistency,true);
});

test('data-quality and recommendation-quality evaluators block corrupted evidence and surface low confidence',()=>{
 const broken={asOf:'2026-09-24',episodes:[{episodeId:'a',date:'2026-09-25',recommendation:{recommendationId:'r'},execution:{},outcome:{outcomeId:'o'},attribution:{confidence:.7},userResponse:{status:'unresolved'}},{episodeId:'a',date:'2026-09-24',recommendation:{recommendationId:'r2'},execution:{},outcome:{},attribution:{confidence:.2},userResponse:{status:'unresolved'}}]},dq=DataQuality.build(broken,{asOf:'2026-09-24'}),bdq=BrowserDataQuality.build(broken,{asOf:'2026-09-24'});assert.deepEqual(dq,bdq);assert.equal(dq.status,'invalid');
 const input={decision:{recommendation:{duration:45}},responseModel:{sampleSize:1,confidence:.1},policy:{candidates:[{id:'base',durationScale:1,intensityScale:1,volumeScale:1}],selected:{id:'base',durationScale:1,intensityScale:1,volumeScale:1},guardrails:{neverExceedsDeterministicDecision:true,confidenceCalibrated:true}},offlineEvaluation:{status:'insufficient_history',guardrailViolations:0},workoutPrescription:{exercises:[],guardrails:{neverAutoIncrease:true}},adaptiveNutrition:{estimate:{eligible:false},guardrails:{noAutomaticTargetMutation:true}},dataQuality:dq},q=Quality.build(input),bq=BrowserQuality.build(input);assert.deepEqual(q,bq);assert.notEqual(q.status,'ready');assert.ok(q.alerts.includes('LONGITUDINAL_EVIDENCE_SPARSE'));
});

console.log(`${passed} intelligence hardening tests passed`);
