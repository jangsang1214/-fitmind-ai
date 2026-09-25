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

const acceptedState={...recoveryInput.state,actionLog:[{event:'recommendation_accepted',recommendationId:first.recommendationId,at:'2026-09-25T10:00:00Z'}]};
assert.equal(Loop.interactionStatus(acceptedState,first.recommendationId).status,'accepted');
const modifiedState={...recoveryInput.state,actionLog:[{event:'recommendation_modified',recommendationId:first.recommendationId,at:'2026-09-25T10:00:00Z'}]};
assert.equal(Loop.interactionStatus(modifiedState,first.recommendationId).status,'modified');
const rejectedState={...recoveryInput.state,actionLog:[{event:'recommendation_rejected',recommendationId:first.recommendationId,at:'2026-09-25T10:00:00Z'}]};
assert.equal(Loop.interactionStatus(rejectedState,first.recommendationId).status,'rejected');

const expState={profile:{goal:'러닝 퍼포먼스'},planner:[
 {id:'p1',experimentKey:'running_performance:recovery:reduce_load'},
 {id:'p2',experimentKey:'running_performance:recovery:reduce_load'},
 {id:'base'}
]};
const graph={cycles:[
 {planId:'p1',date:'2026-09-20',outcome:{classification:'completed',score:90}},
 {planId:'p2',date:'2026-09-22',outcome:{classification:'completed',score:80}},
 {planId:'base',date:'2026-09-18',outcome:{classification:'partial',score:60}}
]};
const experiments=Loop.experimentSummary(expState,graph);
assert.equal(experiments.length,1);
assert.equal(experiments[0].sampleSize,2);
assert.equal(experiments[0].meanOutcomeScore,85);
assert.equal(experiments[0].baselineMeanScore,60);
assert.equal(experiments[0].observedDelta,25);
assert.equal(experiments[0].status,'observed');
assert.equal(experiments[0].guardrail,'observational_not_causal');

const app=fs.readFileSync(path.resolve(__dirname,'../01_app/app.js'),'utf8');
assert.match(app,/performance-decision-accept/);
assert.match(app,/performance_decision_accepted/);
assert.match(app,/decisionId:loop\.decisionId/);
assert.match(app,/recommendationId:loop\.recommendationId/);
assert.match(app,/experimentKey:loop\.experimentKey/);
assert.match(app,/recommendation_modified/);
assert.match(app,/recommendation_rejected/);
assert.match(app,/Personal Experiments/);
assert.match(app,/개인 실험은 관찰적 패턴/);

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
