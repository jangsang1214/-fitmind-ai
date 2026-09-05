'use strict';
const assert=require('node:assert/strict');
const State=require('../functions/src/state-intelligence.cjs');
const now=new Date('2026-09-06T12:00:00Z'),day=n=>new Date(now.getTime()+n*86400000).toISOString().slice(0,10);
const workout=(n,id,duration=45,rpe=5)=>({id,sessionId:id,date:day(n),duration,rpe,volume:3000});
const base=()=>({profile:{goal:'performance'},workouts:[],runs:[],meals:[],body:[],dailyCheckins:[],planner:[],memory:{entries:[]}});
const cases=[];
{
 const s=base();cases.push(['empty_state_unknown',()=>{const x=State.estimateState(s,{now});return x.readiness.value===null&&x.fatigue.score===null&&x.confidence===0;}]);
}
{
 const s=base();s.dailyCheckins=[{date:day(-1),sleepHours:8,energy:5,stress:1,soreness:{legs:0}}];cases.push(['healthy_checkin_high_readiness',()=>State.estimateState(s,{now}).readiness.band==='high']);
}
{
 const s=base();for(const n of [-34,-31,-27,-24,-20,-17,-13,-10])s.workouts.push(workout(n,`b${n}`,40,5));for(const n of [-6,-4,-2,-1])s.workouts.push(workout(n,`r${n}`,80,9));cases.push(['training_load_spike',()=>{const x=State.estimateState(s,{now});return x.load.band==='spike'&&x.patterns.some(p=>p.id==='training_load_spike');}]);
}
{
 const s=base();for(const n of [-34,-31,-27,-24,-20,-17,-13,-10])s.workouts.push(workout(n,`b${n}`,60,7));cases.push(['training_load_drop',()=>State.estimateState(s,{now}).load.band==='drop']);
}
{
 const s=base();s.dailyCheckins=[-3,-2,-1].map(n=>({date:day(n),sleepHours:5.3,energy:2,stress:4,soreness:{legs:4}}));cases.push(['sleep_debt_detected',()=>State.estimateState(s,{now}).patterns.some(p=>p.id==='sleep_debt')]);cases.push(['fatigue_cluster_detected',()=>State.estimateState(s,{now}).patterns.some(p=>p.id==='fatigue_cluster')]);
}
{
 const s=base();s.body=[{date:day(-20),weight:72},{date:day(-10),weight:68.5},{date:day(-1),weight:65}];cases.push(['weight_down_trend',()=>State.estimateState(s,{now}).trends.bodyWeight.direction==='down']);
}
{
 const s=base();s.profile.goal='10K under 45 minutes';s.runs=[{date:day(-12),distance:5,duration:30},{date:day(-8),distance:6,duration:36},{date:day(-5),distance:7,duration:40},{date:day(-2),distance:8,duration:44}];cases.push(['running_goal_alignment',()=>{const x=State.estimateState(s,{now});return x.goalAlignment.score>=70&&x.goalAlignment.confidence>0;}]);
}
{
 const s=base();s.workouts=[workout(-1,'past',45,5),workout(5,'future',500,10)];cases.push(['future_record_excluded',()=>{const x=State.estimateState(s,{now}),y=State.estimateState({...s,workouts:[s.workouts[0]]},{now});return JSON.stringify(x.load)===JSON.stringify(y.load);}]);
}
let hits=0;for(const [name,run] of cases){const ok=!!run();console.log(ok?'PASS':'FAIL',name);if(ok)hits++;}
const accuracy=hits/cases.length;console.log('STATE_STAGE2_BENCHMARK',JSON.stringify({engineVersion:State.ENGINE_VERSION,cases:cases.length,hits,classificationAccuracy:accuracy}));assert.ok(accuracy>=.9,`classificationAccuracy ${accuracy}`);
