'use strict';

const VERSION='user-response-model-v1.1.0';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const list=v=>Array.isArray(v)?v.filter(object):[];
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const round=(v,d=2)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;};
function mean(values){const v=values.filter(x=>Number.isFinite(x));return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;}
function durationBand(v){const n=finite(v);if(n===null)return null;if(n<=35)return 'short';if(n<=55)return 'medium';return 'long';}
function loadBand(v){const n=finite(v);if(n===null)return null;if(n<=.8)return 'low';if(n<=.95)return 'moderate';return 'full';}
function scoreEpisode(ep){const outcome=finite(ep?.outcome?.score);if(outcome!==null)return clamp(outcome,0,100);const c=String(ep?.outcome?.classification||'').toLowerCase();return c==='completed'?100:c==='partial'?50:c==='missed'?0:null;}
function executed(ep){return !!(ep?.execution?.executionId||ep?.execution?.status==='observed'||finite(ep?.execution?.completionRatio)>0);}
function accepted(ep){return ['accepted','edited'].includes(String(ep?.userResponse?.status||''));}
function stats(rows){
 const n=rows.length;if(!n)return {sampleSize:0,acceptanceRate:null,editRate:null,executionRate:null,outcomeScore:null,recoveryDelta:null,confidence:0};
 const outcomes=rows.map(r=>scoreEpisode(r)),recovery=rows.map(r=>finite(r?.outcome?.recoveryDelta));
 return {sampleSize:n,acceptanceRate:round(rows.filter(accepted).length/n,3),editRate:round(rows.filter(r=>String(r?.userResponse?.status||'')==='edited').length/n,3),executionRate:round(rows.filter(executed).length/n,3),outcomeScore:mean(outcomes)===null?null:round(mean(outcomes),1),recoveryDelta:mean(recovery)===null?null:round(mean(recovery),3),confidence:round(clamp(n/6,0,1),2)};
}
function group(episodes,keyFn,keys=[]){const map=new Map(keys.map(k=>[k,[]]));for(const ep of episodes){const k=keyFn(ep);if(!k)continue;if(!map.has(k))map.set(k,[]);map.get(k).push(ep);}return Object.fromEntries([...map].map(([k,v])=>[k,stats(v)]));}
function utility(s){return (s.executionRate??0)*.4+(s.acceptanceRate??0)*.2+((s.outcomeScore??50)/100)*.3+((s.recoveryDelta??0)+1)/2*.1;}
function preferred(statsMap,minSamples=2){return Object.entries(statsMap).filter(([,s])=>s.sampleSize>=minSamples).map(([name,s])=>({name,utility:utility(s),confidence:s.confidence})).sort((a,b)=>b.utility-a.utility||b.confidence-a.confidence||a.name.localeCompare(b.name))[0]?.name||null;}
function build(episodesInput={},options={}){
 const episodes=list(episodesInput?.episodes||episodesInput).filter(ep=>finite(ep?.attribution?.confidence)!==null&&ep.attribution.confidence>=.5);
 const resolved=episodes.filter(ep=>!['unresolved',''].includes(String(ep?.userResponse?.status||''))),acceptedRows=episodes.filter(accepted),executedRows=episodes.filter(executed),completed=episodes.filter(ep=>scoreEpisode(ep)!==null);
 const durationStats=group(episodes,ep=>durationBand(ep?.recommendation?.duration),['short','medium','long']);
 const intensityStats=group(episodes,ep=>loadBand(ep?.recommendation?.intensityScale),['low','moderate','full']);
 const volumeStats=group(episodes,ep=>loadBand(ep?.recommendation?.volumeScale),['low','moderate','full']);
 const timeStats=group(episodes,ep=>String(ep?.context?.timeBucket||'')||null,['morning','afternoon','evening','night','overnight']);
 const decisionModeStats=group(episodes,ep=>String(ep?.decision?.mode||'')||null);
 const behavior={planAcceptanceRate:resolved.length?round(acceptedRows.length/resolved.length,3):null,editRate:resolved.length?round(resolved.filter(ep=>String(ep?.userResponse?.status||'')==='edited').length/resolved.length,3):null,rejectionRate:resolved.length?round(resolved.filter(ep=>['rejected','dismissed','ignored'].includes(String(ep?.userResponse?.status||''))).length/resolved.length,3):null,executionRate:episodes.length?round(executedRows.length/episodes.length,3):null,acceptedExecutionRate:acceptedRows.length?round(acceptedRows.filter(executed).length/acceptedRows.length,3):null,outcomeObservedRate:episodes.length?round(completed.length/episodes.length,3):null};
 const training={preferredDurationBand:preferred(durationStats),preferredIntensityBand:preferred(intensityStats),preferredVolumeBand:preferred(volumeStats),durationStats,intensityStats,volumeStats};
 const timing={preferredTimeBucket:preferred(timeStats),timeStats};
 return Object.freeze({version:VERSION,asOf:String(options.asOf||episodesInput?.asOf||new Date().toISOString().slice(0,10)),sampleSize:episodes.length,behavior:Object.freeze(behavior),training:Object.freeze(training),timing:Object.freeze(timing),decisionModeStats:Object.freeze(decisionModeStats),confidence:round(clamp(episodes.length/12,0,1),2),guardrails:Object.freeze({derivedOnly:true,noCausalClaim:true,confidenceWeighted:true,minimumAttributionConfidence:.5,noAutomaticProgressionIncrease:true})});
}
function compactForContext(value={}){const v=object(value)?value:{};return {version:String(v.version||VERSION),asOf:String(v.asOf||''),sampleSize:Number(v.sampleSize)||0,behavior:object(v.behavior)?v.behavior:{},training:object(v.training)?v.training:{},timing:object(v.timing)?v.timing:{},decisionModeStats:object(v.decisionModeStats)?v.decisionModeStats:{},confidence:clamp(finite(v.confidence)??0,0,1),guardrails:{derivedOnly:true,noCausalClaim:true,confidenceWeighted:true,minimumAttributionConfidence:.5,noAutomaticProgressionIncrease:true}};}
module.exports=Object.freeze({VERSION,build,compactForContext,durationBand,loadBand,stats});
