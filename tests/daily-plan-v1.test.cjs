'use strict';
const assert=require('node:assert/strict');
const Daily=require('../06_features/ui/runtime/garang-daily-plan-v1.js');
const base=()=>({meta:{},profile:{goal:'근육 증가'},onboarding:{complete:true,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko'},planner:[],workouts:[],runs:[],meals:[],body:[],checkins:[],dailyCheckins:[],actionLog:[],memory:{entries:[]}});
{
 const date='2026-09-10',state=base();const report=Daily.ensureDailyDraft(state,{date,decision:{mode:'maintain'},performance:{components:{recovery:{score:82}}}});
 assert.equal(report.created,true);assert.equal(report.group.status,'draft');assert.equal(report.group.items.length,3);assert.deepEqual(report.group.items.map(x=>x.domain),['training','recovery','nutrition']);assert.equal(state.planner.length,0,'automatic draft must never silently become a confirmed plan');
 assert.equal(Daily.ensureDailyDraft(state,{date,decision:{mode:'maintain'},performance:{components:{recovery:{score:82}}}}).created,false,'same-day draft must be idempotent');assert.equal(Object.keys(state.meta.dailyPlanDrafts).length,1);
 const out=Daily.outcome(state,date);assert.equal(out.status,'draft_only');assert.equal(out.kept,false);assert.equal(out.success,false);
}
{
 const date='2026-09-10',state=base();state.planner.push({id:'manual',date,title:'사용자 계획',status:'confirmed',completed:false,source:'user'});const report=Daily.ensureDailyDraft(state,{date});assert.equal(report.created,false);assert.equal(report.reason,'confirmed-plan');assert.equal(state.planner.length,1,'existing user plan must be preserved');
}
{
 const date='2026-09-10',state=base();Daily.ensureDailyDraft(state,{date,decision:{mode:'maintain'},performance:{components:{recovery:{score:82}}}});const before=Daily.readDraft(state,date);state.dailyCheckins.push({date,availableMinutes:30,soreness:5,sleepHours:5.5,stress:4,energy:2});const adapted=Daily.ensureDailyDraft(state,{date,decision:{mode:'recover'},performance:{components:{recovery:{score:35}}}});assert.equal(adapted.adapted,true);assert.ok(adapted.group.revision>before.revision);assert.deepEqual(adapted.group.items.map(x=>x.domain),['training','recovery','nutrition']);assert.ok(adapted.group.items.find(x=>x.domain==='training').duration<=30);
 Daily.updateDraft(state,date,adapted.group.items.map(x=>x.domain==='training'?{...x,title:'사용자가 정한 운동 42분',duration:42}:x));const protectedDraft=Daily.ensureDailyDraft(state,{date,decision:{mode:'progress'},performance:{components:{recovery:{score:99}}}});assert.equal(protectedDraft.adapted,false);assert.equal(protectedDraft.reason,'user-edited');assert.equal(protectedDraft.group.items.find(x=>x.domain==='training').title,'사용자가 정한 운동 42분','user edits must never be overwritten by automatic adaptation');
}
{
 const date='2026-09-10',state=base();Daily.ensureDailyDraft(state,{date,decision:{mode:'reduce'},performance:{components:{recovery:{score:54}}}});const group=Daily.readDraft(state,date);group.items[0].title='수정한 하체 40분';group.items[0].time='19:15';const result=Daily.confirmDraft(state,date);assert.equal(result.confirmed,true);assert.equal(state.planner.length,3);assert.deepEqual(state.planner.map(x=>x.domain),['training','recovery','nutrition']);assert.ok(state.planner.every(x=>x.origin==='garang-daily-plan'&&x.status==='confirmed'&&x.completed===false));assert.equal(state.planner[0].title,'수정한 하체 40분');assert.equal(state.planner[0].time,'19:15');assert.equal(Daily.readDraft(state,date).status,'confirmed');
 const before=state.planner.length;assert.equal(Daily.confirmDraft(state,date).confirmed,false);assert.equal(state.planner.length,before,'confirm must not duplicate plan rows');
 const out=Daily.outcome(state,date);assert.equal(out.status,'confirmed_plan');assert.equal(out.kept,false);assert.equal(out.domains.training.planned,1);assert.equal(out.domains.recovery.planned,1);assert.equal(out.domains.nutrition.planned,1);
}
{
 const yesterday='2026-09-09',today='2026-09-10',state=base();Daily.ensureDailyDraft(state,{date:yesterday});Daily.dismissDraft(state,yesterday);const events=Daily.finalizePastDrafts(state,today);assert.equal(events.length,1);assert.equal(events[0].date,yesterday);assert.equal(events[0].result,'missed');assert.equal(events[0].status,'draft_only');assert.deepEqual(events[0].domains,{training:{planned:0,executed:0,rate:null},recovery:{planned:0,executed:0,rate:null},nutrition:{planned:0,executed:0,rate:null}});const group=Daily.readDraft(state,yesterday);assert.equal(group.result,'missed');assert.equal(group.outcome.kept,false,'ignored draft with no action must be a miss, never a kept day');
}
{
 const date='2026-09-10',state=base();let out=Daily.outcome(state,date);assert.equal(out.status,'no_plan_no_action');assert.equal(out.success,false);state.workouts.push({id:'w',date,name:'스쿼트'});out=Daily.outcome(state,date);assert.equal(out.status,'unplanned_action');assert.equal(out.kept,false,'acting without a confirmed plan is activity, not plan adherence');
}
console.log('daily-plan-v1 three-track adaptive goal-model + adherence contract: PASS');