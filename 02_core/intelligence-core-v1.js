(function(root,factory){
 const deps=typeof module==='object'&&module.exports?{
  Memory:require('./memory-intelligence-v1.js'),
  State:require('./state-intelligence-v1.js'),
  Decision:require('./decision-intelligence-v1.js'),
  Score:require('./performance-score-v1.js'),
  Planner:require('./adaptive-planner-v1.js')
 }:{Memory:root.GarangMemoryIntelligence,State:root.GarangStateIntelligence,Decision:root.GarangDecisionIntelligence,Score:root.GarangPerformanceScore,Planner:root.GarangAdaptivePlanner};
 const api=factory(deps);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.GarangIntelligenceCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function({Memory,State,Decision,Score,Planner}){
'use strict';

const ENGINE_VERSION='garang-intelligence-core-v1';
const PIPELINE=Object.freeze(['rawData','userState','analysis','decision','recommendation','action']);
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const rows=v=>Array.isArray(v)?v:[];
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const asDate=now=>{const d=now instanceof Date?now:new Date(now||Date.now());return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function assertDependencies(){const missing=[];for(const [name,value] of Object.entries({Memory,State,Decision,Score,Planner}))if(!value)missing.push(name);if(missing.length)throw new Error(`INTELLIGENCE_DEPENDENCY_MISSING:${missing.join(',')}`);}
function rawSummary(state){return {workouts:rows(state.workouts).length,meals:rows(state.meals).length,runs:rows(state.runs).length,body:rows(state.body).length,planner:rows(state.planner).length,dailyCheckins:rows(state.dailyCheckins||state.checkins).length,memoryEntries:rows(state.memory?.entries).length,goal:String(state?.profile?.goal||state?.userModel?.goal||state?.onboarding?.goal||'')};}
function prepareMemory(state,{query='',now=new Date(),ownerUid=null,limit=24,budgetChars=6000}={}){return Memory.prepareMemoryContext(state.memory||{},state,{query,now,ownerUid,limit,budgetChars});}
function run(stateInput,{query='',now=new Date(),ownerUid=null,memoryLimit=24,memoryBudgetChars=6000}={}){
 assertDependencies();const state=object(stateInput)?stateInput:{},memory=prepareMemory(state,{query,now,ownerUid,limit:memoryLimit,budgetChars:memoryBudgetChars}),userState=State.estimateState(state,{now}),performance=Score.compute(state,{now,userState}),decision=Decision.decide(userState,{now,memoryContext:memory}),planner=Planner.adaptWeek(state,{now,userState,decision,score:performance,memoryContext:memory}),recommendation={engineVersion:Planner.ENGINE_VERSION,summary:{mode:planner.mode,today:planner.today,supportActions:planner.supportActions},week:planner.week,changes:planner.changes,guardrails:planner.guardrails},action=planner.actionProposal||decision?.actionProposal||null;
 return {engineVersion:ENGINE_VERSION,pipeline:PIPELINE,asOf:asDate(now),rawData:rawSummary(state),memory,userState,analysis:{performanceScore:performance},decision,recommendation,action,guardrails:{requiresConfirmation:action?.requiresConfirmation!==false,noSilentMutation:true,missingDataReducesConfidence:true,painCautionBlocksIntensity:true,llmIsExplanationLayer:true},diagnostics:{memory:Memory.diagnostics?Memory.diagnostics(state.memory?.entries||[],{now,deletedIds:state.memory?.deletedIds||[],ownerUid}):null,state:State.diagnostics?State.diagnostics(state,{now}):null,score:Score.diagnostics?Score.diagnostics(state,{now}):null,planner:Planner.diagnostics?Planner.diagnostics(state,{now,userState,decision,score:performance,memoryContext:memory}):null}};
}
function compactForContext(result){if(!object(result))return null;return {engineVersion:result.engineVersion,pipeline:result.pipeline,asOf:result.asOf,memory:{entries:rows(result.memory?.entries).slice(0,12),meta:result.memory?.meta||null},userState:State.compactForContext?State.compactForContext(result.userState):result.userState,analysis:{performanceScore:Score.compactForContext?Score.compactForContext(result.analysis?.performanceScore):result.analysis?.performanceScore},decision:Decision.compactForContext?Decision.compactForContext(result.decision):result.decision,recommendation:Planner.compactForContext?Planner.compactForContext({...result.recommendation,engineVersion:result.recommendation?.engineVersion,asOf:result.asOf,mode:result.recommendation?.summary?.mode,confidence:result.recommendation?.summary?.today?.confidence,today:result.recommendation?.summary?.today,supportActions:result.recommendation?.summary?.supportActions,actionProposal:result.action,guardrails:result.recommendation?.guardrails}):result.recommendation,action:result.action,guardrails:result.guardrails};}
function diagnostics(stateInput,options={}){const result=run(stateInput,options);return {engineVersion:ENGINE_VERSION,asOf:result.asOf,pipeline:PIPELINE,rawData:result.rawData,stateConfidence:result.userState?.confidence??null,performanceScore:result.analysis?.performanceScore?.score??null,performanceConfidence:result.analysis?.performanceScore?.confidence??null,decisionMode:result.decision?.mode??null,plannerMode:result.recommendation?.summary?.mode??null,hasAction:!!result.action,guardrails:result.guardrails};}
return Object.freeze({ENGINE_VERSION,PIPELINE,run,prepareMemory,compactForContext,diagnostics,clone});
});