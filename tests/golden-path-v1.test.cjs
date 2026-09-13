'use strict';
const assert=require('node:assert/strict');
const Core=require('../02_core/golden-path-v1.js');

const date='2026-09-10';
const base=()=>({
  profile:{goal:'근육 증가'},
  onboarding:{complete:false,skipped:false,goal:'근육 증가'},
  planner:[],workouts:[],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],
  analytics:{events:[]}
});
const view=(screen,at=date,props={})=>({name:'screen_viewed',props:{screen,date:at,...props},at:`${at}T12:00:00.000Z`});
const coachAnswered=(at=date)=>({name:'ai_chat_answered',props:{date:at},at:`${at}T12:05:00.000Z`});

{
  const state=base();state.checkins=[{id:'c1',date}];
  const result=Core.derive(state,{today:date});
  assert.equal(result.step,'onboarding');
  assert.equal(result.records.hasMeaningful,false,'a check-in is recovery evidence, not the first meaningful record');
  assert.equal(result.records.count,0);
  assert.equal(result.nextAction.action,'onboarding');
  console.log('PASS onboarding precedes first-record guidance');
}

{
  const state=base();state.onboarding.complete=true;state.workouts=[{id:'w1',date,name:'스쿼트'}];
  const result=Core.derive(state,{today:date});
  assert.equal(result.step,'coach');
  assert.equal(result.records.domains.workout,true);
  assert.equal(result.records.count,1);
  assert.equal(result.nextAction.action,'coach');
  assert.ok(result.nextAction.reason&&result.nextAction.evidence.length&&result.nextAction.source&&result.nextAction.expectedOutcome);
  console.log('PASS first record advances to evidence-backed Coach interpretation');
}

{
  const state=base();state.onboarding.complete=true;state.workouts=[{id:'w1',date,name:'스쿼트',createdAt:`${date}T08:00:00.000Z`}];
  state.analytics.events=[view('coach')];
  let result=Core.derive(state,{today:date});
  assert.equal(result.step,'coach','opening Coach is engagement, not interpretation evidence');
  state.aiChat.push({role:'user',text:'내 기록 봐줘'});
  result=Core.derive(state,{today:date});
  assert.equal(result.step,'coach','a user message alone must not complete the interpretation step');
  state.analytics.events.push(coachAnswered());
  result=Core.derive(state,{today:date});
  assert.equal(result.step,'plan');assert.equal(result.recoveryReady,false);assert.equal(result.recoveryDate,null);
  assert.equal(result.nextAction.action,'collect_data','missing recovery evidence must use the truthful collect_data fallback');
  assert.equal(result.nextAction.intent,'checkin');
  state.checkins.push({id:'c1',date,sleep:7,energy:4,stress:2,soreness:2});
  result=Core.derive(state,{today:date});
  assert.equal(result.step,'plan');assert.equal(result.recoveryReady,true);assert.equal(result.recoveryDate,date);
  assert.equal(result.nextAction.action,'plan');
  console.log('PASS plan step requires real Coach output and recent recovery evidence');
}

{
  const state=base();state.onboarding.complete=true;state.workouts=[{id:'w1',sessionId:'s1',date,name:'스쿼트',createdAt:'2026-09-10T09:00:00.000Z'}];
  state.analytics.events=[coachAnswered(),view('progress')];
  let result=Core.derive(state,{today:date});
  assert.equal(result.step,'plan','a Progress visit without execution must never complete accumulation');
  assert.equal(result.progressDate,null);
  state.planner=[{id:'p1',date,type:'workout',title:'오늘 하체',goalLabel:'근육 증가',createdAt:'2026-09-10T10:00:00.000Z'}];
  result=Core.derive(state,{today:date});
  assert.equal(result.step,'execute');
  assert.equal(result.execution.planned,1);
  assert.equal(result.execution.executed,0);
  state.workouts.push({id:'w2',sessionId:'s2',date,name:'레그프레스',createdAt:'2026-09-10T11:00:00.000Z'});
  result=Core.derive(state,{today:date});
  assert.equal(result.step,'complete','an accumulation visit becomes meaningful only after real execution evidence exists');
  assert.equal(result.execution.allExecuted,true);
  assert.equal(result.progressDate,date);
  console.log('PASS Coach → plan → execution → meaningful accumulation progression');
}

{
  const state=base();state.onboarding.complete=true;
  state.workouts=[{id:'w1',sessionId:'s1',date,name:'스쿼트',createdAt:'2026-09-10T09:00:00.000Z'}];
  state.checkins=[{id:'c1',date,sleep:7,createdAt:'2026-09-10T09:15:00.000Z'}];
  state.analytics.events=[coachAnswered()];
  state.planner=[
    {id:'p-training',date,time:'18:30',order:1,type:'workout',domain:'training',title:'상체 근력 45분',createdAt:'2026-09-10T10:00:00.000Z'},
    {id:'p-recovery',date,time:'21:30',order:2,type:'recovery',domain:'recovery',title:'스트레칭 + 수면 준비',createdAt:'2026-09-10T10:00:00.000Z'},
    {id:'p-nutrition',date,time:'12:30',order:3,type:'nutrition',domain:'nutrition',title:'단백질 목표 채우기',createdAt:'2026-09-10T10:00:00.000Z'}
  ];
  let result=Core.derive(state,{today:date});
  assert.equal(result.step,'execute');
  assert.equal(result.nextPlan.type,'workout','canonical Daily Plan order must drive the first Golden Path action');
  assert.equal(result.nextAction.action,'execute');
  assert.equal(result.nextAction.planId,'p-training');
  assert.equal(result.execution.executed,0,'pre-plan evidence must not execute a newly confirmed track');
  state.workouts.push({id:'w2',sessionId:'s2',date,name:'벤치프레스',createdAt:'2026-09-10T11:00:00.000Z'});
  result=Core.derive(state,{today:date});
  assert.equal(result.step,'accumulation','one real planned action is enough to unlock accumulation');
  assert.equal(result.nextAction.action,'review_accumulation');
  assert.equal(result.execution.executed,1);
  assert.equal(result.execution.allExecuted,false,'remaining recovery and nutrition tracks must stay visibly incomplete');
  assert.equal(result.nextPlan.type,'recovery');
  state.analytics.events.push(view('progress'));
  result=Core.derive(state,{today:date});
  assert.equal(result.step,'complete','Golden Path activation can complete after a meaningful post-execution accumulation review');
  assert.equal(result.execution.allExecuted,false);
  console.log('PASS three-track Daily Plan keeps partial completion while Golden Path advances after one real action');
}

{
  const state=base();state.onboarding.complete=true;state.workouts=[{id:'w1',sessionId:'s1',date:'2026-09-09',name:'스쿼트'}];state.analytics.events=[coachAnswered('2026-09-09'),view('progress','2026-09-09')];
  state.planner=[{id:'p1',date:'2026-09-09',type:'workout',title:'어제 계획'}];
  const result=Core.derive(state,{today:date});
  assert.equal(result.step,'complete');
  assert.equal(result.revisitAvailable,true);
  assert.equal(result.progressDate,'2026-09-09');
  console.log('PASS next-day revisit is distinguishable from same-day completion');
}

{
  const state=base();state.onboarding.complete=true;state.analytics.events=[coachAnswered()];
  state.planner=[{id:'p1',date,type:'nutrition',title:'단백질 식단'},{id:'p2',date,type:'recovery',title:'회복 체크'}];
  state.meals=[{id:'m1',date,kcal:2200,protein:120}];state.checkins=[{id:'c1',date,sleep:7}];
  const result=Core.derive(state,{today:date});
  assert.equal(result.execution.executed,2,'nutrition and recovery records must match their own plan domains');
  assert.equal(result.step,'accumulation');
  console.log('PASS plan execution respects record domains');
}

{
  const state=base();state.onboarding.complete=true;state.analytics.events=[{name:'screen_viewed',props:{screen:'progress',date:'2026-09-08'},at:'2026-09-10T00:00:00.000Z'}];
  const before=JSON.stringify(state);const result=Core.derive(state,{today:date});
  assert.equal(result.progressDate,null,'a raw progress view is never accumulation completion by itself');
  assert.equal(result.accumulationEvidence.viewedDate,'2026-09-08');
  assert.equal(JSON.stringify(state),before,'Golden Path derivation must remain read-only');
  console.log('PASS accumulation evidence is deterministic, meaningful, and read-only');
}

console.log('golden-path-v1: PASS');
