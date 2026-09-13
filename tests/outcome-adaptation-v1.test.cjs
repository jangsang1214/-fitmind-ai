'use strict';
const assert=require('node:assert/strict');
const Adapt=require('../06_features/final/outcome-adaptation-v1.js');
const date='2026-09-14';
const base={planner:[],workouts:[],runs:[],meals:[],checkins:[],dailyCheckins:[]};
const withState=patch=>({...base,...patch});

{
  const out=Adapt.interpret(withState({planner:[
    {date,type:'workout',completed:true},
    {date,type:'nutrition',completed:true},
    {date,type:'recovery',completed:true}
  ],workouts:[{date}],meals:[{date}],dailyCheckins:[{date,sleep:7.5,energy:4,stress:2,soreness:2}]}),{date});
  assert.equal(out.outcome.status,'completed');
  assert.equal(out.outcome.completionRate,100);
  assert.equal(out.adaptation.action,'hold');
  assert.equal(out.adaptation.requiresApproval,true);
  assert.equal(out.writeIntent,null,'interpretation must never perform or imply a direct write');
}

{
  const out=Adapt.interpret(withState({planner:[
    {date,type:'workout',completed:false},
    {date,type:'nutrition',completed:false},
    {date,type:'recovery',completed:false}
  ],workouts:[{date}],dailyCheckins:[{date,sleep:7.2,energy:4,stress:2,soreness:1}]}),{date});
  assert.equal(out.outcome.status,'partial');
  assert.equal(out.adaptation.action,'hold-or-simplify');
}

{
  const out=Adapt.interpret(withState({planner:[
    {date,type:'workout',completed:false},
    {date,type:'nutrition',completed:false},
    {date,type:'recovery',completed:false}
  ]}),{date});
  assert.equal(out.outcome.status,'missed');
  assert.equal(out.adaptation.action,'simplify');
  assert.equal(out.adaptation.volumeDeltaPct,-10);
}

{
  const out=Adapt.interpret(withState({planner:[
    {date,type:'workout',completed:false},
    {date,type:'nutrition',completed:false},
    {date,type:'recovery',completed:true}
  ],dailyCheckins:[{date,sleep:5.2,energy:2,stress:4,soreness:5}]}),{date});
  assert.equal(out.outcome.status,'recovery-constrained');
  assert.deepEqual(out.outcome.recovery.reasons,['low_sleep','low_energy','high_stress','high_soreness']);
  assert.equal(out.adaptation.action,'reduce-load');
  assert.equal(out.adaptation.volumeDeltaPct,-20);
  assert.equal(out.adaptation.priority,'recovery');
  assert.equal(out.adaptation.requiresApproval,true);
}

{
  const out=Adapt.interpret(withState({workouts:[{date}]}),{date});
  assert.equal(out.outcome.status,'insufficient-evidence','actual record alone must not invent plan intent');
  assert.equal(out.adaptation.action,'collect-evidence');
  assert.equal(out.adaptation.requiresApproval,false);
}

assert.equal(Adapt.domainOf({type:'running'}),'training');
assert.equal(Adapt.domainOf({type:'meal'}),'nutrition');
assert.equal(Adapt.domainOf({type:'sleep'}),'recovery');
console.log('outcome-adaptation-v1: PASS');
