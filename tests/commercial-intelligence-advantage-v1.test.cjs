'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const Phys=require('../02_core/physiological-signal-intelligence-v1.js');
const PhysServer=require('../functions/src/physiological-signal-intelligence-v1.cjs');
const WorkoutShadow=require('../02_core/workout-prescription-shadow-v1.js');
const WorkoutShadowServer=require('../functions/src/workout-prescription-shadow-v1.cjs');
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
assert.equal(phys.guardrails.multiDayRecoveryTrajectory,true);

const trajectorySignals=[];
for(let day=15;day<=21;day++){
 const date=isoDay(day);
 trajectorySignals.push({source:'watch',capturedAt:`${date}T06:00:00Z`,hrvMs:60,restingHeartRateBpm:55,sleepHours:8,sleepScore:90,stressScore:1});
}
trajectorySignals.push({source:'watch',capturedAt:'2026-09-22T06:00:00Z',hrvMs:48,restingHeartRateBpm:60,sleepHours:6.4,sleepScore:62,stressScore:3.8});
trajectorySignals.push({source:'watch',capturedAt:'2026-09-23T06:00:00Z',hrvMs:49,restingHeartRateBpm:60,sleepHours:6.5,sleepScore:64,stressScore:3.7});
trajectorySignals.push({source:'watch',capturedAt:'2026-09-24T06:00:00Z',hrvMs:58,restingHeartRateBpm:56,sleepHours:7.7,sleepScore:84,stressScore:2});
const trajectoryState={healthSignals:trajectorySignals,workouts:[],runs:[],meals:[],body:[],dailyCheckins:[]};
const trajectoryPhys=Phys.build(trajectoryState,{now});
const trajectoryPhysServer=PhysServer.build(trajectoryState,{now});
assert.deepEqual(trajectoryPhys,trajectoryPhysServer,'recovery trajectory must stay browser/server deterministic');
assert.equal(trajectoryPhys.derived.trajectory.recentDays,3);
assert.equal(trajectoryPhys.derived.trajectory.guardedOrLowDays,2);
assert.equal(trajectoryPhys.derived.trajectory.persistentStrain,true);
assert.ok(trajectoryPhys.derived.reasonCodes.includes('PERSISTENT_RECOVERY_STRAIN'));
assert.equal(trajectoryPhys.derived.recoveryConstraint,'guarded','repeated strain must constrain recovery even after a single improved day');
assert.equal(trajectoryPhys.guardrails.trajectoryRequiresRepeatedEvidence,true);
assert.equal(trajectoryPhys.guardrails.trajectoryCanOnlyConstrain,true);

const guardedHealthSignals=[];
for(let day=20;day<=23;day++){
 const date=isoDay(day);
 guardedHealthSignals.push({source:'watch',capturedAt:`${date}T06:00:00Z`,hrvMs:52,restingHeartRateBpm:58,sleepHours:7.5,sleepScore:80,stressScore:2});
}
guardedHealthSignals.push({source:'watch',capturedAt:'2026-09-24T06:00:00Z',hrvMs:48,restingHeartRateBpm:61,sleepHours:7,sleepScore:70,stressScore:3});
const progressionWorkouts=[
 {id:'gw1',date:'2026-09-22',name:'벤치프레스',sets:3,reps:5,weight:80,rpe:7,rir:2},
 {id:'gw2',date:'2026-09-23',name:'벤치프레스',sets:3,reps:5,weight:80,rpe:7,rir:2},
 {id:'gw3',date:'2026-09-24',name:'벤치프레스',sets:3,reps:5,weight:80,rpe:7,rir:2}
];
const normalShadow=WorkoutShadow.build({workouts:progressionWorkouts,healthSignals:[],dailyCheckins:[],runs:[],meals:[],body:[]},{asOf:'2026-09-24'});
assert.equal(normalShadow.exercises[0].prescription.action,'review_progression','normal recovery must preserve existing progression review');
const guardedState={workouts:progressionWorkouts,healthSignals:guardedHealthSignals,dailyCheckins:[],runs:[],meals:[],body:[]};
const guardedShadow=WorkoutShadow.build(guardedState,{asOf:'2026-09-24'});
const guardedShadowServer=WorkoutShadowServer.build(guardedState,{asOf:'2026-09-24'});
assert.deepEqual(guardedShadow,guardedShadowServer,'graded recovery prescription must stay browser/server deterministic');
assert.equal(guardedShadow.recoveryConstraint.level,'guarded');
assert.ok(guardedShadow.recoveryConstraint.reasons.includes('PHYSIOLOGICAL_RECOVERY_GUARDED'));
assert.equal(guardedShadow.exercises[0].prescription.action,'hold','guarded recovery must block progression without auto-reducing dose');
assert.equal(guardedShadow.exercises[0].prescription.reason,'RECOVERY_GUARDED_HOLD');
assert.equal(guardedShadow.exercises[0].prescription.progressionEligibleForReview,false);
assert.equal(guardedShadow.exercises[0].prescription.recommended.weight,80);
assert.equal(guardedShadow.guardrails.gradedRecoveryConstraint,true);
assert.equal(guardedShadow.guardrails.guardedBlocksProgression,true);
assert.equal(guardedShadow.guardrails.guardedDoesNotAutoReduce,true);

const baselineLoadDates=['2026-08-20','2026-08-24','2026-08-28','2026-09-01','2026-09-05','2026-09-09','2026-09-13','2026-09-17'];
const baselineLoadWorkouts=baselineLoadDates.map((date,i)=>({id:`lb-${i}`,date,name:'로잉',sets:3,reps:8,weight:40,rpe:5,rir:3,duration:30}));
const spikeProgressionWorkouts=progressionWorkouts.map(row=>({...row,duration:90}));
const loadSpikeState={workouts:[...baselineLoadWorkouts,...spikeProgressionWorkouts],healthSignals:[],dailyCheckins:[],runs:[],meals:[],body:[]};
const loadSpikeShadow=WorkoutShadow.build(loadSpikeState,{asOf:'2026-09-24'});
const loadSpikeShadowServer=WorkoutShadowServer.build(loadSpikeState,{asOf:'2026-09-24'});
assert.deepEqual(loadSpikeShadow,loadSpikeShadowServer,'load-aware recovery guard must stay browser/server deterministic');
assert.equal(loadSpikeShadow.recoveryConstraint.level,'guarded','high-confidence recent load spike must guard progression');
assert.ok(loadSpikeShadow.recoveryConstraint.reasons.includes('RECENT_LOAD_SPIKE'));
assert.equal(loadSpikeShadow.recoveryConstraint.load.band,'spike');
assert.ok(loadSpikeShadow.recoveryConstraint.load.confidence>=.45);
const loadSpikeBench=loadSpikeShadow.exercises.find(row=>row.exercise==='벤치프레스');
assert.equal(loadSpikeBench.prescription.action,'hold','load spike alone must hold rather than progress');
assert.equal(loadSpikeBench.prescription.reason,'RECOVERY_GUARDED_HOLD');
assert.equal(loadSpikeBench.prescription.recommended.weight,80,'load spike alone must not auto-reduce dose');
assert.equal(loadSpikeShadow.guardrails.loadAwareRecovery,true);
assert.equal(loadSpikeShadow.guardrails.loadSpikeBlocksProgression,true);
assert.equal(loadSpikeShadow.guardrails.loadSpikeDoesNotAutoReduce,true);

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
assert.equal(adaptive.evidence.recommendationAdoption.recommendationLinkedMeals,0);
assert.equal(adaptive.guardrails.recommendationLineageDescriptiveOnly,true);
assert.equal(adaptive.guardrails.recommendationAdoptionDoesNotChangeTargets,true);

const adoptionState=nutritionState(2200);
adoptionState.meals[0].recommendationContexts=[{recommendationId:'2026-09-04:protein-rice:garang-nutrition-recommendation-v1',source:'next_meal',optionId:'protein-rice'}];
adoptionState.meals[1].recommendationContexts=[{recommendationId:'2026-09-05:alternate-protein:garang-nutrition-recommendation-v1',source:'next_meal',optionId:'alternate-protein'}];
const adoption=Adaptive.build(adoptionState,{asOf:'2026-09-24',days:28});
const adoptionServer=AdaptiveServer.build(adoptionState,{asOf:'2026-09-24',days:28});
assert.deepEqual(adoption,adoptionServer,'recommendation adoption evidence must stay browser/server deterministic');
assert.equal(adoption.evidence.recommendationAdoption.recommendationLinkedMeals,2);
assert.equal(adoption.evidence.recommendationAdoption.uniqueRecommendations,2);
assert.equal(adoption.recommendation.direction,adaptive.recommendation.direction,'descriptive recommendation adoption evidence must not change target direction');
assert.equal(adoption.recommendation.targetProposal.proposedDailyKcal,adaptive.recommendation.targetProposal.proposedDailyKcal,'recommendation adoption evidence must not change proposed calories');

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
