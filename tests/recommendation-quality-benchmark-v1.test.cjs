'use strict';
const assert=require('node:assert/strict');
const Quality=require('../functions/src/recommendation-quality-eval-v1.cjs');
const DataQuality=require('../functions/src/intelligence-data-quality-v1.cjs');
const Grounding=require('../functions/src/coach-knowledge-grounding-v2.cjs');
const Calibration=require('../functions/src/confidence-calibration-v1.cjs');
const Observability=require('../functions/src/intelligence-observability-v1.cjs');

let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};

function cleanEpisodes(n=8){
 return {asOf:'2026-09-24',episodes:Array.from({length:n},(_,i)=>({
  episodeId:'e'+i,date:'2026-09-'+String(10+i).padStart(2,'0'),
  recommendation:{recommendationId:'r'+i,duration:45,intensityScale:1,volumeScale:1},
  execution:{executionId:'x'+i,status:'observed',completionRatio:1},
  outcome:{outcomeId:'o'+i,score:80},
  userResponse:{status:'accepted'},
  attribution:{confidence:.9}
 }))};
}
function qualityInput(overrides={}){
 const dq=DataQuality.build(cleanEpisodes(),{asOf:'2026-09-24'});
 return {
  decision:{recommendation:{duration:45}},
  responseModel:{sampleSize:12,confidence:.8},
  policy:{
   selected:{id:'response_fit',durationScale:.9,intensityScale:.92,volumeScale:.92,evidenceConfidence:.8},
   candidates:[{id:'base',durationScale:1,intensityScale:1,volumeScale:1},{id:'response_fit',durationScale:.9,intensityScale:.92,volumeScale:.92,evidenceConfidence:.8}],
   guardrails:{neverExceedsDeterministicDecision:true,confidenceCalibrated:true}
  },
  offlineEvaluation:{status:'diagnostic_ready',guardrailViolations:0,evaluatedEpisodes:8},
  workoutPrescription:{exercises:[{prescription:{recommended:{sets:3,reps:8,weight:80}}}],guardrails:{neverAutoIncrease:true}},
  adaptiveNutrition:{estimate:{eligible:true},recommendation:{targetProposal:{proposedDailyKcal:2200}},guardrails:{noAutomaticTargetMutation:true}},
  dataQuality:dq,
  ...overrides
 };
}

test('recommendation quality benchmark covers safety, actionability and personalization',()=>{
 const q=Quality.build(qualityInput());
 assert.equal(q.status,'ready');
 assert.ok(q.components.safety>=.95);
 assert.ok(q.components.actionability>=.9);
 assert.ok(q.components.personalization>=.75);
 assert.ok(q.components.calibration>=.9);
});

test('recommendation quality blocks guardrail violations',()=>{
 const input=qualityInput();
 input.offlineEvaluation={...input.offlineEvaluation,guardrailViolations:1};
 const q=Quality.build(input);
 assert.equal(q.status,'blocked');
 assert.ok(q.alerts.includes('POLICY_GUARDRAIL_RISK'));
});

test('grounding benchmark selects relevant evidence for recovery query',()=>{
 const rules=[
  {id:'sleep-rule',title:'수면 부족',rule:'수면 부족이면 강도 또는 볼륨을 낮추고 회복을 우선한다.',tier:'A'},
  {id:'protein-rule',title:'단백질',rule:'단백질 섭취를 목표에 맞춘다.',tier:'A'},
  {id:'running-rule',title:'러닝',rule:'러닝 부하는 최근 기록과 회복 상태를 함께 본다.',tier:'B'}
 ];
 const g=Grounding.ground({decision:{decisionId:'d',mode:'recover',reasonCodes:['SHORT_SLEEP']},query:'잠을 거의 못 잤는데 오늘 운동 강도는?',coachRules:rules});
 assert.ok(g.evidence.length>0);
 assert.equal(g.evidence[0].id,'sleep-rule');
 assert.ok(g.evidence[0].semanticScore>0);
});

test('confidence calibration reports strong matched probabilities',()=>{
 const samples=[];
 for(let i=0;i<50;i++)samples.push({id:'hi'+i,prediction:.8,actual:i<40});
 for(let i=0;i<50;i++)samples.push({id:'lo'+i,prediction:.2,actual:i<10});
 const c=Calibration.evaluate(samples,{bins:5,minSamples:20});
 assert.equal(c.status,'strong');
 assert.ok(c.ece<=.01);
 assert.ok(c.brier<=.18);
 assert.equal(c.alerts.length,0);
});

test('confidence calibration catches systematic overconfidence',()=>{
 const samples=Array.from({length:40},(_,i)=>({id:'o'+i,prediction:.95,actual:i%2===0}));
 const c=Calibration.evaluate(samples,{bins:5,minSamples:20});
 assert.equal(c.status,'weak');
 assert.ok(c.ece>.3);
 assert.ok(c.alerts.includes('SYSTEMATIC_OVERCONFIDENCE'));
});

test('observability stays stable without material drift',()=>{
 const snapshots=Array.from({length:15},(_,i)=>({date:'2026-09-'+String(i+1).padStart(2,'0'),qualityOverall:.88,calibrationEce:.06,calibrationBrier:.16,executionRate:.78,responseConfidence:.72,dataQualityScore:.9,guardrailViolations:0}));
 const o=Observability.build(snapshots,{baselineWindow:10,recentWindow:5});
 assert.equal(o.status,'stable');
 assert.equal(o.alerts.length,0);
});

test('observability surfaces recommendation, calibration, execution and data-quality drift',()=>{
 const baseline=Array.from({length:10},(_,i)=>({date:'2026-08-'+String(10+i).padStart(2,'0'),qualityOverall:.9,calibrationEce:.05,calibrationBrier:.15,executionRate:.82,responseConfidence:.75,dataQualityScore:.92,guardrailViolations:0}));
 const recent=Array.from({length:5},(_,i)=>({date:'2026-09-'+String(20+i).padStart(2,'0'),qualityOverall:.68,calibrationEce:.18,calibrationBrier:.29,executionRate:.55,responseConfidence:.6,dataQualityScore:.65,guardrailViolations:0}));
 const o=Observability.build([...baseline,...recent],{baselineWindow:10,recentWindow:5});
 assert.equal(o.status,'drift');
 for(const code of ['RECOMMENDATION_QUALITY_DRIFT','CALIBRATION_DRIFT','BRIER_DRIFT','EXECUTION_RATE_DRIFT','DATA_QUALITY_DRIFT'])assert.ok(o.alerts.includes(code),code);
});

test('observability elevates any guardrail violation to critical',()=>{
 const snapshots=Array.from({length:15},(_,i)=>({date:'2026-09-'+String(i+1).padStart(2,'0'),qualityOverall:.9,calibrationEce:.05,executionRate:.8,dataQualityScore:.9,guardrailViolations:i===14?1:0}));
 const o=Observability.build(snapshots,{baselineWindow:10,recentWindow:5});
 assert.equal(o.status,'critical');
 assert.ok(o.alerts.includes('GUARDRAIL_VIOLATION'));
});

test('recommendation quality prefers measured replay calibration over heuristic flags',()=>{
 const measured={status:'weak',sampleSize:40,ece:.32,mce:.4,brier:.31,alerts:['SYSTEMATIC_OVERCONFIDENCE']};
 const q=Quality.build(qualityInput({confidenceCalibration:measured}));
 assert.equal(q.evidence.calibrationSource,'chronological_replay');
 assert.ok(q.components.calibration<.5);
 assert.ok(q.alerts.includes('CONFIDENCE_CALIBRATION_WEAK'));
 assert.ok(q.alerts.includes('SYSTEMATIC_OVERCONFIDENCE'));
});

test('longitudinal data quality exposes missing attribution, invalid ranges and robust outliers',()=>{
 const episodes=cleanEpisodes(8);episodes.episodes[0].attribution={};episodes.episodes[1].execution.completionRatio=1.4;episodes.episodes[2].outcome.score=0;episodes.episodes[3].outcome.score=100;episodes.episodes[4].outcome.score=81;episodes.episodes[5].outcome.score=82;episodes.episodes[6].outcome.score=83;episodes.episodes[7].outcome.score=99;
 const q=DataQuality.build(episodes,{asOf:'2026-09-24'});
 assert.equal(q.status,'invalid');
 assert.ok(q.issues.missingAttribution.includes('e0'));
 assert.ok(q.issues.invalidRanges.some(x=>x.field==='execution.completionRatio'));
 assert.equal(q.guardrails.outlierAware,true);
});

console.log(JSON.stringify({status:'PASS',tests:passed,axes:['relevance/grounding','safety','actionability','personalization','calibration','longitudinal drift']},null,2));
console.log('recommendation-quality-benchmark-v1: PASS');
