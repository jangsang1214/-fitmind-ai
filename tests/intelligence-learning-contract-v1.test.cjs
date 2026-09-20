'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Learning=require('../02_core/intelligence-learning-contract-v1.js');
const PlanExecution=require('../02_core/plan-execution-v1.js');
const UserPerformance=require('../02_core/user-performance-model-v1.js');

const root=path.resolve(__dirname,'..');
const tests=[];
function test(name,fn){fn();tests.push(name);console.log(`PASS ${name}`);}
function base(){return {profile:{age:27,height:174,weight:70,gender:'male',goal:'퍼포먼스 향상'},planner:[],workouts:[],meals:[],runs:[],body:[],dailyCheckins:[],checkins:[],actionLog:[]};}

function completedState(){
  const state=base();
  state.planner=[{id:'plan-1',date:'2026-09-15',type:'workout',domain:'training',title:'Reduced-load session',confirmedAt:'2026-09-15T09:00:00.000Z',decisionId:'decision-1',decisionMode:'reduce',recommendationId:'recommendation-1',recommendationRevision:2}];
  state.actionLog=[{id:'action-1',action:'daily_plan_draft_confirmed',args:{date:'2026-09-15',planIds:['plan-1'],decisionId:'decision-1',decisionMode:'reduce',recommendationId:'recommendation-1',recommendationRevision:2},at:'2026-09-15T09:00:00.000Z'}];
  state.workouts=[{id:'workout-1',sessionId:'session-1',date:'2026-09-15',name:'Bench',volume:2200,createdAt:'2026-09-15T11:00:00.000Z'}];
  return state;
}

function performanceState(){
  const state=base();
  state.onboarding={weeklyFrequency:4};
  state.workouts=[{id:'w1',date:'2026-09-15'},{id:'w2',date:'2026-09-13'},{id:'w3',date:'2026-09-10'},{id:'w4',date:'2026-09-08'}];
  state.checkins=[{id:'c1',date:'2026-09-15',sleep:7.5,energy:4,stress:2,soreness:2},{id:'c2',date:'2026-09-13',sleep:7,energy:3,stress:2,soreness:2}];
  state.meals=[{id:'m1',date:'2026-09-15'},{id:'m2',date:'2026-09-14'},{id:'m3',date:'2026-09-13'}];
  state.planner=[{id:'p1',date:'2026-09-15',completed:true},{id:'p2',date:'2026-09-14',status:'missed'},{id:'p3',date:'2026-09-13',status:'completed'}];
  state.actionLog=[{id:'a1',at:'2026-09-15T08:00:00Z',event:'recommendation_accepted',recommendationId:'r1'},{id:'a2',at:'2026-09-14T08:00:00Z',event:'recommendation_rejected',recommendationId:'r2'},{id:'a3',at:'2026-09-13T08:00:00Z',event:'recommendation_dismissed',recommendationId:'r3'}];
  return state;
}

test('builds a complete decision to outcome attribution chain from existing evidence',()=>{
  const state=completedState(),graph=Learning.buildDayGraph(state,'2026-09-15',{planExecution:PlanExecution,now:new Date('2026-09-16T12:00:00Z')});
  assert.equal(graph.contractVersion,Learning.CONTRACT_VERSION);assert.equal(graph.cycles.length,1);
  const cycle=graph.cycles[0];
  assert.equal(cycle.decisionId,'decision-1');assert.equal(cycle.recommendationId,'recommendation-1');assert.equal(cycle.actionId,'action-1');assert.equal(cycle.planId,'plan-1');
  assert.ok(cycle.executionId);assert.ok(cycle.outcomeId);assert.equal(cycle.outcome.classification,'completed');assert.equal(cycle.attribution.complete,true);
  assert.deepEqual(graph.edges.map(edge=>edge.type),Learning.EDGE_TYPES);assert.equal(graph.summary.fullyAttributed,1);
});

test('execution and outcome ids are deterministic for identical evidence',()=>{
  const state=completedState(),options={planExecution:PlanExecution,now:new Date('2026-09-16T12:00:00Z')};
  const first=Learning.buildDayGraph(state,'2026-09-15',options).cycles[0],second=Learning.buildDayGraph(state,'2026-09-15',options).cycles[0];
  assert.equal(first.executionId,second.executionId);assert.equal(first.outcomeId,second.outcomeId);
});

test('today without execution evidence remains pending and never invents an outcome id',()=>{
  const state=base();state.planner=[{id:'plan-pending',date:'2026-09-16',type:'workout',domain:'training',title:'Workout',decisionId:'d-pending',recommendationId:'r-pending'}];
  state.actionLog=[{id:'a-pending',action:'daily_plan_draft_confirmed',args:{date:'2026-09-16',planIds:['plan-pending'],decisionId:'d-pending',recommendationId:'r-pending'},at:'2026-09-16T08:00:00.000Z'}];
  const cycle=Learning.buildDayGraph(state,'2026-09-16',{planExecution:PlanExecution,now:new Date('2026-09-16T12:00:00Z')}).cycles[0];
  assert.equal(cycle.executionId,null);assert.equal(cycle.outcome.classification,'pending');assert.equal(cycle.outcomeId,null);assert.equal(cycle.attribution.complete,false);
});

test('past unexecuted plan records a finalized non-execution observation',()=>{
  const state=base();state.planner=[{id:'plan-missed',date:'2026-09-14',type:'workout',domain:'training',title:'Workout',decisionId:'d-missed',recommendationId:'r-missed'}];
  state.actionLog=[{id:'a-missed',action:'daily_plan_draft_confirmed',args:{date:'2026-09-14',planIds:['plan-missed'],decisionId:'d-missed',recommendationId:'r-missed'},at:'2026-09-14T08:00:00.000Z'}];
  const cycle=Learning.buildDayGraph(state,'2026-09-14',{planExecution:PlanExecution,now:new Date('2026-09-16T12:00:00Z')}).cycles[0];
  assert.ok(cycle.executionId);assert.equal(cycle.execution.status,'not_observed_finalized');assert.equal(cycle.outcome.classification,'missed');assert.ok(cycle.outcomeId);assert.equal(cycle.attribution.complete,true);
});

test('contract graph is read-only and never mutates source state',()=>{
  const state=completedState(),before=JSON.stringify(state);Learning.buildGraph(state,{planExecution:PlanExecution,now:new Date('2026-09-16T12:00:00Z'),days:28});assert.equal(JSON.stringify(state),before);
});

test('contract graph enforces calendar lookback instead of counting old plan days',()=>{
  const state=completedState();state.planner.push({id:'old-plan',date:'2026-07-01',decisionId:'old-d',recommendationId:'old-r'});
  const graph=Learning.buildGraph(state,{planExecution:PlanExecution,now:new Date('2026-09-16T12:00:00Z'),days:28});
  assert.equal(graph.cycles.some(row=>row.planId==='old-plan'),false);
});

test('validateCycle reports missing causal links',()=>{
  assert.deepEqual(Learning.validateCycle({decisionId:'d'}),{valid:false,reasons:['MISSING_RECOMMENDATION_ID','MISSING_ACTION_ID','MISSING_PLAN_ID']});
  assert.deepEqual(Learning.validateCycle({decisionId:'d',recommendationId:'r',actionId:'a',planId:'p'}),{valid:true,reasons:[]});
});

test('User Performance Model exposes evidence-aware dimensions without mutating decisions',()=>{
  const state=performanceState(),before=JSON.stringify(state),model=UserPerformance.build(state,{days:28,asOf:new Date('2026-09-17T12:00:00+09:00')});
  assert.equal(JSON.stringify(state),before);
  assert.equal(model.guardrails.readOnly,true);assert.equal(model.guardrails.noDecisionMutation,true);
  assert.equal(model.dimensions.planAdherence.value,66.67);assert.equal(model.dimensions.recommendationResponsiveness.value,33.33);
  assert.equal(model.dimensions.recommendationResponsiveness.sampleSize,3);
  for(const row of Object.values(model.dimensions))for(const key of ['value','confidence','sampleSize','lastUpdated','evidenceIds'])assert.ok(Object.prototype.hasOwnProperty.call(row,key));
  assert.deepEqual(UserPerformance.validate(model),{valid:true,reasons:[]});
});

test('User Performance context exposes only dimensions that meet the confidence threshold',()=>{
  const state=performanceState(),before=JSON.stringify(state),model=UserPerformance.build(state,{days:28,asOf:new Date('2026-09-17T12:00:00+09:00')}),context=UserPerformance.compactForContext(model);
  assert.equal(JSON.stringify(state),before);
  assert.equal(context.minConfidence,0.5);
  assert.deepEqual(Object.keys(context.dimensions),['trainingConsistency']);
  assert.equal(context.dimensions.trainingConsistency.confidence,0.5);
  assert.ok(context.withheldDimensions.some(row=>row.name==='recoveryStability'&&row.reason==='LOW_CONFIDENCE'));
  assert.ok(context.withheldDimensions.some(row=>row.name==='recommendationResponsiveness'&&row.reason==='LOW_CONFIDENCE'));
  assert.equal(context.guardrails.readOnly,true);assert.equal(context.guardrails.affectsDecision,false);assert.equal(context.guardrails.noDecisionMutation,true);assert.equal(context.guardrails.noAutomaticProgression,true);
});

test('User Performance context supports explicit thresholds without inventing missing evidence',()=>{
  const state=performanceState(),model=UserPerformance.build(state,{days:28,asOf:new Date('2026-09-17T12:00:00+09:00')}),context=UserPerformance.compactForContext(model,{minConfidence:0.25}),emptyContext=UserPerformance.compactForContext(UserPerformance.build({}, {days:28,asOf:new Date('2026-09-17T12:00:00+09:00')}),{minConfidence:0});
  assert.ok(context.dimensions.trainingConsistency);assert.ok(context.dimensions.recoveryStability);assert.ok(context.dimensions.planAdherence);assert.ok(context.dimensions.recommendationResponsiveness);assert.equal(context.dimensions.nutritionConsistency,undefined);
  assert.equal(Object.keys(emptyContext.dimensions).length,0);assert.ok(emptyContext.withheldDimensions.every(row=>row.reason==='NO_VALUE'));
});

test('production boot loads User Performance and attribution contracts before the Intelligence Bridge',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8'));
  const modelScript='02_core/user-performance-model-v1.js',planScript='02_core/plan-execution-v1.js',learningScript='02_core/intelligence-learning-contract-v1.js',bridgeScript='06_features/final/intelligence-state-bridge-v1.js';
  const htmlModel=html.indexOf(`./${modelScript}`),htmlPlan=html.indexOf(`./${planScript}`),htmlLearning=html.indexOf(`./${learningScript}`),htmlBridge=html.indexOf(`./${bridgeScript}`),manifestModel=manifest.scripts.indexOf(modelScript),manifestPlan=manifest.scripts.indexOf(planScript),manifestLearning=manifest.scripts.indexOf(learningScript),manifestBridge=manifest.scripts.indexOf(bridgeScript);
  assert.ok(htmlModel>=0&&htmlBridge>htmlModel,'index.html must boot User Performance Model before Intelligence Bridge');
  assert.ok(htmlPlan>=0&&htmlLearning>htmlPlan&&htmlBridge>htmlLearning,'index.html must boot Plan Execution then Learning Contract before Intelligence Bridge');
  assert.ok(manifestModel>=0&&manifestBridge>manifestModel,'runtime-manifest must track User Performance Model before Intelligence Bridge');
  assert.ok(manifestPlan>=0&&manifestLearning>manifestPlan&&manifestBridge>manifestLearning,'runtime-manifest must track Plan Execution then Learning Contract before Intelligence Bridge');
});

test('Intelligence Bridge exposes confidence-gated User Performance context without Decision ownership',()=>{
  const state=performanceState(),before=JSON.stringify(state),bridgeSource=fs.readFileSync(path.join(root,'06_features/final/intelligence-state-bridge-v1.js'),'utf8');
  assert.equal(bridgeSource.includes('GarangDecisionIntelligence'),false,'bridge must not acquire Decision Intelligence ownership');
  assert.equal(bridgeSource.includes('.decide('),false,'bridge must not call deterministic decision selection from performance context');
  const sandbox={console,JSON,window:null};sandbox.window=sandbox;sandbox.GarangAgentStateBridge={ready:()=>true,getState:()=>state,getUserState:()=>null,getDecision:()=>null,getMemoryContext:()=>null};sandbox.GarangIntelligenceCore={run:()=>({ok:true}),compactForContext:value=>value,diagnostics:()=>({})};sandbox.GarangPerformanceScore={compute:()=>({})};sandbox.GarangAdaptivePlanner={adaptWeek:()=>({})};sandbox.GarangPlanAdaptation={derive:()=>null,compactForContext:value=>value,weeklyReview:()=>null,compactWeeklyReview:value=>value};sandbox.GarangUserPerformanceModelV1=UserPerformance;sandbox.GarangIntelligenceLearningContractV1=Learning;sandbox.GarangPlanExecution=PlanExecution;
  vm.runInNewContext(bridgeSource,sandbox,{filename:'intelligence-state-bridge-v1.js'});
  const bridge=sandbox.GarangIntelligenceBridge,context=bridge.getUserPerformanceContext({days:28,asOf:new Date('2026-09-17T12:00:00+09:00'),minConfidence:0.5});
  assert.equal(bridge.userPerformanceReady(),true);assert.equal(context.minConfidence,0.5);assert.equal(Object.keys(context.dimensions).join(','),'trainingConsistency');assert.ok(context.withheldDimensions.some(row=>row.name==='attributedOutcomeScore'&&row.reason==='NO_VALUE'));assert.equal(context.guardrails.affectsDecision,false);assert.equal(JSON.stringify(state),before);
});

console.log(`PASS intelligence-learning-contract-v1 ${tests.length} tests`);
