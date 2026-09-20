'use strict';

const VERSION='longitudinal-learning-metrics-v1.0.0';
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const list=value=>Array.isArray(value)?value.filter(object):[];
const clean=value=>String(value??'').trim();
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round=(value,digits=2)=>{const p=10**digits;return Math.round(Number(value)*p)/p;};
const uniq=value=>[...new Set(value.filter(Boolean))];
function eventName(row){return clean(row?.event||row?.action).toLowerCase();}
function recommendationId(row){return clean(row?.recommendationId||row?.args?.recommendationId||row?.callId||row?.targetId)||null;}
function rate(num,den){return den>0?round(num/den,3):null;}
function outcomeScore(cycle){
 const explicit=finite(cycle?.outcome?.score??cycle?.outcome?.rate);
 if(explicit!==null)return clamp(explicit,0,100);
 const classification=clean(cycle?.outcome?.classification).toLowerCase();
 if(classification==='completed')return 100;
 if(classification==='partial')return 50;
 if(classification==='missed')return 0;
 return null;
}
function build(stateInput={},learningGraphInput={},options={}){
 const state=object(stateInput)?stateInput:{},graph=object(learningGraphInput)?learningGraphInput:{},windowDays=Math.max(7,Math.min(56,Number(options.days||graph.lookbackDays||graph.days)||28));
 const events=list(state.actionLog),cycles=list(graph.cycles).slice().sort((a,b)=>String(a?.date||'').localeCompare(String(b?.date||'')));
 const proposedIds=uniq([
  ...events.filter(row=>['write_proposed','recommendation_proposed','recommendation_shown'].includes(eventName(row))).map(recommendationId),
  ...cycles.map(row=>clean(row?.recommendationId)||null)
 ]);
 const modifiedIds=uniq(events.filter(row=>['write_modified','recommendation_modified'].includes(eventName(row))).map(recommendationId));
 const acceptedIds=uniq(events.filter(row=>['write_confirmed','recommendation_accepted'].includes(eventName(row))).map(recommendationId));
 const rejectedIds=uniq(events.filter(row=>['write_rejected','recommendation_rejected'].includes(eventName(row))).map(recommendationId));
 const dismissedIds=uniq(events.filter(row=>eventName(row)==='recommendation_dismissed').map(recommendationId));
 const ignoredIds=uniq(events.filter(row=>eventName(row)==='recommendation_ignored').map(recommendationId));
 const resolvedIds=uniq([...acceptedIds,...rejectedIds,...dismissedIds,...ignoredIds]);
 const linkedToPlan=cycles.filter(row=>row?.recommendationId&&row?.planId);
 const withExecution=cycles.filter(row=>row?.executionId);
 const withOutcome=cycles.filter(row=>row?.outcomeId&&clean(row?.outcome?.classification)!=='pending');
 const fullyAttributed=cycles.filter(row=>row?.attribution?.complete===true&&row?.outcomeId&&clean(row?.outcome?.classification)!=='pending');
 const scored=fullyAttributed.map(row=>({row,score:outcomeScore(row)})).filter(item=>item.score!==null);
 const closedLoop=[];
 for(let index=0;index<fullyAttributed.length;index++){
  const current=fullyAttributed[index],next=cycles.find(row=>String(row?.date||'')>String(current?.date||'')&&clean(row?.recommendationId));
  if(!next)continue;
  closedLoop.push({outcomeId:clean(current.outcomeId)||null,nextRecommendationId:clean(next.recommendationId)||null,nextOutcomeScore:outcomeScore(next)});
 }
 const nextScored=closedLoop.map(row=>row.nextOutcomeScore).filter(value=>value!==null);
 const counts={
  proposed:proposedIds.length,
  modified:modifiedIds.length,
  accepted:acceptedIds.length,
  rejected:rejectedIds.length,
  dismissed:dismissedIds.length,
  ignored:ignoredIds.length,
  resolved:resolvedIds.length,
  linkedToPlan:linkedToPlan.length,
  withExecution:withExecution.length,
  withOutcome:withOutcome.length,
  fullyAttributed:fullyAttributed.length,
  outcomeToLaterRecommendation:closedLoop.length
 };
 const rates={
  resolutionRate:rate(counts.resolved,counts.proposed),
  acceptanceRate:rate(counts.accepted,counts.resolved),
  planLinkRate:rate(counts.linkedToPlan,counts.accepted||counts.proposed),
  executionRate:rate(counts.withExecution,counts.linkedToPlan),
  outcomeRate:rate(counts.withOutcome,counts.withExecution),
  attributionRate:rate(counts.fullyAttributed,counts.withOutcome),
  closedLoopRate:rate(counts.outcomeToLaterRecommendation,counts.fullyAttributed)
 };
 return Object.freeze({
  version:VERSION,
  asOf:String(graph.asOf||options.asOf||new Date().toISOString().slice(0,10)),
  windowDays,
  counts:Object.freeze(counts),
  rates:Object.freeze(rates),
  quality:Object.freeze({
   attributedOutcomeScore:scored.length?round(scored.reduce((sum,item)=>sum+item.score,0)/scored.length,1):null,
   laterRecommendationOutcomeScore:nextScored.length?round(nextScored.reduce((sum,value)=>sum+value,0)/nextScored.length,1):null,
   confidence:round(clamp(fullyAttributed.length/8,0,1),2),
   sampleSize:fullyAttributed.length
  }),
  evidence:Object.freeze({
   recommendationIds:Object.freeze(proposedIds.slice(-24)),
   outcomeIds:Object.freeze(fullyAttributed.map(row=>clean(row.outcomeId)).filter(Boolean).slice(-24)),
   closedLoop:Object.freeze(closedLoop.slice(-12).map(row=>Object.freeze(row)))
  }),
  guardrails:Object.freeze({
   descriptiveOnly:true,
   noCausalClaim:true,
   noRawChatRequired:true,
   noAutomaticProgressionIncrease:true
  })
 });
}
function compactForContext(metricsInput={}){
 const metrics=object(metricsInput)?metricsInput:{};
 return {
  version:String(metrics.version||VERSION),
  asOf:String(metrics.asOf||''),
  windowDays:Math.max(7,Math.min(56,Number(metrics.windowDays)||28)),
  counts:{...(object(metrics.counts)?metrics.counts:{})},
  rates:{...(object(metrics.rates)?metrics.rates:{})},
  quality:{...(object(metrics.quality)?metrics.quality:{})},
  guardrails:{descriptiveOnly:true,noCausalClaim:true,noRawChatRequired:true,noAutomaticProgressionIncrease:true}
 };
}
module.exports=Object.freeze({VERSION,build,compactForContext,outcomeScore});
