(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangIntelligenceLearningContractV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const CONTRACT_VERSION='intelligence-learning-contract-v1.0.0';
const EDGE_TYPES=Object.freeze(['decision_recommendation','recommendation_action','action_plan','plan_execution','execution_outcome']);
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const list=value=>Array.isArray(value)?value:[];
const clean=value=>String(value??'').trim();
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const dateKey=value=>String(value||'').slice(0,10);
const todayLocal=now=>{const d=now instanceof Date?now:new Date(now||Date.now());return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function hash(value){let h=2166136261;const text=String(value||'');for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function stableId(prefix,parts){const values=list(parts).map(value=>clean(value)).filter(Boolean);return values.length?`${prefix}_${hash(values.join('|'))}`:null;}
function sameDate(row,date){return dateKey(row?.date||row?.day||row?.performedAt||row?.createdAt||row?.at)===date;}
function actionForPlan(state,plan,date){
  const planId=clean(plan?.id),recommendationId=clean(plan?.recommendationId),rows=list(state?.actionLog).filter(row=>sameDate(row,date)||dateKey(row?.args?.date)===date).slice().reverse();
  return rows.find(row=>{
    const ids=list(row?.args?.planIds).map(String),rid=clean(row?.args?.recommendationId);
    return (planId&&ids.includes(planId))||(recommendationId&&rid===recommendationId);
  })||null;
}
function executionItemForPlan(day,plan,index){
  const items=list(day?.plan?.items),planId=clean(plan?.id);
  return items.find(item=>clean(item?.id||item?.planId)===planId)||items[index]||null;
}
function outcomeFor(item,date,now){
  if(!item)return {classification:date<todayLocal(now)?'missed':'pending',score:null};
  const score=finite(item?.executionScore);
  if(score!==null&&score>=80)return {classification:'completed',score};
  if(score!==null&&score>=40)return {classification:'partial',score};
  if(item?.executed===true)return {classification:'completed',score:score??100};
  if(date<todayLocal(now))return {classification:'missed',score:score??0};
  return {classification:'pending',score:score??null};
}
function cycleFor(state,plan,index,day,date,now){
  const action=actionForPlan(state,plan,date),execution=executionItemForPlan(day,plan,index),sourceRecordIds=list(execution?.sourceRecordIds).map(String).filter(Boolean),evidence=clean(execution?.evidence),evidenceAt=clean(execution?.evidenceAt),outcome=outcomeFor(execution,date,now);
  const decisionId=clean(plan?.decisionId||action?.args?.decisionId)||null,recommendationId=clean(plan?.recommendationId||action?.args?.recommendationId)||null,planId=clean(plan?.id)||null,actionId=clean(action?.id)||null;
  const hasExecutionEvidence=!!(execution&&(execution?.executed===true||(finite(execution?.executionScore)!==null&&finite(execution?.executionScore)>0)||(evidence&&evidence!=='NONE')||sourceRecordIds.length>0)),finalizedMissed=outcome.classification==='missed';
  const executionStatus=hasExecutionEvidence?'observed':finalizedMissed?'not_observed_finalized':'not_observed';
  const executionId=(hasExecutionEvidence||finalizedMissed)?stableId('execution',[planId,hasExecutionEvidence?(evidence||'OBSERVED'):'NO_EXECUTION_OBSERVED',...sourceRecordIds,evidenceAt||date]):null;
  const outcomeId=outcome.classification!=='pending'?stableId('outcome',[planId,executionId||'no_execution',outcome.classification,date]):null;
  const cycle={contractVersion:CONTRACT_VERSION,date,decisionId,recommendationId,actionId,planId,executionId,outcomeId,decisionMode:clean(plan?.decisionMode||action?.args?.decisionMode)||null,recommendationRevision:finite(plan?.recommendationRevision??action?.args?.recommendationRevision),execution:{status:executionStatus,score:finite(execution?.executionScore),evidence:evidence||null,evidenceAt:evidenceAt||null,sourceRecordIds},outcome,guardrails:{readOnly:true,noSilentMutation:true,noAutomaticProgressionIncrease:true}};
  cycle.attribution={decisionToRecommendation:!!(decisionId&&recommendationId),recommendationToAction:!!(recommendationId&&actionId),actionToPlan:!!(actionId&&planId),planToExecution:!!(planId&&executionId),executionToOutcome:!!(executionId&&outcomeId),complete:!!(decisionId&&recommendationId&&actionId&&planId&&executionId&&outcomeId)};
  return cycle;
}
function edgesForCycle(cycle){
  const edges=[];
  const add=(type,from,to)=>{if(from&&to)edges.push({type,from,to});};
  add('decision_recommendation',cycle.decisionId,cycle.recommendationId);
  add('recommendation_action',cycle.recommendationId,cycle.actionId);
  add('action_plan',cycle.actionId,cycle.planId);
  add('plan_execution',cycle.planId,cycle.executionId);
  add('execution_outcome',cycle.executionId,cycle.outcomeId);
  return edges;
}
function buildDayGraph(stateInput,dateInput,{planExecution=null,now=new Date()}={}){
  const state=object(stateInput)?stateInput:{},date=dateKey(dateInput||todayLocal(now)),plans=list(state?.planner).filter(row=>sameDate(row,date));
  let day=null;try{if(planExecution&&typeof planExecution.daily==='function')day=planExecution.daily(state,date);}catch{day=null;}
  const cycles=plans.map((plan,index)=>cycleFor(state,plan,index,day,date,now)),edges=cycles.flatMap(edgesForCycle);
  return {contractVersion:CONTRACT_VERSION,date,cycles,edges,summary:{plans:cycles.length,fullyAttributed:cycles.filter(row=>row.attribution.complete).length,withRecommendation:cycles.filter(row=>row.recommendationId).length,withExecution:cycles.filter(row=>row.executionId).length,withOutcome:cycles.filter(row=>row.outcomeId).length},guardrails:{readOnly:true,noStateMutation:true,noRawChatRequired:true}};
}
function buildGraph(stateInput,{planExecution=null,now=new Date(),days=28}={}){
  const state=object(stateInput)?stateInput:{},limit=Math.max(1,Math.min(56,Number(days)||28)),end=todayLocal(now),endDate=new Date(`${end}T12:00:00`),startDate=new Date(endDate);startDate.setDate(startDate.getDate()-(limit-1));const start=todayLocal(startDate),dates=[...new Set(list(state?.planner).map(row=>dateKey(row?.date)).filter(Boolean))].sort().filter(date=>date>=start&&date<=end),dayGraphs=dates.map(date=>buildDayGraph(state,date,{planExecution,now})),cycles=dayGraphs.flatMap(row=>row.cycles),edges=dayGraphs.flatMap(row=>row.edges);
  return {contractVersion:CONTRACT_VERSION,asOf:end,days:dayGraphs,cycles,edges,summary:{days:dayGraphs.length,plans:cycles.length,fullyAttributed:cycles.filter(row=>row.attribution.complete).length,withRecommendation:cycles.filter(row=>row.recommendationId).length,withExecution:cycles.filter(row=>row.executionId).length,withOutcome:cycles.filter(row=>row.outcomeId).length},guardrails:{readOnly:true,noStateMutation:true,noRawChatRequired:true}};
}
function validateCycle(value){
  if(!object(value))return {valid:false,reasons:['CYCLE_REQUIRED']};
  const reasons=[];for(const key of ['decisionId','recommendationId','actionId','planId'])if(!clean(value[key]))reasons.push(`MISSING_${key.replace(/[A-Z]/g,m=>`_${m}`).toUpperCase()}`);
  if(value.outcomeId&&!value.executionId)reasons.push('OUTCOME_WITHOUT_EXECUTION');
  return {valid:reasons.length===0,reasons};
}

return Object.freeze({CONTRACT_VERSION,EDGE_TYPES,stableId,buildDayGraph,buildGraph,validateCycle});
});
