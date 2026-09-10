'use strict';
const assert=require('node:assert/strict');
const Daily=require('../06_features/ui/runtime/garang-daily-plan-v1.js');
const base=()=>({meta:{},profile:{goal:'근육 증가'},onboarding:{complete:true,goal:'근육 증가',weeklyFrequency:4,availableMinutes:60},preferences:{language:'ko'},planner:[],workouts:[],runs:[],meals:[],body:[],checkins:[],dailyCheckins:[],actionLog:[],memory:{entries:[]}});
{
 const date='2026-09-10',state=base();const report=Daily.ensureDailyDraft(state,{date,decision:{mode:'maintain'},performance:{components:{recovery:{score:82}}}});
 assert.equal(report.created,true);assert.equal(report.group.status,'draft');assert.ok(report.group.items.length>=1&&report.group.items.length<=3);assert.equal(state.planner.length,0,'automatic draft must never silently become a confirmed plan');
 assert.equal(Daily.ensureDailyDraft(state,{date}).created,false,'same-day draft must be idempotent');assert.equal(Object.keys(state.meta.dailyPlanDrafts).length,1);
 const out=Daily.outcome(state,date);assert.equal(out.status,'draft_only');assert.equal(out.kept,false);assert.equal(out.success,false);
}
{
 const date='2026-09-10',state=base();state.planner.push({id:'manual',date,title:'사용자 계획',status:'confirmed',completed:false,source:'user'});const report=Daily.ensureDailyDraft(state,{date});assert.equal(report.created,false);assert.equal(report.reason,'confirmed-plan');assert.equal(state.planner.length,1,'existing user plan must be preserved');
}
{
 const date='2026-09-10',state=base();Daily.ensureDailyDraft(state,{date,decision:{mode:'reduce'},performance:{components:{recovery:{score:54}}}});const group=Daily.readDraft(state,date);group.items[0].title='수정한 하체 40분';group.items[0].time='19:15';const result=Daily.confirmDraft(state,date);assert.equal(result.confirmed,true);assert.ok(state.planner.every(x=>x.origin==='garang-daily-plan'&&x.status==='confirmed'&&x.completed===false));assert.equal(state.planner[0].title,'수정한 하체 40분');assert.equal(state.planner[0].time,'19:15');assert.equal(Daily.readDraft(state,date).status,'confirmed');
 const before=state.planner.length;assert.equal(Daily.confirmDraft(state,date).confirmed,false);assert.equal(state.planner.length,before,'confirm must not duplicate plan rows');
}
{
 const yesterday='2026-09-09',today='2026-09-10',state=base();Daily.ensureDailyDraft(state,{date:yesterday});Daily.dismissDraft(state,yesterday);const events=Daily.finalizePastDrafts(state,today);assert.deepEqual(events,[{date:yesterday,result:'missed',status:'draft_only'}]);const group=Daily.readDraft(state,yesterday);assert.equal(group.result,'missed');assert.equal(group.outcome.kept,false,'ignored draft with no action must be a miss, never a kept day');
}
{
 const date='2026-09-10',state=base();let out=Daily.outcome(state,date);assert.equal(out.status,'no_plan_no_action');assert.equal(out.success,false);state.workouts.push({id:'w',date,name:'스쿼트'});out=Daily.outcome(state,date);assert.equal(out.status,'unplanned_action');assert.equal(out.kept,false,'acting without a confirmed plan is activity, not plan adherence');
}
console.log('daily-plan-v1 goal-model draft + adherence contract: PASS');
