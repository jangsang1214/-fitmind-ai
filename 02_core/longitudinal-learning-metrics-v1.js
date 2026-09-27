(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.GarangLongitudinalLearningMetricsV1=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){

'use strict';
const VERSION='longitudinal-learning-metrics-v1.2.0-recency-weighted';
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const list=value=>Array.isArray(value)?value.filter(object):[];
const clean=value=>String(value??'').trim();
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round=(value,digits=2)=>{const p=10**digits;return Math.round(Number(value)*p)/p;};
const uniq=value=>[...new Set(value.filter(Boolean))];
const DAY=86400000;
const dateMs=value=>{const t=Date.parse(clean(value));return Number.isFinite(t)?t:null;};
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
function trajectorySummary(scored=[]){
 const rows=scored.slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
 if(rows.length<4)return {status:'insufficient',priorSampleSize:0,recentSampleSize:rows.length,priorMean:null,recentMean:rows.length?round(rows.reduce((s,x)=>s+x.score,0)/rows.length,1):null,delta:null};
 const size=Math.min(4,Math.floor(rows.length/2)),recent=rows.slice(-size),prior=rows.slice(-(size*2),-size),avg=xs=>xs.length?xs.reduce((s,x)=>s+x.score,0)/xs.length:null,priorMean=avg(prior),recentMean=avg(recent);
 return {status:prior.length>=2&&recent.length>=2?'measured':'insufficient',priorSampleSize:prior.length,recentSampleSize:recent.length,priorMean:priorMean===null?null:round(priorMean,1),recentMean:recentMean===null?null:round(recentMean,1),delta:priorMean===null||recentMean===null?null:round(recentMean-priorMean,1)};
}
function outcomeWindowSummary(scored=[],asOfValue){
 const asOfMs=dateMs(asOfValue)||Date.now(),rows=scored.map(item=>{const t=dateMs(item.date),ageDays=t===null?null:Math.max(0,(asOfMs-t)/DAY),weight=ageDays===null?0:Math.pow(.5,ageDays/28);return {...item,ageDays,weight};}).filter(item=>item.ageDays!==null&&item.score!==null);
 const buckets={days7:[],days28:[],days56:[],stale:[]};
 for(const item of rows){if(item.ageDays<=7)buckets.days7.push(item.score);if(item.ageDays<=28)buckets.days28.push(item.score);if(item.ageDays<=56)buckets.days56.push(item.score);if(item.ageDays>28)buckets.stale.push(item.score);}
 const avg=values=>values.length?round(values.reduce((a,b)=>a+b,0)/values.length,1):null,totalWeight=rows.reduce((s,item)=>s+item.weight,0),weighted=totalWeight>0?round(rows.reduce((s,item)=>s+item.score*item.weight,0)/totalWeight,1):null,confidence=round(clamp(totalWeight/6,0,1),2);
 return {recent7Mean:avg(buckets.days7),recent28Mean:avg(buckets.days28),recent56Mean:avg(buckets.days56),recencyWeightedMean:weighted,confidence,recent7SampleSize:buckets.days7.length,recent28SampleSize:buckets.days28.length,recent56SampleSize:buckets.days56.length,staleSampleSize:buckets.stale.length,halfLifeDays:28,method:'time_decay_descriptive_only'};
}
function build(stateInput={},learningGraphInput={},options={}){
 const state=object(stateInput)?stateInput:{},graph=object(learningGraphInput)?learningGraphInput:{},windowDays=Math.max(7,Math.min(56,Number(options.days||graph.lookbackDays||graph.days)||28)),asOf=String(graph.asOf||options.asOf||new Date().toISOString().slice(0,10));
 const events=list(state.actionLog),cycles=list(graph.cycles).slice().sort((a,b)=>String(a?.date||'').localeCompare(String(b?.date||''))),planById=new Map(list(state.planner).map(row=>[clean(row?.id),row]));
 const proposedIds=uniq([...events.filter(row=>['write_proposed','recommendation_proposed','recommendation_shown'].includes(eventName(row))).map(recommendationId),...cycles.map(row=>clean(row?.recommendationId)||null)]);
 const modifiedIds=uniq(events.filter(row=>['write_modified','recommendation_modified'].includes(eventName(row))).map(recommendationId));
 const acceptedIds=uniq(events.filter(row=>['write_confirmed','recommendation_accepted'].includes(eventName(row))).map(recommendationId));
 const rejectedIds=uniq(events.filter(row=>['write_rejected','recommendation_rejected'].includes(eventName(row))).map(recommendationId));
 const dismissedIds=uniq(events.filter(row=>eventName(row)==='recommendation_dismissed').map(recommendationId));
 const ignoredIds=uniq(events.filter(row=>eventName(row)==='recommendation_ignored').map(recommendationId));
 const resolvedIds=uniq([...acceptedIds,...rejectedIds,...dismissedIds,...ignoredIds]);
 const linkedToPlan=cycles.filter(row=>row?.recommendationId&&row?.planId),withExecution=cycles.filter(row=>row?.executionId),withOutcome=cycles.filter(row=>row?.outcomeId&&clean(row?.outcome?.classification)!=='pending'),fullyAttributed=cycles.filter(row=>row?.attribution?.complete===true&&row?.outcomeId&&clean(row?.outcome?.classification)!=='pending');
 const scored=fullyAttributed.map(row=>{const score=outcomeScore(row),plan=planById.get(clean(row?.planId)),domain=clean(plan?.domain||plan?.type||row?.domain||row?.type)||'unknown';return {row,score,date:clean(row?.date),domain};}).filter(item=>item.score!==null);
 const domainMap=new Map();for(const item of scored){if(!domainMap.has(item.domain))domainMap.set(item.domain,[]);domainMap.get(item.domain).push(item.score);}
 const domainOutcomes=Object.fromEntries([...domainMap.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([domain,scores])=>[domain,{sampleSize:scores.length,meanOutcomeScore:round(scores.reduce((a,b)=>a+b,0)/scores.length,1),confidence:round(clamp(scores.length/6,0,1),2)}]));
 const closedLoop=[];
 for(let index=0;index<fullyAttributed.length;index++){
  const current=fullyAttributed[index],next=cycles.find(row=>String(row?.date||'')>String(current?.date||'')&&clean(row?.recommendationId));if(!next)continue;
  const currentScore=outcomeScore(current),nextOutcomeScore=outcomeScore(next),delta=currentScore!==null&&nextOutcomeScore!==null?round(nextOutcomeScore-currentScore,1):null;
  closedLoop.push({outcomeId:clean(current.outcomeId)||null,currentOutcomeScore:currentScore,nextRecommendationId:clean(next.recommendationId)||null,nextOutcomeScore,delta});
 }
 const nextScored=closedLoop.map(row=>row.nextOutcomeScore).filter(value=>value!==null),closedLoopDeltas=closedLoop.map(row=>row.delta).filter(value=>value!==null),trajectory=trajectorySummary(scored),outcomeWindows=outcomeWindowSummary(scored,asOf);
 const counts={proposed:proposedIds.length,modified:modifiedIds.length,accepted:acceptedIds.length,rejected:rejectedIds.length,dismissed:dismissedIds.length,ignored:ignoredIds.length,resolved:resolvedIds.length,linkedToPlan:linkedToPlan.length,withExecution:withExecution.length,withOutcome:withOutcome.length,fullyAttributed:fullyAttributed.length,outcomeToLaterRecommendation:closedLoop.length};
 const rates={resolutionRate:rate(counts.resolved,counts.proposed),acceptanceRate:rate(counts.accepted,counts.resolved),planLinkRate:rate(counts.linkedToPlan,counts.accepted||counts.proposed),executionRate:rate(counts.withExecution,counts.linkedToPlan),outcomeRate:rate(counts.withOutcome,counts.withExecution),attributionRate:rate(counts.fullyAttributed,counts.withOutcome),closedLoopRate:rate(counts.outcomeToLaterRecommendation,counts.fullyAttributed)};
 const maturity=counts.fullyAttributed>=8&&closedLoopDeltas.length>=4?'established':counts.fullyAttributed>=4&&closedLoopDeltas.length>=2?'learning':counts.fullyAttributed>=2?'emerging':'sparse',confidence=round(clamp((counts.fullyAttributed/8)*.5+(closedLoopDeltas.length/6)*.25+outcomeWindows.confidence*.25,0,1),2);
 return Object.freeze({version:VERSION,asOf,windowDays,counts:Object.freeze(counts),rates:Object.freeze(rates),quality:Object.freeze({attributedOutcomeScore:scored.length?round(scored.reduce((sum,item)=>sum+item.score,0)/scored.length,1):null,laterRecommendationOutcomeScore:nextScored.length?round(nextScored.reduce((sum,value)=>sum+value,0)/nextScored.length,1):null,closedLoopDeltaScore:closedLoopDeltas.length?round(closedLoopDeltas.reduce((sum,value)=>sum+value,0)/closedLoopDeltas.length,1):null,trajectoryDeltaScore:trajectory.delta,maturity,confidence,sampleSize:fullyAttributed.length,closedLoopSampleSize:closedLoopDeltas.length,recencyWeightedOutcomeScore:outcomeWindows.recencyWeightedMean,recencyWeightedConfidence:outcomeWindows.confidence}),trajectory:Object.freeze(trajectory),outcomeWindows:Object.freeze(outcomeWindows),domainOutcomes:Object.freeze(Object.fromEntries(Object.entries(domainOutcomes).map(([k,v])=>[k,Object.freeze(v)]))),evidence:Object.freeze({recommendationIds:Object.freeze(proposedIds.slice(-24)),outcomeIds:Object.freeze(fullyAttributed.map(row=>clean(row.outcomeId)).filter(Boolean).slice(-24)),closedLoop:Object.freeze(closedLoop.slice(-12).map(row=>Object.freeze(row)))}),guardrails:Object.freeze({descriptiveOnly:true,temporalComparisonOnly:true,noCausalClaim:true,noCounterfactualClaim:true,noRawChatRequired:true,noAutomaticProgressionIncrease:true,recencyWeightedEvidence:true,noCausalUseOfTimeDecay:true})});
}
function compactForContext(metricsInput={}){const metrics=object(metricsInput)?metricsInput:{};return {version:String(metrics.version||VERSION),asOf:String(metrics.asOf||''),windowDays:Math.max(7,Math.min(56,Number(metrics.windowDays)||28)),counts:{...(object(metrics.counts)?metrics.counts:{})},rates:{...(object(metrics.rates)?metrics.rates:{})},quality:{...(object(metrics.quality)?metrics.quality:{})},trajectory:{...(object(metrics.trajectory)?metrics.trajectory:{})},outcomeWindows:{...(object(metrics.outcomeWindows)?metrics.outcomeWindows:{})},domainOutcomes:{...(object(metrics.domainOutcomes)?metrics.domainOutcomes:{})},guardrails:{descriptiveOnly:true,temporalComparisonOnly:true,noCausalClaim:true,noCounterfactualClaim:true,noRawChatRequired:true,noAutomaticProgressionIncrease:true,recencyWeightedEvidence:true,noCausalUseOfTimeDecay:true}};}
const API=Object.freeze({VERSION,build,compactForContext,outcomeScore,trajectorySummary,outcomeWindowSummary});

return API;
});
