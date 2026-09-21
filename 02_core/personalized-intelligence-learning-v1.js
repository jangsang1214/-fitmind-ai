(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.GarangPersonalizedIntelligenceLearningV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='personalized-intelligence-learning-v1.0.0';
const RESPONSE_MODEL_VERSION='user-response-model-v1.0.0';
const POLICY_VERSION='candidate-policy-evaluation-v1.0.0';
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const rows=value=>Array.isArray(value)?value.filter(object):[];
const array=value=>Array.isArray(value)?value:[];
const clean=value=>String(value??'').trim();
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const round=(value,digits=3)=>{const p=10**digits;return Math.round((Number(value)+Number.EPSILON)*p)/p;};
const uniq=values=>[...new Set(values.filter(Boolean))];
function hash(value){let h=2166136261;for(const ch of String(value||'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
function eventName(row){return clean(row?.event||row?.action).toLowerCase();}
function eventAt(row){return Date.parse(row?.at||row?.updatedAt||row?.createdAt||'')||0;}
function recommendationId(row){return clean(row?.recommendationId||row?.args?.recommendationId||row?.callId)||null;}
function planIds(row){return array(row?.args?.planIds).map(item=>clean(item)).filter(Boolean);}
function outcomeScore(cycle){
 const direct=finite(cycle?.outcome?.score??cycle?.outcome?.rate);
 if(direct!==null)return clamp(direct,0,100);
 const classification=clean(cycle?.outcome?.classification).toLowerCase();
 if(classification==='completed')return 100;
 if(classification==='partial')return 50;
 if(classification==='missed')return 0;
 return null;
}
function responseFor(state,recommendation,plans=[]){
 const ids=new Set(plans.map(row=>clean(row?.id)).filter(Boolean)),events=rows(state?.actionLog).filter(row=>{
  const rid=recommendationId(row),target=clean(row?.targetId);
  return (recommendation&&rid===recommendation)||(target&&ids.has(target))||planIds(row).some(id=>ids.has(id));
 }).sort((a,b)=>eventAt(a)-eventAt(b));
 const map={
  write_modified:'edited',recommendation_modified:'edited',
  write_confirmed:'accepted',recommendation_accepted:'accepted',daily_plan_draft_confirmed:'accepted',autonomous_tool_executed:'accepted',
  write_rejected:'rejected',recommendation_rejected:'rejected',
  recommendation_dismissed:'dismissed',recommendation_ignored:'ignored',recommendation_deferred:'deferred'
 };
 for(let index=events.length-1;index>=0;index--){const resolution=map[eventName(events[index])];if(resolution)return {resolution,eventId:clean(events[index]?.id)||null,at:events[index]?.at||null};}
 if(plans.some(row=>row?.confirmed===true||row?.confirmedAt))return {resolution:'accepted',eventId:null,at:null};
 return {resolution:'unknown',eventId:null,at:null};
}
function stateFeatures(plan){
 const source=object(plan?.learningContext?.stateFeatures)?plan.learningContext.stateFeatures:(object(plan?.stateFeatures)?plan.stateFeatures:{});
 const pick=(key,limit=80)=>clean(source?.[key],limit)||null;
 return {
  readinessBand:pick('readinessBand'),
  fatigueBand:pick('fatigueBand'),
  loadBand:pick('loadBand'),
  goalBand:pick('goalBand')
 };
}
function groupCycles(graph){
 const groups=new Map();
 for(const cycle of rows(graph?.cycles)){
  const key=clean(cycle?.recommendationId)||clean(cycle?.planId)||`cycle_${groups.size}`;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(cycle);
 }
 return [...groups.values()];
}
function primaryPlan(plans){return plans.find(row=>clean(row?.domain)==='training'||clean(row?.type)==='workout')||plans[0]||null;}
function episodeForGroup(state,cycles,index){
 const planSet=new Set(cycles.map(row=>clean(row?.planId)).filter(Boolean)),plans=rows(state?.planner).filter(row=>planSet.has(clean(row?.id))),plan=primaryPlan(plans),first=cycles[0]||{},recommendation=clean(first?.recommendationId)||clean(plan?.recommendationId)||null,decisionId=clean(first?.decisionId)||clean(plan?.decisionId)||null,date=clean(first?.date||plan?.date)||null,response=responseFor(state,recommendation,plans);
 const scores=cycles.map(outcomeScore).filter(value=>value!==null),completion=cycles.map(row=>finite(row?.execution?.score)).filter(value=>value!==null),completeLinks=cycles.filter(row=>row?.attribution?.complete===true).length;
 const score=scores.length?round(scores.reduce((sum,value)=>sum+value,0)/scores.length,1):null,completionRatio=completion.length?round(completion.reduce((sum,value)=>sum+value,0)/completion.length/100,3):null;
 const classification=score===null?'pending':score>=80?'completed':score>=40?'partial':'missed',linkConfidence=cycles.length?completeLinks/cycles.length:0,responseKnown=response.resolution!=='unknown',attributionConfidence=round(clamp(linkConfidence*.85+(responseKnown?0.15:0),0,1),2);
 const duration=finite(plan?.duration),intensityScale=finite(plan?.intensityScale),volumeScale=finite(plan?.volumeScale),reasonCodes=uniq(array(plan?.learningContext?.decisionReasonCodes).map(clean).filter(Boolean));
 const episodeId=clean(plan?.episodeId)||`episode_${hash([date,decisionId,recommendation,...planSet].join('|')||String(index))}`;
 const label=!responseKnown?'unresolved':['rejected','dismissed','ignored'].includes(response.resolution)?'negative':score===null?'pending':score>=70?'positive':score<40?'negative':'mixed';
 return Object.freeze({
  version:VERSION,episodeId,date,
  context:Object.freeze({stateFeatures:Object.freeze(stateFeatures(plan)),goal:clean(plan?.learningContext?.goal,160)||null,relevantMemoryIds:Object.freeze(uniq(array(plan?.learningContext?.relevantMemoryIds).map(clean)).slice(0,12))}),
  decision:Object.freeze({decisionId,mode:clean(first?.decisionMode||plan?.decisionMode)||null,confidence:finite(plan?.learningContext?.decisionConfidence),reasonCodes:Object.freeze(reasonCodes),policyVersion:clean(plan?.policyVersion||plan?.learningContext?.policyVersion)||null}),
  recommendation:Object.freeze({recommendationId,type:clean(plan?.type)||null,duration:duration===null?null:duration,intensityScale:intensityScale===null?null:intensityScale,volumeScale:volumeScale===null?null:volumeScale,candidateId:clean(plan?.candidateId||plan?.learningContext?.candidateId)||null,knowledgeEvidenceIds:Object.freeze(uniq(array(plan?.learningContext?.knowledgeEvidenceIds).map(clean)).slice(0,12))}),
  userResponse:Object.freeze(response),
  execution:Object.freeze({started:cycles.some(row=>row?.execution?.status==='observed'),completionRatio,executionIds:Object.freeze(uniq(cycles.map(row=>clean(row?.executionId)).filter(Boolean)))}),
  outcome:Object.freeze({classification,score,outcomeIds:Object.freeze(uniq(cycles.map(row=>clean(row?.outcomeId)).filter(Boolean)))}),
  learning:Object.freeze({attributionConfidence,label,eligibleForLearning:responseKnown&&score!==null&&attributionConfidence>=0.7,noCausalClaim:true})
 });
}
function buildEpisodes(stateInput={},graphInput={}){
 const state=object(stateInput)?stateInput:{},groups=groupCycles(graphInput);
 return Object.freeze(groups.map((cycles,index)=>episodeForGroup(state,cycles,index)));
}
function durationBand(value){const n=finite(value);return n===null?null:n<=40?'short':n<=55?'standard':'long';}
function intensityBand(value){const n=finite(value);return n===null?null:n<.9?'reduced':n<=1.05?'standard':'high';}
function summarizeBucket(episodes,selector,band){
 const rows=episodes.filter(row=>selector(row)===band),resolved=rows.filter(row=>row.userResponse.resolution!=='unknown'),accepted=resolved.filter(row=>['accepted','edited'].includes(row.userResponse.resolution)),executed=rows.filter(row=>row.execution.started===true||finite(row.execution.completionRatio)>0),outcomes=rows.map(row=>finite(row.outcome.score)).filter(value=>value!==null);
 const acceptanceRate=resolved.length?accepted.length/resolved.length:null,executionRate=rows.length?executed.length/rows.length:null,outcomeMean=outcomes.length?outcomes.reduce((sum,value)=>sum+value,0)/outcomes.length:null,utility=round((acceptanceRate??.5)*.3+(executionRate??.5)*.35+((outcomeMean??50)/100)*.35,3);
 return Object.freeze({band,sampleSize:rows.length,acceptanceRate:acceptanceRate===null?null:round(acceptanceRate,3),executionRate:executionRate===null?null:round(executionRate,3),outcomeMean:outcomeMean===null?null:round(outcomeMean,1),utility,confidence:round(clamp(rows.length/6,0,1),2),episodeIds:Object.freeze(rows.map(row=>row.episodeId).slice(-16))});
}
function bestBucket(rows){
 const eligible=rows.filter(row=>row.sampleSize>=2).slice().sort((a,b)=>b.utility-a.utility||b.sampleSize-a.sampleSize||a.band.localeCompare(b.band));
 return eligible[0]||null;
}
function buildResponseModel(episodesInput=[]){
 const episodes=rows(episodesInput),eligible=episodes.filter(row=>row?.learning?.eligibleForLearning===true),resolved=episodes.filter(row=>row?.userResponse?.resolution!=='unknown'),accepted=resolved.filter(row=>['accepted','edited'].includes(row.userResponse.resolution)),edited=resolved.filter(row=>row.userResponse.resolution==='edited'),executed=episodes.filter(row=>row.execution?.started===true||finite(row.execution?.completionRatio)>0);
 const duration=Object.freeze(['short','standard','long'].map(band=>summarizeBucket(eligible,row=>durationBand(row?.recommendation?.duration),band))),intensity=Object.freeze(['reduced','standard','high'].map(band=>summarizeBucket(eligible,row=>intensityBand(row?.recommendation?.intensityScale),band))),bestDuration=bestBucket(duration),bestIntensity=bestBucket(intensity);
 return Object.freeze({
  version:RESPONSE_MODEL_VERSION,
  sampleSize:eligible.length,
  confidence:round(clamp(eligible.length/8,0,1),2),
  behavior:Object.freeze({
   planAcceptanceRate:resolved.length?round(accepted.length/resolved.length,3):null,
   recommendationEditRate:resolved.length?round(edited.length/resolved.length,3):null,
   executionRate:episodes.length?round(executed.length/episodes.length,3):null
  }),
  training:Object.freeze({
   adherenceByDuration:duration,
   adherenceByIntensity:intensity,
   observedBestDurationBand:bestDuration?bestDuration.band:null,
   observedBestIntensityBand:bestIntensity?bestIntensity.band:null
  }),
  evidenceEpisodeIds:Object.freeze(eligible.map(row=>row.episodeId).slice(-24)),
  guardrails:Object.freeze({derivedOnly:true,noCausalClaim:true,noAutomaticProgressionIncrease:true})
 });
}
function candidate(id,{durationScale=1,intensityCap=1,volumeCap=1,suppressProgression=false}={}){
 return {id,durationScale,intensityCap,volumeCap,suppressProgression};
}
function candidateBand(c,type){
 if(type==='duration')return c.durationScale<=.82?'short':'standard';
 return c.intensityCap<.9?'reduced':'standard';
}
function scoreCandidate(c,responseModel,decisionMode){
 const behavior=object(responseModel?.behavior)?responseModel.behavior:{};
 const baseAdherence=finite(behavior.executionRate)??0.5;
 const bestDuration=clean(responseModel?.training?.observedBestDurationBand);
 const bestIntensity=clean(responseModel?.training?.observedBestIntensityBand);
 let durationMatch=0,intensityMatch=0;
 if(bestDuration)durationMatch=candidateBand(c,'duration')===bestDuration?0.16:-0.04;
 if(bestIntensity)intensityMatch=candidateBand(c,'intensity')===bestIntensity?0.14:-0.04;
 const adherence=clamp(baseAdherence+durationMatch+intensityMatch,0,1);
 const recoveryMode=['caution','recover','reduce'].includes(decisionMode),progressMode=decisionMode==='progress';
 let safety=progressMode?0.9:0.96,goalAlignment=1,recoveryCost=progressMode?0.86:0.94;
 if(c.id==='simplified_duration'){safety=0.98;goalAlignment=0.96;recoveryCost=0.96;}
 if(c.id==='conservative_load'){safety=recoveryMode?1:0.98;goalAlignment=recoveryMode?0.98:0.9;recoveryCost=1;}
 const outcomeProxy=clamp((adherence+0.5)/1.5,0,1);
 const score=round(safety*0.3+adherence*0.3+outcomeProxy*0.2+goalAlignment*0.1+recoveryCost*0.1,3);
 return Object.freeze({...c,score,components:Object.freeze({safety:round(safety),adherenceProbability:round(adherence),expectedOutcomeProxy:round(outcomeProxy),goalAlignment:round(goalAlignment),recoveryCost:round(recoveryCost)})});
}
function evaluateCandidates(decisionInput={},responseModelInput={},options={}){
 const decision=object(decisionInput)?decisionInput:{},responseModel=object(responseModelInput)?responseModelInput:{},minConfidence=clamp(finite(options.minConfidence)??.5,0,1),mode=clean(decision.mode)||'collect_data';
 const candidates=[
  candidate('baseline'),
  candidate('simplified_duration',{durationScale:.8,volumeCap:.9}),
  candidate('conservative_load',{durationScale:.9,intensityCap:.85,volumeCap:.85,suppressProgression:true})
 ].map(row=>scoreCandidate(row,responseModel,mode)).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const baseline=candidates.find(row=>row.id==='baseline'),selected=candidates[0]||baseline,conf=clamp(finite(responseModel.confidence)??0,0,1),delta=selected&&baseline?round(selected.score-baseline.score,3):0,active=conf>=minConfidence&&selected?.id!=='baseline'&&delta>=.04&&mode!=='caution';
 const chosen=active?selected:baseline;
 return Object.freeze({
  version:POLICY_VERSION,active,confidence:round(conf,2),decisionMode:mode,selectedCandidate:chosen||null,scoreDelta:active?delta:0,candidates:Object.freeze(candidates),
  constraints:Object.freeze({durationScale:active?chosen.durationScale:1,intensityCap:active?chosen.intensityCap:1,volumeCap:active?chosen.volumeCap:1,suppressProgression:active?chosen.suppressProgression:false}),
  evidenceEpisodeIds:Object.freeze(array(responseModel.evidenceEpisodeIds).map(clean).filter(Boolean).slice(-24)),
  guardrails:Object.freeze({deterministic:true,advisoryOnly:true,canConstrainOnly:true,noAutomaticProgressionIncrease:true,painCautionCannotBeOverridden:true,noCausalClaim:true})
 });
}
function build(stateInput={},graphInput={},decisionInput={},options={}){
 const episodes=buildEpisodes(stateInput,graphInput),responseModel=buildResponseModel(episodes),evaluation=evaluateCandidates(decisionInput,responseModel,options);
 return Object.freeze({version:VERSION,asOf:clean(options.asOf)||clean(graphInput?.asOf)||new Date().toISOString().slice(0,10),episodes,responseModel,evaluation,guardrails:Object.freeze({readOnly:true,noSilentMutation:true,noCausalClaim:true,noAutomaticProgressionIncrease:true})});
}
function compactForContext(valueInput={}){
 const value=object(valueInput)?valueInput:{},model=object(value.responseModel)?value.responseModel:{},evaluation=object(value.evaluation)?value.evaluation:{};
 return {
  version:clean(value.version)||VERSION,asOf:clean(value.asOf)||null,
  episodeSummary:{count:rows(value.episodes).length,learningEligible:rows(value.episodes).filter(row=>row?.learning?.eligibleForLearning===true).length,evidenceEpisodeIds:array(model.evidenceEpisodeIds).map(clean).filter(Boolean).slice(-12)},
  responseModel:{version:clean(model.version)||RESPONSE_MODEL_VERSION,sampleSize:Number(model.sampleSize)||0,confidence:clamp(finite(model.confidence)??0,0,1),behavior:object(model.behavior)?{...model.behavior}:{},training:object(model.training)?{observedBestDurationBand:model.training.observedBestDurationBand||null,observedBestIntensityBand:model.training.observedBestIntensityBand||null}:{},guardrails:{derivedOnly:true,noCausalClaim:true,noAutomaticProgressionIncrease:true}},
  evaluation:{version:clean(evaluation.version)||POLICY_VERSION,active:evaluation.active===true,confidence:clamp(finite(evaluation.confidence)??0,0,1),selectedCandidate:evaluation.selectedCandidate?{id:evaluation.selectedCandidate.id,score:evaluation.selectedCandidate.score,components:evaluation.selectedCandidate.components}:null,scoreDelta:finite(evaluation.scoreDelta)??0,constraints:object(evaluation.constraints)?{...evaluation.constraints}:{durationScale:1,intensityCap:1,volumeCap:1,suppressProgression:false},guardrails:{deterministic:true,advisoryOnly:true,canConstrainOnly:true,noAutomaticProgressionIncrease:true,noCausalClaim:true}},
  guardrails:{readOnly:true,noSilentMutation:true,noCausalClaim:true,noAutomaticProgressionIncrease:true}
 };
}
return Object.freeze({VERSION,RESPONSE_MODEL_VERSION,POLICY_VERSION,buildEpisodes,buildResponseModel,evaluateCandidates,build,compactForContext,durationBand,intensityBand,outcomeScore});
});
