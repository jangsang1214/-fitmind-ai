'use strict';

const ENGINE_VERSION='plan-outcome-intelligence-v1';
const VALID=new Set(['completed','partial','missed','recovery_constrained']);
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
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
function summarizePlanOutcomes(stateInput,{now=new Date(),days=7}={}){
 const state=object(stateInput)?stateInput:{},asOf=now.toISOString().slice(0,10),start=shiftDate(asOf,-Math.max(2,Math.min(28,Number(days)||7))),store=object(state?.meta?.dailyPlanDrafts)?state.meta.dailyPlanDrafts:{};
 const observations=Object.entries(store).map(([date,group])=>({date:dateKey(date),group})).filter(row=>row.date&&row.date>=start&&row.date<asOf&&object(row.group)&&String(row.group.status||'')==='finalized').map(row=>({date:row.date,result:inferResult(row.group)})).filter(row=>VALID.has(row.result)).sort((a,b)=>a.date.localeCompare(b.date));
 const counts={completed:0,partial:0,missed:0,recovery_constrained:0};for(const row of observations)counts[row.result]++;
 let classification='insufficient_evidence';
 if(counts.recovery_constrained>0)classification='recovery_constrained';
 else if(counts.missed>=2)classification='missed';
 else if(counts.partial+counts.missed>=2)classification='partial';
 else if(counts.completed>=2)classification='completed';
 const confidence=Math.min(1,Math.round(observations.length/4*100)/100);
 return {engineVersion:ENGINE_VERSION,asOf,lookbackDays:Math.max(2,Math.min(28,Number(days)||7)),classification,confidence,evidenceDays:observations.map(row=>row.date),counts,latest:observations.at(-1)||null,guardrails:{readOnly:true,noSilentMutation:true,noAutomaticProgressionIncrease:true}};
}
function compactForContext(value){if(!object(value))return null;return {engineVersion:value.engineVersion,asOf:value.asOf,classification:value.classification,confidence:value.confidence,evidenceDays:value.evidenceDays,counts:value.counts,latest:value.latest,guardrails:value.guardrails};}
module.exports={ENGINE_VERSION,summarizePlanOutcomes,compactForContext};
