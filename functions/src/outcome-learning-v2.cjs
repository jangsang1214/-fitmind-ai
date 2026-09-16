'use strict';

const {summarizePlanOutcomes}=require('./outcome-intelligence.cjs');
const {buildGraph:buildIntelligenceGraph,compactForContext:compactIntelligenceGraph}=require('./intelligence-learning-contract.cjs');

const ENGINE_VERSION='outcome-learning-v2';
const VALID=new Set(['completed','partial','missed','recovery_constrained']);
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const round=(value,digits=2)=>{const p=10**digits;return Math.round((Number(value)+Number.EPSILON)*p)/p;};
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const dateKey=value=>String(value||'').slice(0,10);
function shiftDate(date,delta){const d=new Date(`${date}T12:00:00Z`);if(Number.isNaN(d.getTime()))return null;d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);}
function inferResult(group){
 const explicit=String(group?.result||group?.outcome?.classification||'').toLowerCase();
 if(VALID.has(explicit))return explicit;
 const domains=object(group?.outcome?.domains)?group.outcome.domains:{};
 const rates=Object.values(domains).map(row=>finite(row?.rate)).filter(value=>value!==null);
 if(!rates.length)return null;
 const average=rates.reduce((sum,value)=>sum+value,0)/rates.length;
 return average>=80?'completed':average>=40?'partial':'missed';
}
function longitudinalObservations(stateInput,{now=new Date(),days=28}={}){
 const state=object(stateInput)?stateInput:{},asOf=now.toISOString().slice(0,10),lookbackDays=Math.max(7,Math.min(56,Number(days)||28)),start=shiftDate(asOf,-lookbackDays),store=object(state?.meta?.dailyPlanDrafts)?state.meta.dailyPlanDrafts:{};
 return Object.entries(store).map(([date,group])=>({date:dateKey(date),group})).filter(row=>row.date&&row.date>=start&&row.date<asOf&&object(row.group)&&String(row.group.status||'')==='finalized').map(row=>({date:row.date,result:inferResult(row.group)})).filter(row=>VALID.has(row.result)).sort((a,b)=>a.date.localeCompare(b.date));
}
function summarizeLongitudinal(observations){
 const counts={completed:0,partial:0,missed:0,recovery_constrained:0};for(const row of observations)counts[row.result]++;
 const sampleDays=observations.length,executionGapCount=counts.partial+counts.missed,recoveryConstraintCount=counts.recovery_constrained,completedShare=sampleDays?counts.completed/sampleDays:null,executionGapShare=sampleDays?executionGapCount/sampleDays:null,recoveryConstraintShare=sampleDays?recoveryConstraintCount/sampleDays:null,confidence=round(clamp(sampleDays/12,0,1),2);
 let classification='insufficient_longitudinal_evidence';
 if(sampleDays>=4){
  if(recoveryConstraintCount>=2&&recoveryConstraintShare>=.3)classification='recovery_constrained_pattern';
  else if(executionGapCount>=3&&executionGapShare>=.5)classification='fragile_execution';
  else if(counts.completed>=4&&completedShare>=.65)classification='stable_execution';
  else classification='mixed_execution';
 }
 return {classification,confidence,sampleDays,counts,completedShare:completedShare===null?null:round(completedShare,2),executionGapShare:executionGapShare===null?null:round(executionGapShare,2),recoveryConstraintShare:recoveryConstraintShare===null?null:round(recoveryConstraintShare,2),evidenceDays:observations.map(row=>row.date)};
}
function summarizeOutcomeLearning(stateInput,{now=new Date(),days=28,recentDays=7}={}){
 const recent=summarizePlanOutcomes(stateInput,{now,days:recentDays}),observations=longitudinalObservations(stateInput,{now,days}),longitudinal=summarizeLongitudinal(observations),interventionLearning=buildIntelligenceGraph(stateInput,{now,days}),suppressProgression=['fragile_execution','recovery_constrained_pattern'].includes(longitudinal.classification)&&longitudinal.confidence>=.5,preferReducedLoad=longitudinal.classification==='recovery_constrained_pattern'&&longitudinal.confidence>=.5;
 return {engineVersion:recent.engineVersion,learningVersion:ENGINE_VERSION,asOf:recent.asOf,classification:recent.classification,confidence:recent.confidence,evidenceDays:recent.evidenceDays,counts:recent.counts,recent:{engineVersion:recent.engineVersion,classification:recent.classification,confidence:recent.confidence,evidenceDays:recent.evidenceDays,counts:recent.counts,latest:recent.latest},longitudinal,interventionLearning,decisionSupport:{suppressProgression,preferReducedLoad,automaticProgressionIncrease:false},guardrails:{readOnly:true,noSilentMutation:true,noAutomaticProgressionIncrease:true,longitudinalEvidenceOnly:true,interventionLearningAdvisoryOnly:true}};
}
function compactForContext(value){if(!object(value))return null;return {engineVersion:value.engineVersion,learningVersion:value.learningVersion,asOf:value.asOf,classification:value.classification,confidence:value.confidence,evidenceDays:value.evidenceDays,counts:value.counts,recent:value.recent,longitudinal:value.longitudinal,interventionLearning:compactIntelligenceGraph(value.interventionLearning),decisionSupport:value.decisionSupport,guardrails:value.guardrails};}

module.exports={ENGINE_VERSION,longitudinalObservations,summarizeLongitudinal,summarizeOutcomeLearning,compactForContext};
