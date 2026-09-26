'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Loop=require('../02_core/personal-performance-decision-loop-v2.js');

const recoveryInput={
 state:{profile:{goal:'러닝 퍼포먼스'},planner:[],actionLog:[]},
 userState:{readiness:{band:'low',reasons:['CHECKIN_LOW']},fatigue:{band:'high'},load:{band:'spike'}},
 runningPerformance:{load:{band:'spike'},confidence:.8},
 personalPerformance:{candidates:[
  {domain:'running',priority:86,reason:'RUN_LOAD_SPIKE',action:'hold_or_reduce_running_load',confidence:.8,evidence:['running_load']},
  {domain:'recovery',priority:92,reason:'RECOVERY_SIGNAL_LOW',action:'reduce_complexity_and_prioritize_recovery',confidence:.75,evidence:['readiness','fatigue']},
  {domain:'consistency',priority:20,reason:'NO_HIGH_PRIORITY_RISK',action:'continue_current_structure_and_collect_outcomes',confidence:.5,evidence:['longitudinal_evidence']}
 ]},
 adaptiveNutrition:{confidence:.8,recommendation:{direction:'review_higher_energy',reason:'RUN_FUEL_GAP',targetProposal:{eligible:true,requiresConfirmation:true,proposedDailyKcal:2400,deltaKcal:100}}},
 learningGraph:{cycles:[]}
};
const first=Loop.build(recoveryInput,{asOf:'2026-09-25'});
const second=Loop.build(recoveryInput,{asOf:'2026-09-25'});
assert.equal(first.nextAction.domain,'recovery');
assert.equal(first.nextAction.intent,'reduce_load');
assert.ok(first.conflictResolution.conflicts.includes('RECOVERY_VS_RUN_LOAD'));
assert.ok(first.decisionId&&first.recommendationId);
assert.equal(first.decisionId,second.decisionId);
assert.equal(first.recommendationId,second.recommendationId);
assert.equal(first.guardrails.oneNextAction,true);
assert.equal(first.guardrails.requiresConfirmation,true);
assert.equal(first.guardrails.noSilentMutation,true);
assert.equal(first.nextAction.execution.kind,'recovery');
assert.equal(first.nextAction.reviewAfter,'after_execution');
assert.match(first.nextAction.whyNow,/회복/);

const acceptedState={...recoveryInput.state,actionLog:[{event:'recommendation_accepted',recommendationId:first.recommendationId,at:'2026-09-25T10:00:00Z'}]};
assert.equal(Loop.interactionStatus(acceptedState,first.recommendationId).status,'accepted');
const modifiedState={...recoveryInput.state,actionLog:[{event:'recommendation_modified',recommendationId:first.recommendationId,at:'2026-09-25T10:00:00Z'}]};
assert.equal(Loop.interactionStatus(modifiedState,first.recommendationId).status,'modified');
const rejectedState={...recoveryInput.state,actionLog:[{event:'recommendation_rejected',recommendationId:first.recommendationId,at:'2026-09-25T10:00:00Z'}]};
assert.equal(Loop.interactionStatus(rejectedState,first.recommendationId).status,'rejected');

const expState={profile:{goal:'러닝 퍼포먼스'},planner:[
 {id:'p1',domain:'recovery',experimentKey:'running_performance:recovery:reduce_load'},
 {id:'p2',domain:'recovery',experimentKey:'running_performance:recovery:reduce_load'},
 {id:'p3',domain:'recovery',experimentKey:'running_performance:recovery:reduce_load'},
 {id:'base1',domain:'recovery'},
 {id:'base2',domain:'recovery'},
 {id:'base3',domain:'recovery'},
 {id:'other',domain:'running'}
]};
const graph={cycles:[
 {planId:'base1',date:'2026-09-14',outcome:{classification:'partial',score:55}},
 {planId:'base2',date:'2026-09-16',outcome:{classification:'partial',score:60}},
 {planId:'base3',date:'2026-09-18',outcome:{classification:'completed',score:65}},
 {planId:'other',date:'2026-09-19',outcome:{classification:'completed',score:100}},
 {planId:'p1',date:'2026-09-20',outcome:{classification:'completed',score:90}},
 {planId:'p2',date:'2026-09-22',outcome:{classification:'completed',score:80}},
 {planId:'p3',date:'2026-09-24',outcome:{classification:'completed',score:85}}
]};
const experiments=Loop.experimentSummary(expState,graph);
assert.equal(experiments.length,1);
assert.equal(experiments[0].sampleSize,3);
assert.equal(experiments[0].baselineSampleSize,3);
assert.equal(experiments[0].meanOutcomeScore,85);
assert.equal(experiments[0].baselineMeanScore,60);
assert.equal(experiments[0].observedDelta,25);
assert.equal(experiments[0].status,'observed');
assert.ok(experiments[0].confidence>=.5);
assert.equal(experiments[0].guardrail,'observational_not_causal');

const runningInput={
 state:{profile:{goal:'러닝 퍼포먼스'},planner:[],actionLog:[]},
 userState:{readiness:{band:'ready',reasons:[]},fatigue:{band:'low'},load:{band:'stable'}},
 runningPerformance:{confidence:.85,load:{band:'stable'},trend:{direction:'improving',status:'measured'},analysis:{paceGuide:{status:'measured',zones:{steady:{lowMinPerKm:5.1,highMinPerKm:5.55}}}}},
 personalPerformance:{candidates:[
  {domain:'running',priority:70,reason:'RUNNING_TREND_HEALTHY',action:'maintain_current_running_structure',confidence:.85,evidence:['running_trend','running_load']}
 ]},
 adaptiveNutrition:{confidence:.2,recommendation:{targetProposal:{eligible:false,requiresConfirmation:false}}},
 learningGraph:{cycles:[]}
};
const runDecision=Loop.build(runningInput,{asOf:'2026-09-25'});
assert.equal(runDecision.nextAction.domain,'running');
assert.equal(runDecision.nextAction.execution.kind,'running');
assert.equal(runDecision.nextAction.execution.paceZone,'steady');
assert.equal(runDecision.nextAction.execution.lowMinPerKm,5.1);
assert.equal(runDecision.nextAction.execution.highMinPerKm,5.55);
assert.equal(runDecision.nextAction.execution.source,'recent_28d_relative_pace');
assert.match(runDecision.nextAction.whyNow,/러닝/);

const app=fs.readFileSync(path.resolve(__dirname,'../01_app/app.js'),'utf8');
assert.match(app,/performance-decision-accept/);
assert.match(app,/performance_decision_accepted/);
assert.match(app,/decisionId:loop\.decisionId/);
assert.match(app,/recommendationId:loop\.recommendationId/);
assert.match(app,/experimentKey:loop\.experimentKey/);
assert.match(app,/recommendation_modified/);
assert.match(app,/recommendation_rejected/);
assert.match(app,/GARANG DECISION · 오늘 한 가지/);
assert.match(app,/결정은 GARANG 기록·규칙 엔진/);
assert.match(app,/개인 실험/);
assert.match(app,/trackFoodIdentityAttempt/);
assert.match(app,/food_identity_attempt/);
assert.match(app,/food_identity_result/);
assert.match(app,/실행 결과를 다음 판단에 반영/);
assert.match(app,/function commitAdaptiveNutritionTarget/);
assert.match(app,/calorieTargetSource='adaptive_nutrition_learning_v1'/);
assert.doesNotMatch(app,/calorieTargetSource:'personal_performance_decision_loop_v2'/);
assert.match(app,/commitAdaptiveNutritionTarget\(\{model,proposal,linkage:\{decisionId:loop\.decisionId,recommendationId:loop\.recommendationId,experimentKey:loop\.experimentKey\}\}\)/);
assert.match(app,/영양 목표 근거가 변경됐습니다/);

const bridge=fs.readFileSync(path.resolve(__dirname,'../06_features/final/intelligence-state-bridge-v1.js'),'utf8');
assert.match(bridge,/decisionLoopReady/);
assert.match(bridge,/getPersonalPerformanceDecisionLoop/);
assert.match(bridge,/GarangPersonalPerformanceDecisionLoopV2/);

const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../runtime-manifest.json'),'utf8'));
const core='02_core/personal-performance-decision-loop-v2.js',ppi='02_core/personal-performance-intelligence-v1.js',bridgePath='06_features/final/intelligence-state-bridge-v1.js';
assert.ok(html.indexOf('./'+core)>html.indexOf('./'+ppi));
assert.ok(html.indexOf('./'+bridgePath)>html.indexOf('./'+core));
assert.ok(manifest.scripts.indexOf(core)>manifest.scripts.indexOf(ppi));
assert.ok(manifest.scripts.indexOf(bridgePath)>manifest.scripts.indexOf(core));

console.log('personal-performance-decision-loop-v2: PASS');
