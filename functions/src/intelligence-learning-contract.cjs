'use strict';

const CONTRACT_VERSION='intelligence-learning-contract-v1.0.0';
const EDGE_TYPES=Object.freeze(['decision_recommendation','recommendation_action','action_plan','plan_execution','execution_outcome']);
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const list=value=>Array.isArray(value)?value.filter(object):[];
const clean=value=>String(value??'').trim();
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const dateKey=value=>String(value||'').slice(0,10);
function hash(value){let h=2166136261;const text=String(value||'');for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function stableId(prefix,parts){const values=(Array.isArray(parts)?parts:[]).map(value=>clean(value)).filter(Boolean);return values.length?`${prefix}_${hash(values.join('|'))}`:null;}
function sameDate(row,date){return dateKey(row?.date||row?.day||row?.performedAt||row?.createdAt||row?.at)===date;}
function inferDomain(plan){const explicit=clean(plan?.domain).toLowerCase();if(['training','recovery','nutrition'].includes(explicit))return explicit;const type=clean(plan?.type||plan?.category).toLowerCase();if(/meal|nutrition|food|식단|영양/.test(type))return 'nutrition';if(/recover|recovery|sleep|회복|수면/.test(type))return 'recovery';return 'training';}
function actionForPlan(state,plan,date){
 const planId=clean(plan?.id),recommendationId=clean(plan?.recommendationId),rows=list(state?.actionLog).filter(row=>sameDate(row,date)||dateKey(row?.args?.date)===date).slice().reverse();
 return rows.find(row=>{const ids=Array.isArray(row?.args?.planIds)?row.args.planIds.map(String):[],rid=clean(row?.recommendationId||row?.args?.recommendationId),targetId=clean(row?.targetId);return (planId&&(ids.includes(planId)||targetId===planId))||(recommendationId&&rid===recommendationId);})||null;
}
function groupFor(state,date){const group=object(state?.meta?.dailyPlanDrafts?.[date])?state.meta.dailyPlanDrafts[date]:null;return group&&String(group.status||'')==='finalized'?group:null;}
function outcomeForPlan(group,plan){
 if(!group)return null;const domain=inferDomain(plan),domainRow=object(group?.outcome?.domains?.[domain])?group.outcome.domains[domain]:{},rate=finite(domainRow.rate),explicit=clean(group.result||group?.outcome?.status).toLowerCase();let classification=null;
 if(rate!==null)classification=rate>=80?'completed':rate>=40?'partial':'missed';
 else if(['completed','kept','executed_plan'].includes(explicit))classification='completed';
 else if(['partial','partial_execution'].includes(explicit))classification='partial';
 else if(['missed','confirmed_plan','no_plan_no_action'].includes(explicit))classification='missed';
 if(!classification)return null;
 return {classification,rate,domain,finalizedAt:clean(group.finalizedAt)||null,evidenceStatus:clean(group?.outcome?.status)||null};
}
function cycleFor(state,plan,date){
 const action=actionForPlan(state,plan,date),group=groupFor(state,date),outcome=outcomeForPlan(group,plan),decisionId=clean(plan?.decisionId||action?.args?.decisionId)||null,recommendationId=clean(plan?.recommendationId||action?.args?.recommendationId)||null,actionId=clean(action?.id)||null,planId=clean(plan?.id)||null;
 const executionId=outcome?stableId('execution',[planId,outcome.domain,String(outcome.rate??''),outcome.finalizedAt||date]):null,outcomeId=outcome?stableId('outcome',[planId,executionId||'no_execution',outcome.classification,date]):null;
 const attribution={decisionToRecommendation:!!(decisionId&&recommendationId),recommendationToAction:!!(recommendationId&&actionId),actionToPlan:!!(actionId&&planId),planToExecution:!!(planId&&executionId),executionToOutcome:!!(executionId&&outcomeId)};attribution.complete=Object.values(attribution).every(Boolean);
 return {contractVersion:CONTRACT_VERSION,date,decisionId,recommendationId,actionId,planId,executionId,outcomeId,decisionMode:clean(plan?.decisionMode||action?.args?.decisionMode)||null,recommendationRevision:finite(plan?.recommendationRevision??action?.args?.recommendationRevision),outcome,attribution,guardrails:{readOnly:true,noSilentMutation:true,noAutomaticProgressionIncrease:true}};
}
function edgesForCycle(cycle){const edges=[];const add=(type,from,to)=>{if(from&&to)edges.push({type,from,to});};add('decision_recommendation',cycle.decisionId,cycle.recommendationId);add('recommendation_action',cycle.recommendationId,cycle.actionId);add('action_plan',cycle.actionId,cycle.planId);add('plan_execution',cycle.planId,cycle.executionId);add('execution_outcome',cycle.executionId,cycle.outcomeId);return edges;}
function buildGraph(stateInput,{now=new Date(),days=28}={}){
 const state=object(stateInput)?stateInput:{},asOf=now.toISOString().slice(0,10),lookback=Math.max(1,Math.min(56,Number(days)||28)),startMs=new Date(`${asOf}T12:00:00Z`).getTime()-(lookback-1)*86400000,start=new Date(startMs).toISOString().slice(0,10),plans=list(state.planner).filter(plan=>{const date=dateKey(plan.date);return date&&date>=start&&date<=asOf;});
 const cycles=plans.map(plan=>cycleFor(state,plan,dateKey(plan.date))),edges=cycles.flatMap(edgesForCycle);return {contractVersion:CONTRACT_VERSION,asOf,lookbackDays:lookback,cycles,edges,summary:{plans:cycles.length,fullyAttributed:cycles.filter(row=>row.attribution.complete).length,withDecision:cycles.filter(row=>row.decisionId).length,withRecommendation:cycles.filter(row=>row.recommendationId).length,withAction:cycles.filter(row=>row.actionId).length,withExecution:cycles.filter(row=>row.executionId).length,withOutcome:cycles.filter(row=>row.outcomeId).length},guardrails:{readOnly:true,noSilentMutation:true,noAutomaticProgressionIncrease:true,noRawChatRequired:true}};
}
function compactForContext(graph){if(!object(graph))return null;return {contractVersion:graph.contractVersion,asOf:graph.asOf,lookbackDays:graph.lookbackDays,summary:graph.summary,cycles:list(graph.cycles).slice(-12).map(row=>({date:row.date,decisionId:row.decisionId,recommendationId:row.recommendationId,actionId:row.actionId,planId:row.planId,executionId:row.executionId,outcomeId:row.outcomeId,decisionMode:row.decisionMode,outcome:row.outcome,attribution:row.attribution})),guardrails:graph.guardrails};}
module.exports={CONTRACT_VERSION,EDGE_TYPES,stableId,buildGraph,compactForContext};
