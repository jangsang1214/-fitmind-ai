'use strict';
const assert=require('node:assert/strict');
const Learning=require('../src/intelligence-learning-contract.cjs');
const OutcomeLearning=require('../src/outcome-learning-v2.cjs');

const state={
  planner:[
    {id:'p-training',date:'2026-09-15',domain:'training',type:'workout',decisionId:'d-1',decisionMode:'reduce',recommendationId:'r-1',recommendationRevision:1},
    {id:'p-recovery',date:'2026-09-15',domain:'recovery',type:'recovery',decisionId:'d-1',decisionMode:'reduce',recommendationId:'r-1',recommendationRevision:1},
    {id:'p-nutrition',date:'2026-09-15',domain:'nutrition',type:'nutrition',decisionId:'d-1',decisionMode:'reduce',recommendationId:'r-1',recommendationRevision:1}
  ],
  actionLog:[{id:'a-1',action:'daily_plan_draft_confirmed',args:{date:'2026-09-15',planIds:['p-training','p-recovery','p-nutrition'],decisionId:'d-1',decisionMode:'reduce',recommendationId:'r-1',recommendationRevision:1},at:'2026-09-15T08:00:00.000Z'}],
  meta:{dailyPlanDrafts:{
    '2026-09-15':{status:'finalized',result:'partial',finalizedAt:'2026-09-16T00:01:00.000Z',outcome:{status:'partial_execution',domains:{training:{rate:100},recovery:{rate:50},nutrition:{rate:0}}}}
  }}
};
const before=JSON.stringify(state),now=new Date('2026-09-16T12:00:00Z'),graph=Learning.buildGraph(state,{now,days:28});
assert.equal(graph.cycles.length,3);assert.equal(graph.summary.fullyAttributed,3);assert.equal(graph.edges.length,15);
assert.deepEqual(graph.cycles.map(row=>row.outcome.classification),['completed','partial','missed']);
assert.ok(graph.cycles.every(row=>row.decisionId==='d-1'&&row.recommendationId==='r-1'&&row.actionId==='a-1'));
assert.ok(graph.cycles.every(row=>row.executionId&&row.outcomeId&&row.attribution.complete));
const graphAgain=Learning.buildGraph(state,{now,days:28});assert.deepEqual(graph.cycles.map(row=>row.executionId),graphAgain.cycles.map(row=>row.executionId));assert.deepEqual(graph.cycles.map(row=>row.outcomeId),graphAgain.cycles.map(row=>row.outcomeId));
assert.equal(JSON.stringify(state),before);

const learned=OutcomeLearning.summarizeOutcomeLearning(state,{now,days:28,recentDays:7});
assert.equal(learned.interventionLearning.summary.plans,3);assert.equal(learned.interventionLearning.summary.fullyAttributed,3);assert.equal(learned.guardrails.interventionLearningAdvisoryOnly,true);assert.equal(learned.decisionSupport.automaticProgressionIncrease,false);
const compact=OutcomeLearning.compactForContext(learned);assert.equal(compact.interventionLearning.cycles.length,3);assert.equal(compact.interventionLearning.guardrails.noRawChatRequired,true);
console.log('PASS functions intelligence-learning-contract');
