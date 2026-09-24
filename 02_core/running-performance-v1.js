(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.GarangRunningPerformanceV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='running-performance-v1.0.0';
const DAY=86400000;
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const list=v=>Array.isArray(v)?v.filter(object):[];
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const round=(v,d=2)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;};
const dateKey=v=>String(v||'').slice(0,10);
const dateMs=v=>{const d=dateKey(v);const t=Date.parse(d?d+'T12:00:00Z':'');return Number.isFinite(t)?t:null;};
const median=values=>{const xs=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);if(!xs.length)return null;const m=Math.floor(xs.length/2);return xs.length%2?xs[m]:(xs[m-1]+xs[m])/2;};
const mean=values=>{const xs=values.filter(Number.isFinite);return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;};

function normalizeRun(row={}){
 const distanceKm=Math.max(0,finite(row.distance??row.distanceKm)??0),durationMin=Math.max(0,finite(row.duration??row.durationMin)??0),paceMinPerKm=distanceKm>0&&durationMin>0?durationMin/distanceKm:null;
 return {
  id:String(row.id||'').trim()||null,
  date:dateKey(row.date),
  distanceKm:round(distanceKm,3),
  durationMin:round(durationMin,2),
  paceMinPerKm:paceMinPerKm===null?null:round(paceMinPerKm,3),
  kcal:Math.max(0,finite(row.kcal)??0),
  splits:list(row.splits).map(x=>({km:finite(x.km),durationMin:finite(x.durationMin),paceMinPerKm:finite(x.paceMinPerKm)})).filter(x=>x.km!==null&&x.paceMinPerKm!==null),
  gpsQuality:object(row.gpsQuality)?row.gpsQuality:null
 };
}
function validRuns(state={},asOf=new Date()){
 const end=asOf instanceof Date?asOf:new Date(asOf||Date.now()),endMs=end.getTime();
 return list(state.runs).map(normalizeRun).filter(r=>{
  const t=dateMs(r.date);
  return t!==null&&t<=endMs&&r.distanceKm>.1&&r.durationMin>=2&&r.paceMinPerKm!==null&&r.paceMinPerKm>=2&&r.paceMinPerKm<=20;
 }).sort((a,b)=>a.date.localeCompare(b.date));
}
function inWindow(rows,endMs,days,offsetDays=0){
 const end=endMs-offsetDays*DAY,start=end-(days-1)*DAY;
 return rows.filter(r=>{const t=dateMs(r.date);return t!==null&&t>=start&&t<=end;});
}
function summarize(rows){
 const sessions=rows.length,distanceKm=rows.reduce((s,r)=>s+r.distanceKm,0),durationMin=rows.reduce((s,r)=>s+r.durationMin,0),paces=rows.map(r=>r.paceMinPerKm).filter(Number.isFinite);
 return {sessions,distanceKm:round(distanceKm,2),durationMin:round(durationMin,1),medianPaceMinPerKm:median(paces)===null?null:round(median(paces),2),averagePaceMinPerKm:distanceKm>0?round(durationMin/distanceKm,2):null,activeDays:new Set(rows.map(r=>r.date)).size};
}
function bestEffort(rows,minKm){
 const candidates=rows.filter(r=>r.distanceKm>=minKm&&r.paceMinPerKm!==null).sort((a,b)=>a.paceMinPerKm-b.paceMinPerKm||b.distanceKm-a.distanceKm||a.date.localeCompare(b.date));
 const top=candidates[0];return top?{distanceKm:minKm,observedFromRunKm:top.distanceKm,paceMinPerKm:top.paceMinPerKm,estimatedDurationMin:round(top.paceMinPerKm*minKm,2),date:top.date,runId:top.id,method:'run_average_pace'}:null;
}
function bestSplit1k(rows){
 const candidates=[];
 for(const run of rows)for(const split of run.splits){if((split.km??0)>=1&&finite(split.paceMinPerKm)!==null)candidates.push({paceMinPerKm:Number(split.paceMinPerKm),date:run.date,runId:run.id,km:split.km});}
 candidates.sort((a,b)=>a.paceMinPerKm-b.paceMinPerKm||a.date.localeCompare(b.date));
 return candidates[0]||null;
}
function paceTrend(rows,asOf){
 const end=asOf.getTime(),recent=inWindow(rows,end,28,0),prior=inWindow(rows,end,28,28),recentPace=median(recent.map(r=>r.paceMinPerKm)),priorPace=median(prior.map(r=>r.paceMinPerKm));
 if(recentPace===null||priorPace===null||recent.length<3||prior.length<3)return {status:'insufficient',direction:'unknown',recentMedianPaceMinPerKm:recentPace===null?null:round(recentPace,2),priorMedianPaceMinPerKm:priorPace===null?null:round(priorPace,2),changePct:null,recentSessions:recent.length,priorSessions:prior.length};
 const changePct=(recentPace-priorPace)/priorPace*100,direction=changePct<=-3?'improving':changePct>=3?'slower':'stable';
 return {status:'measured',direction,recentMedianPaceMinPerKm:round(recentPace,2),priorMedianPaceMinPerKm:round(priorPace,2),changePct:round(changePct,1),recentSessions:recent.length,priorSessions:prior.length};
}
function loadSignal(rows,asOf){
 const end=asOf.getTime(),recent=inWindow(rows,end,7,0),baseline=inWindow(rows,end,28,7),acuteMin=recent.reduce((s,r)=>s+r.durationMin,0),chronicWeekly=baseline.length?baseline.reduce((s,r)=>s+r.durationMin,0)/4:null,ratio=chronicWeekly>0?acuteMin/chronicWeekly:null;
 const band=ratio===null?'unknown':ratio>=1.5?'spike':ratio<=.6?'drop':'stable',confidence=round(clamp((baseline.length/8)*.65+(recent.length/3)*.35,0,1),2);
 return {acuteMinutes7:round(acuteMin,1),chronicWeeklyMinutes28:chronicWeekly===null?null:round(chronicWeekly,1),ratio:ratio===null?null:round(ratio,2),band,confidence,recentSessions:recent.length,baselineSessions:baseline.length};
}
function recommendation({rows,trend,load}){
 if(rows.length<3)return {status:'collect_more_data',reason:'RUN_HISTORY_SPARSE',action:'keep_recording'};
 if(load.band==='spike'&&load.confidence>=.45)return {status:'guarded',reason:'RUN_LOAD_SPIKE',action:'hold_or_reduce_running_load'};
 if(trend.direction==='slower'&&load.band!=='drop'&&trend.status==='measured')return {status:'guarded',reason:'PACE_TREND_SLOWER',action:'prioritize_recovery_and_consistency'};
 if(trend.direction==='improving'&&load.band==='stable')return {status:'ready',reason:'PACE_IMPROVING_LOAD_STABLE',action:'maintain_current_running_structure'};
 if(load.band==='drop'&&load.confidence>=.45)return {status:'guarded',reason:'RUN_LOAD_DROP',action:'rebuild_consistency_before_progression'};
 return {status:'ready',reason:'RUN_PATTERN_STABLE',action:'maintain_consistency'};
}
function build(stateInput={},options={}){
 const state=object(stateInput)?stateInput:{},asOf=options.asOf instanceof Date?options.asOf:new Date(options.asOf||Date.now()),rows=validRuns(state,asOf),end=asOf.getTime(),recent7=summarize(inWindow(rows,end,7)),recent28=summarize(inWindow(rows,end,28)),trend=paceTrend(rows,asOf),load=loadSignal(rows,asOf),best1k=bestSplit1k(rows)||bestEffort(rows,1),best5k=bestEffort(rows,5),best10k=bestEffort(rows,10),spanDays=rows.length>1?Math.max(0,Math.round((dateMs(rows.at(-1).date)-dateMs(rows[0].date))/DAY)):0,splitCoverage=rows.length?rows.filter(r=>r.splits.length).length/rows.length:0,confidence=round(clamp((rows.length/8)*.4+(spanDays/42)*.25+splitCoverage*.15+load.confidence*.2,0,1),2),rec=recommendation({rows,trend,load});
 return Object.freeze({
  version:VERSION,asOf:asOf.toISOString().slice(0,10),confidence,
  recent:Object.freeze({days7:Object.freeze(recent7),days28:Object.freeze(recent28)}),
  trend:Object.freeze(trend),load:Object.freeze(load),
  bestEfforts:Object.freeze({oneKm:best1k?Object.freeze(best1k):null,fiveKm:best5k?Object.freeze(best5k):null,tenKm:best10k?Object.freeze(best10k):null,longest:rows.length?Object.freeze(rows.slice().sort((a,b)=>b.distanceKm-a.distanceKm)[0]):null}),
  recommendation:Object.freeze(rec),
  evidence:Object.freeze({validRuns:rows.length,spanDays,splitCoverage:round(splitCoverage,2)}),
  guardrails:Object.freeze({observational:true,noMedicalClaim:true,noAutomaticProgression:true,noRouteInference:true,averagePaceIsNotSegmentPR:true})
 });
}
function compactForContext(v={}){
 return {version:String(v.version||VERSION),asOf:String(v.asOf||''),confidence:finite(v.confidence)??0,recent:object(v.recent)?v.recent:{},trend:object(v.trend)?v.trend:{},load:object(v.load)?v.load:{},bestEfforts:object(v.bestEfforts)?v.bestEfforts:{},recommendation:object(v.recommendation)?v.recommendation:{status:'collect_more_data'},evidence:object(v.evidence)?v.evidence:{},guardrails:{observational:true,noMedicalClaim:true,noAutomaticProgression:true,noRouteInference:true,averagePaceIsNotSegmentPR:true}};
}
return Object.freeze({VERSION,normalizeRun,validRuns,summarize,paceTrend,loadSignal,bestEffort,bestSplit1k,build,compactForContext});
});
