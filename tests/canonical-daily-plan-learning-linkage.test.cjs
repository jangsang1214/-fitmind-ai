'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'../06_features/ui/runtime/garang-canonical-daily-plan-v1.js'),'utf8');
const date='2026-09-16',events=[],writes=[];
const state={planner:[],actionLog:[],meta:{dailyPlanDrafts:{[date]:{status:'draft',revision:1,items:[
  {id:'gdp-training',domain:'training',type:'workout',title:'Reduced load',order:1},
  {id:'gdp-recovery',domain:'recovery',type:'recovery',title:'Recovery',order:2},
  {id:'gdp-nutrition',domain:'nutrition',type:'nutrition',title:'Protein',order:3}
]}}}};
let uuid=0;
const Daily={
  localDate:()=>date,
  readDraft:(s,d)=>s.meta.dailyPlanDrafts[d]||null,
  ensureDailyDraft:(s,{date:d})=>({created:false,adapted:false,group:s.meta.dailyPlanDrafts[d]}),
  updateDraft:(s,d,items)=>{s.meta.dailyPlanDrafts[d].items=items;return s.meta.dailyPlanDrafts[d];},
  confirmDraft:(s,d)=>{
    const group=s.meta.dailyPlanDrafts[d],rows=group.items.map((item,index)=>({id:`plan-${index+1}`,date:d,domain:item.domain,type:item.type,title:item.title,status:'confirmed',origin:'garang-daily-plan'}));
    s.planner.push(...rows);group.status='confirmed';group.confirmedAt='2026-09-16T09:00:00.000Z';return {confirmed:true,reason:'confirmed',rows};
  }
};
const bridge={ready:()=>true,getStorageKey:()=> 'garang_user_test_v3',getLiveState:()=>state,getState:()=>state,applyWrite:()=>null};
const document={addEventListener:()=>{},getElementById:()=>null};
const localStorage={setItem:(key,value)=>writes.push({key,value})};
class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
const sandbox={console,JSON,Date,Math,setTimeout:()=>1,clearTimeout:()=>{},CustomEvent,document,localStorage,crypto:{randomUUID:()=>`uuid-${++uuid}`}};
sandbox.window=sandbox;sandbox.globalThis=sandbox;sandbox.GarangDailyPlanV1=Daily;sandbox.GarangAgentStateBridge=bridge;sandbox.GarangAgentContractV2={CONFIRMATION_SCOPE_KEY:'__GARANG_AGENT_CONFIRMED_WRITE_V2__'};sandbox.dispatchEvent=event=>events.push(event);
vm.runInNewContext(source,sandbox,{filename:'garang-canonical-daily-plan-v1.js'});

const result=sandbox.GarangCanonicalDailyPlanV1.confirmToday({date,source:'coach',proposalArgs:{decisionId:'decision-1',decisionMode:'reduce',recommendationId:'recommendation-1',recommendationRevision:2,recommendationSource:'openai',recommendationReason:'LOW_RECOVERY'}});
assert.equal(result.confirmed,true);assert.ok(result.actionId);assert.equal(state.planner.length,3);
for(const row of state.planner){assert.equal(row.decisionId,'decision-1');assert.equal(row.decisionMode,'reduce');assert.equal(row.recommendationId,'recommendation-1');assert.equal(row.recommendationRevision,2);}
const action=state.actionLog.at(-1);assert.equal(action.id,result.actionId);assert.equal(action.action,'daily_plan_draft_confirmed');assert.equal(action.args.decisionId,'decision-1');assert.equal(action.args.decisionMode,'reduce');assert.equal(action.args.recommendationId,'recommendation-1');assert.deepEqual(Array.from(action.args.planIds),['plan-1','plan-2','plan-3']);
assert.ok(writes.length>=1);assert.ok(events.some(event=>event.type==='garang:agent-write'&&event.detail.actionId===result.actionId));assert.ok(events.some(event=>event.type==='garang:state-updated'&&event.detail.actionId===result.actionId));
assert.equal(state.meta.dailyPlanDrafts[date].decisionId,'decision-1');assert.equal(state.meta.dailyPlanDrafts[date].recommendationId,'recommendation-1');
console.log('PASS canonical-daily-plan-learning-linkage');
