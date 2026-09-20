'use strict';
const assert=require('node:assert/strict');
const Model=require('../02_core/user-performance-model-v1.js');
const now=new Date('2026-09-17T12:00:00+09:00');
const state={
  onboarding:{weeklyFrequency:4},
  workouts:[
    {id:'w1',date:'2026-09-15'},{id:'w2',date:'2026-09-13'},{id:'w3',date:'2026-09-10'},{id:'w4',date:'2026-09-08'}
  ],
  checkins:[
    {id:'c1',date:'2026-09-15',sleep:7.5,energy:4,stress:2,soreness:2},
    {id:'c2',date:'2026-09-13',sleep:7,energy:3,stress:2,soreness:2}
  ],
  meals:[{id:'m1',date:'2026-09-15'},{id:'m2',date:'2026-09-14'},{id:'m3',date:'2026-09-13'}],
  planner:[
    {id:'p1',date:'2026-09-15',completed:true},
    {id:'p2',date:'2026-09-14',status:'missed'},
    {id:'p3',date:'2026-09-13',status:'completed'}
  ],
  actionLog:[
    {id:'a1',at:'2026-09-15T08:00:00Z',event:'write_confirmed',recommendationId:'r1'},
    {id:'a2',at:'2026-09-14T08:00:00Z',event:'write_rejected',recommendationId:'r2'},
    {id:'a3',at:'2026-09-13T08:00:00Z',event:'recommendation_dismissed',recommendationId:'r3'}
  ]
};
const learningGraph={cycles:[
  {date:'2026-09-12',recommendationId:'r-out-1',outcomeId:'o1',attribution:{complete:true},outcome:{classification:'completed',score:100}},
  {date:'2026-09-13',recommendationId:'r-out-2',outcomeId:'o2',attribution:{complete:true},outcome:{classification:'partial',score:50}},
  {date:'2026-09-14',recommendationId:'r-out-3',outcomeId:'o3',attribution:{complete:true},outcome:{classification:'missed',score:0}},
  {date:'2026-09-15',recommendationId:'r-out-4',outcomeId:'o4',attribution:{complete:true},outcome:{classification:'completed',score:80}},
  {date:'2026-09-16',recommendationId:'r-pending',outcomeId:null,attribution:{complete:false},outcome:{classification:'pending',score:null}}
]};
const model=Model.build(state,{days:28,asOf:now,learningGraph});
assert.equal(model.modelVersion,Model.MODEL_VERSION);
assert.equal(model.guardrails.readOnly,true);
assert.equal(model.guardrails.noDecisionMutation,true);
assert.equal(model.dimensions.trainingConsistency.sampleSize,4);
assert.equal(model.dimensions.planAdherence.sampleSize,3);
assert.equal(model.dimensions.planAdherence.value,66.67);
assert.equal(model.dimensions.recommendationResponsiveness.sampleSize,3);
assert.equal(model.dimensions.recommendationResponsiveness.value,33.33);
assert.equal(model.dimensions.attributedOutcomeScore.sampleSize,4);
assert.equal(model.dimensions.attributedOutcomeScore.value,57.5);
assert.equal(model.dimensions.attributedOutcomeScore.confidence,0.67);
assert.deepEqual(model.dimensions.attributedOutcomeScore.evidenceIds,['o1','o2','o3','o4']);
for(const [name,row] of Object.entries(model.dimensions)){
  for(const key of ['value','confidence','sampleSize','lastUpdated','evidenceIds'])assert.ok(Object.prototype.hasOwnProperty.call(row,key),`${name}.${key} required`);
  assert.ok(row.confidence>=0&&row.confidence<=1,`${name}.confidence range`);
  assert.ok(Array.isArray(row.evidenceIds),`${name}.evidenceIds array`);
}
assert.deepEqual(Model.validate(model),{valid:true,reasons:[]});
const empty=Model.build({}, {days:28,asOf:now});
assert.equal(empty.dimensions.planAdherence.value,null);
assert.equal(empty.dimensions.recommendationResponsiveness.value,null);
assert.equal(empty.dimensions.attributedOutcomeScore.value,null);
assert.equal(empty.dimensions.attributedOutcomeScore.confidence,0);
assert.deepEqual(Model.validate(empty),{valid:true,reasons:[]});
console.log('user-performance-model-v1: PASS');
