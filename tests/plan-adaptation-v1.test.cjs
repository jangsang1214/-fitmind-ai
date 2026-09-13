'use strict';
const assert=require('node:assert/strict');
const Adapt=require('../02_core/plan-adaptation-v1.js');

const base=()=>({meta:{dailyPlanDrafts:{}},profile:{goal:'근육 증가'},onboarding:{weeklyFrequency:4},planner:[],workouts:[],runs:[],meals:[],body:[],dailyCheckins:[],checkins:[],actionLog:[]});
const finalized=(date,rates)=>({date,status:'finalized',result:'partial',outcome:{date,planned:3,executed:0,rate:Math.round((rates.training+rates.recovery+rates.nutrition)/3),domains:{training:{planned:1,executed:rates.training>=80?1:0,rate:rates.training},recovery:{planned:1,executed:rates.recovery>=80?1:0,rate:rates.recovery},nutrition:{planned:1,executed:rates.nutrition>=80?1:0,rate:rates.nutrition}}}});

{
 const state=base();state.meta.dailyPlanDrafts['2026-09-09']=finalized('2026-09-09',{training:0,recovery:100,nutrition:100});
 const before=JSON.stringify(state),result=Adapt.derive(state,{date:'2026-09-10',days:7});
 assert.equal(result.classification,'insufficient_evidence');
 assert.equal(result.domains.training.classification,'insufficient_evidence');
 assert.equal(result.domains.training.scale,1);
 assert.equal(JSON.stringify(state),before,'adaptation derivation must be read-only');
}
{
 const state=base();for(const date of ['2026-09-08','2026-09-09'])state.meta.dailyPlanDrafts[date]=finalized(date,{training:0,recovery:100,nutrition:100});
 const result=Adapt.derive(state,{date:'2026-09-10'}),training=result.domains.training;
 assert.equal(training.classification,'missed');assert.equal(training.cause,'execution_gap');assert.equal(training.averageRate,0);assert.equal(training.scale,.78);assert.ok(training.reasonCodes.includes('ADJUST_TRAINING_SIMPLIFY'));
 assert.equal(result.primaryDomain,'training');assert.equal(result.classification,'missed');
}
{
 const state=base();for(const date of ['2026-09-08','2026-09-09']){state.meta.dailyPlanDrafts[date]=finalized(date,{training:0,recovery:100,nutrition:100});state.dailyCheckins.push({date,sleepHours:5.5,energy:2,stress:4,soreness:{general:5}});}
 const result=Adapt.derive(state,{date:'2026-09-10'}),training=result.domains.training;
 assert.equal(training.executionStatus,'missed');assert.equal(training.classification,'recovery_constrained');assert.equal(training.cause,'recovery_constraint');assert.equal(training.scale,.85,'recovery-constrained misses must simplify without punitive over-reduction');
 assert.ok(training.reasonCodes.includes('RECOVERY_CONSTRAINT_LOW_SLEEP'));assert.ok(training.reasonCodes.includes('RECOVERY_CONSTRAINT_HIGH_SORENESS'));assert.equal(result.classification,'recovery_constrained');
 assert.deepEqual(result.guardrails,{readOnly:true,noSilentMutation:true,requiresConfirmationForConfirmedPlan:true,noAutomaticProgressionIncrease:true,scaleBounds:{min:.75,max:1}});
}
{
 const state=base();state.meta.dailyPlanDrafts['2026-09-08']=finalized('2026-09-08',{training:100,recovery:50,nutrition:20});state.meta.dailyPlanDrafts['2026-09-09']=finalized('2026-09-09',{training:100,recovery:60,nutrition:30});
 const result=Adapt.derive(state,{date:'2026-09-10'});
 assert.equal(result.domains.training.classification,'completed');assert.equal(result.domains.training.scale,1);
 assert.equal(result.domains.recovery.classification,'partial');assert.equal(result.domains.recovery.scale,.9);
 assert.equal(result.domains.nutrition.classification,'missed');assert.equal(result.domains.nutrition.scale,.85);
 assert.equal(result.classification,'missed');
}
{
 const state=base();for(const date of ['2026-09-08','2026-09-09'])state.planner.push({id:`t-${date}`,date,type:'workout',domain:'training',title:'하체',completed:false,status:'confirmed'});
 const result=Adapt.derive(state,{date:'2026-09-10'});
 assert.equal(result.domains.training.sampleDays,2,'legacy confirmed plans must be readable through PlanExecution even without finalized draft metadata');
 assert.equal(result.domains.training.classification,'missed');
}
console.log('plan-adaptation-v1 plan-vs-actual interpretation + bounded adjustment: PASS');
