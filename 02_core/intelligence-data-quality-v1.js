(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.GarangIntelligenceDataQualityV1=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='intelligence-data-quality-v1.1.0';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),list=v=>Array.isArray(v)?v.filter(object):[],array=v=>Array.isArray(v)?v:[],finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null,round=(v,d=3)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;},clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
function median(values){const xs=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);if(!xs.length)return null;const m=Math.floor(xs.length/2);return xs.length%2?xs[m]:(xs[m-1]+xs[m])/2;}
function robustOutliers(episodes,keyFn,{minSamples=5,zThreshold=3.5}={}){
 const rows=list(episodes).map(ep=>({episodeId:String(ep?.episodeId||''),value:finite(keyFn(ep))})).filter(x=>x.value!==null);
 if(rows.length<minSamples)return [];
 const med=median(rows.map(x=>x.value)),deviations=rows.map(x=>Math.abs(x.value-med)),mad=median(deviations);
 if(!(mad>0))return [];
 return rows.filter(x=>Math.abs(.6745*(x.value-med)/mad)>zThreshold).map(x=>({episodeId:x.episodeId,value:x.value,median:round(med),mad:round(mad),robustZ:round(Math.abs(.6745*(x.value-med)/mad),2)}));
}
function build(episodesInput={},options={}){
 const episodes=list(episodesInput?.episodes||episodesInput),asOf=String(options.asOf||episodesInput?.asOf||new Date().toISOString().slice(0,10)),ids=new Set(),duplicates=[],future=[],invalid=[],chainBreaks=[],missingAttribution=[],invalidRanges=[];
 let attributed=0,resolved=0,executed=0,outcomes=0;
 for(const ep of episodes){
  const id=String(ep?.episodeId||'');
  if(!id)invalid.push('MISSING_EPISODE_ID');else if(ids.has(id))duplicates.push(id);else ids.add(id);
  if(String(ep?.date||'')>asOf)future.push(id||String(ep?.date));
  const ac=finite(ep?.attribution?.confidence);
  if(ac===null)missingAttribution.push(id||String(ep?.date||''));else if(ac<0||ac>1)invalidRanges.push({episodeId:id,field:'attribution.confidence',value:ac});else if(ac>=.5)attributed++;
  const completion=finite(ep?.execution?.completionRatio);if(completion!==null&&(completion<0||completion>1))invalidRanges.push({episodeId:id,field:'execution.completionRatio',value:completion});
  const outcomeScore=finite(ep?.outcome?.score);if(outcomeScore!==null&&(outcomeScore<0||outcomeScore>100))invalidRanges.push({episodeId:id,field:'outcome.score',value:outcomeScore});
  if(ep?.userResponse?.status&&!['unresolved',''].includes(String(ep.userResponse.status)))resolved++;
  if(ep?.execution?.executionId||ep?.execution?.status==='observed'||(completion??0)>0)executed++;
  if(ep?.outcome?.outcomeId||outcomeScore!==null||ep?.outcome?.classification)outcomes++;
  if(ep?.outcome?.outcomeId&&!ep?.execution?.executionId)chainBreaks.push({episodeId:id,code:'OUTCOME_WITHOUT_EXECUTION'});
  if(ep?.execution?.executionId&&!ep?.recommendation?.recommendationId)chainBreaks.push({episodeId:id,code:'EXECUTION_WITHOUT_RECOMMENDATION'});
 }
 const outcomeOutliers=robustOutliers(episodes,ep=>ep?.outcome?.score),attributionOutliers=robustOutliers(episodes,ep=>ep?.attribution?.confidence,{zThreshold:4});
 const n=episodes.length,coverage={attribution:n?round(attributed/n):0,resolution:n?round(resolved/n):0,execution:n?round(executed/n):0,outcome:n?round(outcomes/n):0},integrityPenalty=duplicates.length+future.length+invalid.length+chainBreaks.length+invalidRanges.length,coverageScore=round((coverage.attribution*.3+coverage.resolution*.2+coverage.execution*.25+coverage.outcome*.25)),missingPenalty=n?Math.min(.18,missingAttribution.length/n*.18):0,outlierPenalty=n?Math.min(.12,(outcomeOutliers.length+attributionOutliers.length)/n*.08):0,score=round(clamp(coverageScore-integrityPenalty*.12-missingPenalty-outlierPenalty,0,1)),status=integrityPenalty?'invalid':n<3?'insufficient':score>=.7?'strong':score>=.45?'usable':'sparse';
 return Object.freeze({version:VERSION,asOf,inputEpisodes:n,status,score,coverage:Object.freeze(coverage),issues:Object.freeze({duplicateEpisodeIds:Object.freeze(duplicates),futureEpisodes:Object.freeze(future),invalid:Object.freeze(invalid),chainBreaks:Object.freeze(chainBreaks),missingAttribution:Object.freeze(missingAttribution),invalidRanges:Object.freeze(invalidRanges),outliers:Object.freeze({outcomeScore:Object.freeze(outcomeOutliers),attributionConfidence:Object.freeze(attributionOutliers)})}),guardrails:Object.freeze({futureEvidenceRejected:true,duplicateAware:true,chainIntegrityChecked:true,rangeValidated:true,missingAttributionExplicit:true,outlierAware:true,noDataFabrication:true})});
}
function compactForContext(v={}){return {version:String(v.version||VERSION),asOf:String(v.asOf||''),inputEpisodes:Number(v.inputEpisodes)||0,status:String(v.status||'insufficient'),score:finite(v.score)??0,coverage:object(v.coverage)?v.coverage:{},issues:object(v.issues)?{duplicateEpisodeIds:array(v.issues.duplicateEpisodeIds).slice(0,4),futureEpisodes:array(v.issues.futureEpisodes).slice(0,4),invalid:array(v.issues.invalid).slice(0,4),chainBreaks:list(v.issues.chainBreaks).slice(0,4),missingAttribution:array(v.issues.missingAttribution).slice(0,4),invalidRanges:list(v.issues.invalidRanges).slice(0,4),outliers:object(v.issues.outliers)?{outcomeScore:list(v.issues.outliers.outcomeScore).slice(0,4),attributionConfidence:list(v.issues.outliers.attributionConfidence).slice(0,4)}:{}}:{},guardrails:{futureEvidenceRejected:true,duplicateAware:true,chainIntegrityChecked:true,rangeValidated:true,missingAttributionExplicit:true,outlierAware:true,noDataFabrication:true}};}
return Object.freeze({VERSION,build,compactForContext,robustOutliers});

});
