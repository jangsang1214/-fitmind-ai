'use strict';
const assert=require('node:assert/strict');
const Core=require('../02_core/plan-execution-v1.js');

const tests=[];
function test(name,fn){fn();tests.push(name);console.log(`PASS ${name}`);}
const base=()=>({
  profile:{age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},
  onboarding:{goal:'근육 증가'},
  planner:[],workouts:[],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[]
});

test('goal-aware calorie target changes without mutating source',()=>{
  const muscle=base(),before=JSON.stringify(muscle);
  const m=Core.estimateTargets(muscle,'2026-09-08');
  muscle.profile.goal='체지방 감소';muscle.onboarding.goal='체지방 감소';
  const cut=Core.estimateTargets(muscle,'2026-09-08');
  assert.ok(m.calorieTarget>cut.calorieTarget);
  muscle.profile.goal='퍼포먼스 향상';muscle.onboarding.goal='퍼포먼스 향상';
  const performance=Core.estimateTargets(muscle,'2026-09-08');
  assert.ok(performance.calorieTarget>cut.calorieTarget);
  const untouched=JSON.parse(before);assert.equal(untouched.profile.goal,'근육 증가');
});

test('missing adult profile data never fabricates a calorie target',()=>{
  const s=base();s.profile={weight:70,goal:'근육 증가'};
  const t=Core.estimateTargets(s,'2026-09-08');
  assert.equal(t.calorieTarget,null);
  assert.ok(t.reasons.includes('MISSING_HEIGHT'));
  assert.ok(t.reasons.includes('MISSING_AGE'));
});

test('minor profile does not receive an adult calorie target',()=>{
  const s=base();s.profile.age=17;
  const t=Core.estimateTargets(s,'2026-09-08');
  assert.equal(t.calorieTarget,null);
  assert.ok(t.reasons.includes('AGE_REQUIRES_CLINICAL_TARGET'));
});

test('explicit completion and actual records both count as execution',()=>{
  const s=base();
  s.planner=[
    {id:'p1',date:'2026-09-08',time:'10:00',type:'nutrition',title:'칼로리 목표',completed:true},
    {id:'p2',date:'2026-09-08',time:'18:00',type:'workout',title:'상체 운동',completed:false}
  ];
  s.workouts=[{id:'w1',sessionId:'s1',date:'2026-09-08',name:'Bench',volume:3000}];
  s.meals=[{id:'m1',date:'2026-09-08',kcal:2200,protein:140}];
  const d=Core.daily(s,'2026-09-08');
  assert.equal(d.plan.planned,2);assert.equal(d.plan.executed,2);assert.equal(d.plan.rate,100);
  assert.equal(d.plan.explicitCompleted,1);assert.equal(d.plan.derivedCompleted,1);
  assert.equal(d.plan.items[1].evidence,'ACTUAL_RECORD_MATCH');
});

test('one workout session cannot satisfy two uncompleted workout plans',()=>{
  const s=base();
  s.planner=[
    {id:'p1',date:'2026-09-08',time:'09:00',type:'workout',title:'AM lift'},
    {id:'p2',date:'2026-09-08',time:'18:00',type:'workout',title:'PM lift'}
  ];
  s.workouts=[{id:'w1',sessionId:'same',date:'2026-09-08',name:'Squat'},{id:'w2',sessionId:'same',date:'2026-09-08',name:'Leg press'}];
  const d=Core.daily(s,'2026-09-08');
  assert.equal(d.evidence.workout.sessions,1);assert.equal(d.plan.executed,1);assert.equal(d.plan.rate,50);
});

test('future records do not leak into a historical daily execution result',()=>{
  const s=base();
  s.planner=[{id:'p1',date:'2026-09-08',type:'workout',title:'Lift'}];
  s.workouts=[{id:'future',sessionId:'future',date:'2026-09-09',name:'Deadlift'}];
  const d=Core.daily(s,'2026-09-08');
  assert.equal(d.evidence.workout.sessions,0);assert.equal(d.plan.executed,0);
});

test('goal-aware nutrition adequacy distinguishes insufficient and on target intake',()=>{
  const s=base();
  const target=Core.estimateTargets(s,'2026-09-08').calorieTarget;
  s.meals=[{id:'m1',date:'2026-09-08',kcal:Math.round(target*.7),protein:60}];
  assert.equal(Core.daily(s,'2026-09-08').nutrition.calories.status,'insufficient');
  s.meals=[{id:'m2',date:'2026-09-08',kcal:target,protein:112}];
  assert.equal(Core.daily(s,'2026-09-08').nutrition.calories.status,'on_target');
});

test('seven-day range reports execution, nutrition hits and streak',()=>{
  const s=base();
  for(let i=0;i<3;i++){
    const date=`2026-09-0${6+i}`;
    s.planner.push({id:`p${i}`,date,type:'workout',title:'Workout',completed:true});
    s.workouts.push({id:`w${i}`,sessionId:`s${i}`,date,name:'Lift'});
    const target=Core.estimateTargets(s,date).calorieTarget;
    s.meals.push({id:`m${i}`,date,kcal:target,protein:112});
  }
  const r=Core.range(s,{endDate:'2026-09-08',days:7});
  assert.equal(r.planned,3);assert.equal(r.executed,3);assert.equal(r.executionRate,100);
  assert.equal(r.calorieOnTargetDays,3);assert.equal(r.proteinOnTargetDays,3);assert.equal(r.currentExecutionStreak,3);
});

test('core never mutates source state',()=>{
  const s=base();s.planner=[{id:'p1',date:'2026-09-08',type:'workout',title:'Lift'}];s.workouts=[{id:'w1',sessionId:'s1',date:'2026-09-08',name:'Lift'}];
  const before=JSON.stringify(s);Core.daily(s,'2026-09-08');Core.range(s,{endDate:'2026-09-08'});Core.accumulation(s,{endDate:'2026-09-08'});
  assert.equal(JSON.stringify(s),before);
});

console.log(`${tests.length} plan execution tests passed`);
