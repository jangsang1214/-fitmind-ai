'use strict';
const assert=require('node:assert/strict');
const Metrics=require('../02_core/longitudinal-learning-metrics-v1.js');

const state={
 planner:[
  {id:'p-old',domain:'training'},
  {id:'p-mid',domain:'training'},
  {id:'p-recent',domain:'training'}
 ],
 actionLog:[
  {event:'recommendation_shown',recommendationId:'r-old'},
  {event:'recommendation_accepted',recommendationId:'r-old'},
  {event:'recommendation_shown',recommendationId:'r-mid'},
  {event:'recommendation_accepted',recommendationId:'r-mid'},
  {event:'recommendation_shown',recommendationId:'r-recent'},
  {event:'recommendation_accepted',recommendationId:'r-recent'}
 ]
};
const graph={asOf:'2026-09-27',cycles:[
 {date:'2026-07-20',recommendationId:'r-old',planId:'p-old',executionId:'e-old',outcomeId:'o-old',attribution:{complete:true},outcome:{classification:'partial',score:40}},
 {date:'2026-09-10',recommendationId:'r-mid',planId:'p-mid',executionId:'e-mid',outcomeId:'o-mid',attribution:{complete:true},outcome:{classification:'partial',score:60}},
 {date:'2026-09-26',recommendationId:'r-recent',planId:'p-recent',executionId:'e-recent',outcomeId:'o-recent',attribution:{complete:true},outcome:{classification:'completed',score:90}}
]};
const result=Metrics.build(state,graph,{asOf:'2026-09-27'});
assert.equal(result.version,'longitudinal-learning-metrics-v1.2.0-recency-weighted');
assert.equal(result.outcomeWindows.recent7SampleSize,1);
assert.equal(result.outcomeWindows.recent28SampleSize,2);
assert.equal(result.outcomeWindows.staleSampleSize,1);
assert.ok(result.outcomeWindows.recencyWeightedMean>result.quality.attributedOutcomeScore,'recent strong outcome should carry more descriptive weight');
assert.ok(result.quality.recencyWeightedConfidence>0);
assert.equal(result.outcomeWindows.halfLifeDays,28);
assert.equal(result.outcomeWindows.method,'time_decay_descriptive_only');
assert.equal(result.guardrails.recencyWeightedEvidence,true);
assert.equal(result.guardrails.noCausalUseOfTimeDecay,true);

const direct=Metrics.outcomeWindowSummary([
 {date:'2026-09-27',score:100},
 {date:'2026-07-01',score:0}
],'2026-09-27');
assert.ok(direct.recencyWeightedMean>50);
assert.equal(direct.recent7SampleSize,1);
console.log('longitudinal-learning-metrics-v1 recency weighting: PASS');
