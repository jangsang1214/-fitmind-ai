'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Phys=require('../02_core/physiological-signal-intelligence-v1.js');
const PhysServer=require('../functions/src/physiological-signal-intelligence-v1.cjs');
const Adaptive=require('../02_core/adaptive-nutrition-learning-v1.js');
const AdaptiveServer=require('../functions/src/adaptive-nutrition-learning-v1.cjs');
const Longitudinal=require('../02_core/longitudinal-learning-metrics-v1.js');
const LongitudinalServer=require('../functions/src/longitudinal-learning-metrics-v1.cjs');

function isoDay(day){return `2026-09-${String(day).padStart(2,'0')}`;}

const healthSignals=[];
for(let day=20;day<=24;day++){
 const drift=day-20,date=isoDay(day);
 healthSignals.push({source:'watch',capturedAt:`${date}T06:00:00Z`,hrvMs:52-drift});
 healthSignals.push({source:'watch',capturedAt:`${date}T06:05:00Z`,restingHeartRateBpm:58+drift});
 healthSignals.push({source:'watch',capturedAt:`${date}T06:10:00Z`,sleepHours:7.8-drift*.25,sleepScore:84-drift*2});
 healthSignals.push({source:'watch',capturedAt:`${date}T06:15:00Z`,stressScore:2+drift*.2});
}
const physState={healthSignals,workouts:[],runs:[],meals:[],body:[],dailyCheckins:[]},now=new Date('2026-09-24T12:00:00Z');
const phys=Phys.build(physState,{now}),physServer=PhysServer.build(physState,{now});
assert.deepEqual(phys,physServer,'browser/server physiological models must match');
assert.ok(['usable','strong'].includes(phys.quality));
assert.ok(phys.derived.readinessScore!==null);
assert.ok(phys.derived.componentCount>=4,'separate long-form metric rows must fuse into one readiness view');
assert.equal(phys.metricLatest.hrvMs.source,'watch');
assert.equal(phys.guardrails.metricLatestFusion,true);
assert.equal(phys.guardrails.staleSignalsDownweighted,true);

const nutritionDates=Array.from({length:21},(_,i)=>{const d=new Date(Date.UTC(2026,8,4+i));return d.toISOString().slice(0,10);});
const bodyDates=[0,4,8,12,16,20].map(i=>nutritionDates[i]);
function nutritionState(kcal){
 return {
  profile:{goal:'감량',calorieTarget:2200},
  meals:nutritionDates.map((date,i)=>({id:`m-${i}`,date,kcal})),
  body:bodyDates.map((date,i)=>({id:`b-${i}`,date,weight:70}))
 };
}
const adaptive=Adaptive.build(nutritionState(2200),{asOf:'2026-09-24',days:28});
const adaptiveServer=AdaptiveServer.build(nutritionState(2200),{asOf:'2026-09-24',days:28});
assert.deepEqual(adaptive,adaptiveServer,'browser/server adaptive nutrition must match');
assert.equal(adaptive.recommendation.direction,'review_lower_energy');
assert.equal(adaptive.recommendation.adjustmentEligible,true);
assert.equal(adaptive.recommendation.targetProposal.referenceTargetKcal,2200);
assert.equal(adaptive.recommendation.targetProposal.proposedDailyKcal,2100);
assert.equal(adaptive.recommendation.targetProposal.deltaKcal,-100);
assert.equal(adaptive.recommendation.targetProposal.requiresConfirmation,true);
assert.equal(adaptive.guardrails.adherenceAwareAdjustment,true);

const lowAdherence=Adaptive.build(nutritionState(2750),{asOf:'2026-09-24',days:28});
assert.equal(lowAdherence.evidence.targetAdherence.status,'above_target');
assert.equal(lowAdherence.recommendation.direction,'improve_target_adherence');
assert.equal(lowAdherence.recommendation.adjustmentEligible,false);
assert.equal(lowAdherence.recommendation.targetProposal.proposedDailyKcal,2200);
assert.equal(lowAdherence.recommendation.targetProposal.deltaKcal,0);
assert.equal(lowAdherence.recommendation.targetProposal.requiresConfirmation,false);

const appSource=fs.readFileSync(path.resolve(__dirname,'../01_app/app.js'),'utf8');
assert.match(appSource,/const adjustmentEligible=model\?\.recommendation\?\.adjustmentEligible===true/,'Adaptive Nutrition UI must require the engine adjustment gate before offering target application');
const adherenceStart=appSource.indexOf("if(direction==='improve_target_adherence'");
const adherenceEnd=appSource.indexOf("if(!adjustmentEligible)",adherenceStart);
assert.ok(adherenceStart>=0&&adherenceEnd>adherenceStart,'low-adherence coaching branch must exist before generic evidence collection');
const adherenceBlock=appSource.slice(adherenceStart,adherenceEnd);
assert.match(adherenceBlock,/data-adaptive-nutrition="adherence"/);
assert.match(adherenceBlock,/이번 주는 목표를 바꾸지 않습니다/);
assert.match(adherenceBlock,/자동 변경 없음/);
assert.doesNotMatch(adherenceBlock,/applyAdaptiveNutritionTarget/,'low adherence must never surface an apply-target action');

const planner=Array.from({length:6},(_,i)=>({id:`p${i+1}`,domain:'training'}));
const scores=[50,55,60,75,80,85],cycleDates=['2026-09-10','2026-09-12','2026-09-14','2026-09-18','2026-09-20','2026-09-22'];
const cycles=scores.map((score,i)=>({
 date:cycleDates[i],planId:`p${i+1}`,recommendationId:`r${i+1}`,executionId:`e${i+1}`,outcomeId:`o${i+1}`,
 attribution:{complete:true},outcome:{classification:score>=75?'completed':'partial',score}
}));
const longState={planner,actionLog:[]},graph={asOf:'2026-09-24',cycles};
const longitudinal=Longitudinal.build(longState,graph,{days:28,asOf:'2026-09-24'});
const longitudinalServer=LongitudinalServer.build(longState,graph,{days:28,asOf:'2026-09-24'});
assert.deepEqual(longitudinal,longitudinalServer,'browser/server longitudinal metrics must match');
assert.equal(longitudinal.domainOutcomes.training.sampleSize,6);
assert.equal(longitudinal.trajectory.status,'measured');
assert.equal(longitudinal.trajectory.delta,25);
assert.ok(longitudinal.quality.closedLoopDeltaScore>0);
assert.equal(longitudinal.quality.maturity,'learning');
assert.equal(longitudinal.guardrails.noCausalClaim,true);
assert.equal(longitudinal.guardrails.noCounterfactualClaim,true);

console.log('commercial-intelligence-advantage-v1: PASS');
