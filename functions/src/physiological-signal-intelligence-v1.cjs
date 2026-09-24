'use strict';
const VERSION='physiological-signal-intelligence-v1.0.0';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),list=v=>Array.isArray(v)?v.filter(object):[],finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null,clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0)),round=(v,d=2)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;},mean=v=>{const x=v.filter(Number.isFinite);return x.length?x.reduce((a,b)=>a+b,0)/x.length:null;};
const DAY=86400000;
function ts(v){const t=Date.parse(String(v||''));return Number.isFinite(t)?t:null;}
function dayKey(v){const t=ts(v);return t===null?String(v||'').slice(0,10):new Date(t).toISOString().slice(0,10);}
function sourceRows(state={}){return [...list(state.physiologicalSignals),...list(state.healthSignals),...list(state.wearableSignals)];}
function normalize(row={}){
 const capturedAt=String(row.capturedAt||row.timestamp||row.at||row.date||'').trim(),source=String(row.source||row.provider||row.device||'unknown').trim().slice(0,80)||'unknown';
 const out={id:String(row.id||'').trim()||null,source,capturedAt:capturedAt||null,date:dayKey(capturedAt||row.date),hrvMs:finite(row.hrvMs??row.hrv??row.heartRateVariability),restingHeartRateBpm:finite(row.restingHeartRateBpm??row.restingHeartRate??row.rhr),sleepHours:finite(row.sleepHours??row.sleep),sleepScore:finite(row.sleepScore),stressScore:finite(row.stressScore??row.stress),steps:finite(row.steps),activeMinutes:finite(row.activeMinutes)};
 const observed=Object.entries(out).filter(([k,v])=>!['id','source','capturedAt','date'].includes(k)&&v!==null).map(([k])=>k);return {...out,observed};
}
function median(values){const xs=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);if(!xs.length)return null;const m=Math.floor(xs.length/2);return xs.length%2?xs[m]:(xs[m-1]+xs[m])/2;}
function baseline(rows,key,method='recent_fallback'){
 const vals=rows.map(x=>finite(x[key])).filter(x=>x!==null),med=median(vals),deviations=med===null?[]:vals.map(v=>Math.abs(v-med)),mad=median(deviations);
 const filtered=mad&&mad>0?vals.filter(v=>Math.abs(.6745*(v-med)/mad)<=3.5):vals;
 return {sampleSize:filtered.length,rawSampleSize:vals.length,mean:filtered.length?round(mean(filtered),2):null,median:filtered.length?round(median(filtered),2):null,mad:mad===null?null:round(mad,2),outliersRejected:Math.max(0,vals.length-filtered.length),method};
}
function build(stateInput={},options={}){
 const state=object(stateInput)?stateInput:{},now=options.now instanceof Date?options.now:new Date(options.now||Date.now()),nowMs=now.getTime();
 const all=sourceRows(state).map(normalize).filter(x=>x.capturedAt||x.date).filter(x=>{const t=ts(x.capturedAt||x.date);return t!==null&&t<=nowMs;}).sort((a,b)=>(ts(a.capturedAt||a.date)||0)-(ts(b.capturedAt||b.date)||0));
 const recent=all.filter(x=>{const t=ts(x.capturedAt||x.date);return t!==null&&t>=nowMs-7*DAY;}),latest=recent.at(-1)||null,latestMs=latest?ts(latest.capturedAt||latest.date):null,days=new Set(recent.map(x=>x.date).filter(Boolean)),metrics=['hrvMs','restingHeartRateBpm','sleepHours','sleepScore','stressScore','steps','activeMinutes'];
 const priorBaseline=latestMs===null?[]:all.filter(x=>{const t=ts(x.capturedAt||x.date);return t!==null&&t>=nowMs-28*DAY&&t<latestMs;}),baselineRows=priorBaseline.length>=3?priorBaseline:recent,baselineMethod=priorBaseline.length>=3?'prior_28d_robust':'recent_fallback',baselines=Object.fromEntries(metrics.map(k=>[k,baseline(baselineRows,k,baselineMethod)]));
 const componentScores=[],reasons=[];
 if(latest){
  const h=finite(latest.hrvMs),hb=baselines.hrvMs.median??baselines.hrvMs.mean;if(h!==null&&hb){const r=h/hb;componentScores.push(clamp(50+(r-1)*100,0,100));if(r<.8)reasons.push('HRV_BELOW_RECENT_BASELINE');}
  const rhr=finite(latest.restingHeartRateBpm),rb=baselines.restingHeartRateBpm.median??baselines.restingHeartRateBpm.mean;if(rhr!==null&&rb){const delta=rhr-rb;componentScores.push(clamp(70-delta*7,0,100));if(delta>=5)reasons.push('RHR_ABOVE_RECENT_BASELINE');}
  const sleep=finite(latest.sleepHours);if(sleep!==null){componentScores.push(clamp(sleep/8*100,0,100));if(sleep<6)reasons.push('SHORT_SLEEP_SIGNAL');}
  const ss=finite(latest.sleepScore);if(ss!==null)componentScores.push(clamp(ss,0,100));
  const stress=finite(latest.stressScore);if(stress!==null)componentScores.push(stress<=5?clamp((5-stress)/4*100,0,100):clamp(100-stress,0,100));
 }
 const freshHours=latestMs===null?null:(nowMs-latestMs)/3600000,metricCoverage=metrics.filter(k=>baselines[k].sampleSize>0).length/metrics.length,dayCoverage=days.size/7,freshness=freshHours===null?0:freshHours<=24?1:freshHours<=48?.7:freshHours<=96?.35:0,baselineConfidence=priorBaseline.length>=3?Math.min(1,priorBaseline.length/7):.45,confidence=round(clamp(metricCoverage*.3+dayCoverage*.3+freshness*.2+baselineConfidence*.2,0,1),2),readinessScore=componentScores.length>=2?round(mean(componentScores),0):null,quality=confidence>=.75&&days.size>=5?'strong':confidence>=.4&&days.size>=2?'usable':'insufficient';
 return Object.freeze({version:VERSION,asOf:now.toISOString(),quality,confidence,sourceCount:new Set(recent.map(x=>x.source)).size,recentDays:days.size,latest:latest?Object.freeze(latest):null,baselines:Object.freeze(baselines),derived:Object.freeze({readinessScore,readinessBand:readinessScore===null?'unknown':readinessScore<45?'low':readinessScore<65?'guarded':readinessScore<80?'ready':'high',reasonCodes:Object.freeze(reasons)}),guardrails:Object.freeze({optionalExternalSignals:true,sourcePreserved:true,futureSignalsExcluded:true,robustBaseline:true,latestExcludedFromBaselineWhenPossible:true,noMedicalDiagnosis:true,noStateMutation:true,missingSignalsDoNotImplyNormal:true})});
}
function compactForContext(v={}){return {version:String(v.version||VERSION),asOf:String(v.asOf||''),quality:String(v.quality||'insufficient'),confidence:finite(v.confidence)??0,sourceCount:Number(v.sourceCount)||0,recentDays:Number(v.recentDays)||0,latest:object(v.latest)?v.latest:null,baselines:object(v.baselines)?v.baselines:{},derived:object(v.derived)?v.derived:{readinessScore:null,readinessBand:'unknown',reasonCodes:[]},guardrails:{optionalExternalSignals:true,sourcePreserved:true,futureSignalsExcluded:true,robustBaseline:true,latestExcludedFromBaselineWhenPossible:true,noMedicalDiagnosis:true,noStateMutation:true,missingSignalsDoNotImplyNormal:true}};}
module.exports=Object.freeze({VERSION,normalize,build,compactForContext});
