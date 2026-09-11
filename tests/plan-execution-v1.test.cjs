'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Core=require('../02_core/plan-execution-v1.js');
const Goal=require('../02_core/goal-alignment-v1.js');
const Loop=require('../06_features/ui/runtime/garang-core-loop-v1.js');
const appSource=fs.readFileSync(path.join(__dirname,'../01_app/app.js'),'utf8');

const tests=[];
function test(name,fn){fn();tests.push(name);console.log(`PASS ${name}`);}
const base=()=>({
  profile:{age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},
  onboarding:{goal:'근육 증가'},
  planner:[],workouts:[],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],actionLog:[]
});

test('goal-aware calorie target changes without mutating source',()=>{
  const muscle=base(),before=JSON.stringify(muscle);const m=Core.estimateTargets(muscle,'2026-09-08');
  muscle.profile.goal='체지방 감소';muscle.onboarding.goal='체지방 감소';const cut=Core.estimateTargets(muscle,'2026-09-08');assert.ok(m.calorieTarget>cut.calorieTarget);
  muscle.profile.goal='퍼포먼스 향상';muscle.onboarding.goal='퍼포먼스 향상';const performance=Core.estimateTargets(muscle,'2026-09-08');assert.ok(performance.calorieTarget>cut.calorieTarget);
  assert.equal(JSON.parse(before).profile.goal,'근육 증가');
});

test('missing adult profile data never fabricates a calorie target',()=>{const s=base();s.profile={weight:70,goal:'근육 증가'};const t=Core.estimateTargets(s,'2026-09-08');assert.equal(t.calorieTarget,null);assert.ok(t.reasons.includes('MISSING_HEIGHT'));assert.ok(t.reasons.includes('MISSING_AGE'));});
test('minor profile does not receive an adult calorie target',()=>{const s=base();s.profile.age=17;const t=Core.estimateTargets(s,'2026-09-08');assert.equal(t.calorieTarget,null);assert.ok(t.reasons.includes('AGE_REQUIRES_CLINICAL_TARGET'));});

test('explicit completion and actual records both count as execution',()=>{
  const s=base();s.planner=[{id:'p1',date:'2026-09-08',time:'10:00',type:'nutrition',title:'칼로리 목표',completed:true},{id:'p2',date:'2026-09-08',time:'18:00',type:'workout',title:'상체 운동',completed:false}];
  s.workouts=[{id:'w1',sessionId:'s1',date:'2026-09-08',name:'Bench',volume:3000}];s.meals=[{id:'m1',date:'2026-09-08',kcal:2200,protein:140}];
  const d=Core.daily(s,'2026-09-08');assert.equal(d.plan.planned,2);assert.equal(d.plan.executed,2);assert.equal(d.plan.rate,100);assert.equal(d.plan.explicitCompleted,1);assert.equal(d.plan.derivedCompleted,1);assert.equal(d.plan.items[1].evidence,'ACTUAL_RECORD_MATCH');assert.equal(d.plan.domains.training.rate,100);
});

test('workout execution evidence honors per-set volume instead of a stale aggregate',()=>{const s=base();s.planner=[{id:'p1',date:'2026-09-08',type:'workout',title:'Mixed load'}];s.workouts=[{id:'w1',sessionId:'s1',date:'2026-09-08',name:'Bench',sets:3,reps:8,weight:60,volume:9999,setDetails:[{set:1,weight:40,reps:10},{set:2,weight:60,reps:8},{set:3,weight:80,reps:6}]}];const day=Core.daily(s,'2026-09-08');assert.equal(Core.workoutVolume(s.workouts[0]),1360);assert.equal(day.evidence.workout.volume,1360);assert.equal(day.plan.executed,1);});

test('one workout session cannot satisfy two uncompleted workout plans',()=>{const s=base();s.planner=[{id:'p1',date:'2026-09-08',time:'09:00',type:'workout',title:'AM lift'},{id:'p2',date:'2026-09-08',time:'18:00',type:'workout',title:'PM lift'}];s.workouts=[{id:'w1',sessionId:'same',date:'2026-09-08',name:'Squat'},{id:'w2',sessionId:'same',date:'2026-09-08',name:'Leg press'}];const d=Core.daily(s,'2026-09-08');assert.equal(d.evidence.workout.sessions,1);assert.equal(d.plan.executed,1);assert.equal(d.plan.rate,50);});

test('future records do not leak into a historical daily execution result',()=>{const s=base();s.planner=[{id:'p1',date:'2026-09-08',type:'workout',title:'Lift'}];s.workouts=[{id:'future',sessionId:'future',date:'2026-09-09',name:'Deadlift'}];const d=Core.daily(s,'2026-09-08');assert.equal(d.evidence.workout.sessions,0);assert.equal(d.plan.executed,0);});

test('record before confirmation cannot execute a newly confirmed plan',()=>{
  const s=base();s.planner=[{id:'p1',date:'2026-09-08',type:'workout',domain:'training',title:'Lift',confirmedAt:'2026-09-08T10:00:00.000Z'}];s.workouts=[{id:'w-before',sessionId:'s-before',date:'2026-09-08',name:'Lift',createdAt:'2026-09-08T09:00:00.000Z'}];
  const d=Core.daily(s,'2026-09-08');assert.equal(d.plan.executed,0);assert.equal(d.plan.items[0].evidence,'NONE');assert.equal(d.plan.domains.training.rate,0);
});

test('record after confirmation carries traceable evidence ids',()=>{
  const s=base();s.planner=[{id:'p1',date:'2026-09-08',type:'workout',domain:'training',title:'Lift',confirmedAt:'2026-09-08T10:00:00.000Z'}];s.workouts=[{id:'w-after',sessionId:'s-after',date:'2026-09-08',name:'Lift',createdAt:'2026-09-08T11:00:00.000Z'}];
  const item=Core.daily(s,'2026-09-08').plan.items[0];assert.equal(item.executionScore,100);assert.deepEqual(item.sourceRecordIds,['w-after']);assert.equal(item.evidenceAt,'2026-09-08T11:00:00.000Z');
});

test('nutrition domain requires accumulated evidence instead of one meal blindly',()=>{
  const s=base(),target=Core.estimateTargets(s,'2026-09-08');s.planner=[{id:'pn',date:'2026-09-08',type:'nutrition',domain:'nutrition',title:'단백질 포함 3끼',confirmedAt:'2026-09-08T07:00:00.000Z'}];
  s.meals=[{id:'m1',date:'2026-09-08',kcal:500,protein:25,createdAt:'2026-09-08T08:00:00.000Z'}];let day=Core.daily(s,'2026-09-08');assert.ok(day.plan.domains.nutrition.rate<80);assert.equal(day.plan.items[0].derivedCompleted,false);
  s.meals.push({id:'m2',date:'2026-09-08',kcal:900,protein:45,createdAt:'2026-09-08T13:00:00.000Z'},{id:'m3',date:'2026-09-08',kcal:target.calorieTarget-1400,protein:target.proteinTarget-70,createdAt:'2026-09-08T19:00:00.000Z'});day=Core.daily(s,'2026-09-08');assert.ok(day.plan.domains.nutrition.rate>=80);assert.equal(day.plan.items[0].derivedCompleted,true);assert.equal(day.plan.items[0].evidence,'NUTRITION_TARGET_MATCH');
});

test('morning check-in is not automatic recovery completion',()=>{
  const s=base();s.planner=[{id:'pr',date:'2026-09-08',type:'recovery',domain:'recovery',title:'호흡 · 이완 루틴 15분',confirmedAt:'2026-09-08T08:00:00.000Z'}];s.checkins=[{id:'c1',date:'2026-09-08',sleep:7.5,energy:4,createdAt:'2026-09-08T07:30:00.000Z'}];const day=Core.daily(s,'2026-09-08');assert.equal(day.plan.domains.recovery.rate,0);assert.equal(day.plan.items[0].executed,false);
});

test('explicit recovery action log can verify recovery execution',()=>{
  const s=base();s.planner=[{id:'pr',date:'2026-09-08',type:'recovery',domain:'recovery',title:'호흡 · 이완 루틴 15분',confirmedAt:'2026-09-08T08:00:00.000Z'}];s.actionLog=[{id:'r1',action:'recovery_completed',args:{date:'2026-09-08'},at:'2026-09-08T21:30:00.000Z'}];const item=Core.daily(s,'2026-09-08').plan.items[0];assert.equal(item.executed,true);assert.equal(item.evidence,'RECOVERY_ACTION_MATCH');assert.deepEqual(item.sourceRecordIds,['r1']);
});

test('next-day sleep is partial recovery outcome evidence, not a fake full completion',()=>{
  const s=base();s.planner=[{id:'pr',date:'2026-09-08',type:'recovery',domain:'recovery',title:'수면 7.5시간 확보 + 가벼운 스트레칭',confirmedAt:'2026-09-08T08:00:00.000Z'}];s.checkins=[{id:'next',date:'2026-09-09',sleep:7.2,createdAt:'2026-09-09T07:00:00.000Z'}];const item=Core.daily(s,'2026-09-08').plan.items[0];assert.equal(item.executionScore,75);assert.equal(item.executed,false);assert.equal(item.evidence,'RECOVERY_SLEEP_OUTCOME');
});

test('goal-aware nutrition adequacy distinguishes insufficient and on target intake',()=>{const s=base();const target=Core.estimateTargets(s,'2026-09-08').calorieTarget;s.meals=[{id:'m1',date:'2026-09-08',kcal:Math.round(target*.7),protein:60}];assert.equal(Core.daily(s,'2026-09-08').nutrition.calories.status,'insufficient');s.meals=[{id:'m2',date:'2026-09-08',kcal:target,protein:112}];assert.equal(Core.daily(s,'2026-09-08').nutrition.calories.status,'on_target');});

test('nutrition keeps missing values separate from an observed zero',()=>{const s=base();const empty=Core.daily(s,'2026-09-08');assert.equal(empty.nutrition.calories.actual,0);assert.equal(empty.nutrition.calories.percent,null);assert.equal(empty.nutrition.calories.hasEvidence,false);assert.equal(empty.nutrition.protein.percent,null);assert.equal(empty.goalAlignment,null);s.meals=[{id:'m-zero',date:'2026-09-08',kcal:0,protein:0}];const zero=Core.daily(s,'2026-09-08');assert.equal(zero.nutrition.calories.actual,0);assert.equal(zero.nutrition.calories.percent,0);assert.equal(zero.nutrition.calories.hasEvidence,true);assert.equal(zero.nutrition.protein.actual,0);assert.equal(zero.nutrition.protein.percent,0);assert.equal(zero.nutrition.protein.hasEvidence,true);assert.equal(zero.goalAlignment,0);});

test('seven-day range reports execution, nutrition hits and streak',()=>{const s=base();for(let i=0;i<3;i++){const date=`2026-09-0${6+i}`;s.planner.push({id:`p${i}`,date,type:'workout',title:'Workout',completed:true});s.workouts.push({id:`w${i}`,sessionId:`s${i}`,date,name:'Lift'});const target=Core.estimateTargets(s,date).calorieTarget;s.meals.push({id:`m${i}`,date,kcal:target,protein:112});}const r=Core.range(s,{endDate:'2026-09-08',days:7});assert.equal(r.planned,3);assert.equal(r.executed,3);assert.equal(r.executionRate,100);assert.equal(r.domainScores.training,100);assert.equal(r.calorieOnTargetDays,3);assert.equal(r.proteinOnTargetDays,3);assert.equal(r.currentExecutionStreak,3);});

test('recording streak is separate from plan execution streak',()=>{const s=base();s.planner=[{id:'p1',date:'2026-09-08',type:'workout',title:'Lift',completed:false}];s.meals=[{id:'m1',date:'2026-09-06',kcal:0,protein:0},{id:'m2',date:'2026-09-07',kcal:0,protein:0},{id:'m3',date:'2026-09-08',kcal:0,protein:0}];const r=Core.range(s,{endDate:'2026-09-08',days:3});assert.equal(r.executionRate,0);assert.equal(r.currentExecutionStreak,0);assert.equal(r.recordDays,3);assert.equal(r.recordStreak,3);});

test('core never mutates source state',()=>{const s=base();s.planner=[{id:'p1',date:'2026-09-08',type:'workout',title:'Lift'}];s.workouts=[{id:'w1',sessionId:'s1',date:'2026-09-08',name:'Lift'}];const before=JSON.stringify(s);Core.daily(s,'2026-09-08');Core.range(s,{endDate:'2026-09-08'});Core.accumulation(s,{endDate:'2026-09-08'});assert.equal(JSON.stringify(s),before);});

test('goal alignment is domain-based and does not invent scores from empty data',()=>{const s=base();const empty=Goal.summarize(s,{days:30,endDate:'2026-09-08'});assert.equal(empty.overall,null);assert.ok(empty.domains.every(x=>x.score===null));s.workouts=[{id:'w1',date:'2026-09-08',sessionId:'s1',name:'Lift'}];s.meals=[{id:'m1',date:'2026-09-08',protein:120,kcal:2300}];const measured=Goal.summarize(s,{days:30,endDate:'2026-09-08'});assert.equal(measured.status,'measured');assert.ok(measured.domains.find(x=>x.id==='training').score!==null);assert.equal(measured.domains.find(x=>x.id==='recovery').score,null);});
test('goal alignment treats zero as measured and exposes missing domains',()=>{const s=base();s.meals=[{id:'m-zero',date:'2026-09-08',protein:0,kcal:0}];const result=Goal.summarize(s,{days:30,endDate:'2026-09-08'}),nutrition=result.domains.find(x=>x.id==='nutrition');assert.equal(nutrition.score,0);assert.equal(nutrition.status,'measured');assert.ok(result.missingDomains.includes('recovery'));assert.ok(result.missingDomains.includes('body'));assert.equal(result.measuredDomainCount,1);assert.equal(result.overall,null);});
test('goal alignment scales training expectation to the selected period',()=>{const s=base();s.onboarding.weeklyFrequency=4;s.workouts=[{id:'w1',date:'2026-09-08',sessionId:'s1',name:'Lift'}];const result=Goal.summarize(s,{days:30,endDate:'2026-09-08'});assert.equal(result.domains.find(x=>x.id==='training').score,6);});
test('planner completion alone never creates a recording streak',()=>{const s=base();s.planner=[{id:'p1',date:'2026-09-08',type:'workout',title:'Lift',completed:true},{id:'p2',date:'2026-09-07',type:'workout',title:'Lift',completed:true}];const result=Loop.deriveAccumulation(s,{endDate:'2026-09-08',days:30});assert.equal(result.streak,0);assert.equal(result.hasRecords,false);assert.match(result.headline,/첫 기록|one record/i);});
test('workout entry preserves per-set details while keeping legacy aggregates',()=>{assert.ok(appSource.includes('workoutSetDetailsOpen'));assert.ok(appSource.includes('data-set-weight')&&appSource.includes('data-set-reps')&&appSource.includes('data-set-rpe'));assert.ok(appSource.includes('setDetails:details'));assert.ok(appSource.includes('details.reduce((sum,row)=>sum+(row.reps*row.weight),0)'));assert.ok(appSource.includes('details.map(row=>calcEstimated1RM(row.weight,row.reps))'));assert.ok(appSource.includes('goalLabel:currentGoalLabel()'));});
console.log(`${tests.length} plan execution tests passed`);
