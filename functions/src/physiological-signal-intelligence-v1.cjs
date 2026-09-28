
'use strict';
const VERSION='physiological-signal-intelligence-v1.3.0-personal-sleep-debt';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),list=v=>Array.isArray(v)?v.filter(object):[],finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null,clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0)),round=(v,d=2)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;},mean=v=>{const x=v.filter(Number.isFinite);return x.length?x.reduce((a,b)=>a+b,0)/x.length:null;};
const DAY=86400000,HOUR=3600000;
function ts(v){const t=Date.parse(String(v||''));return Number.isFinite(t)?t:null;}
function dayKey(v){const t=ts(v);return t===null?String(v||'').slice(0,10):new Date(t).toISOString().slice(0,10);}
function sourceRows(state={}){return [...list(state.physiologicalSignals),...list(state.healthSignals),...list(state.wearableSignals)];}
function normalize(row={}){
 const capturedAt=String(row.capturedAt||row.timestamp||row.at||row.date||'').trim(),source=String(row.source||row.provider||row.device||'unknown').trim().slice(0,80)||'unknown';
 const out={id:String(row.id||'').trim()||null,source,capturedAt:capturedAt||null,date:dayKey(capturedAt||row.date),hrvMs:finite(row.hrvMs??row.hrv??row.heartRateVariability),restingHeartRateBpm:finite(row.restingHeartRateBpm??row.restingHeartRate??row.rhr),sleepHours:finite(row.sleepHours??row.sleep),sleepScore:finite(row.sleepScore),stressScore:finite(row.stressScore??row.stress),steps:finite(row.steps),activeMinutes:finite(row.activeMinutes)};
 const observed=Object.entries(out).filter(([k,v])=>!['id','source','capturedAt','date'].includes(k)&&v!==null).map(([k])=>k);return {...out,observed};
}
function median(values){const xs=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);if(!xs.length)return null;const m=Math.floor(xs.length/2);return xs.length%2?xs[m]:(xs[m-1]+xs[m])/2;}
function stdev(values){const xs=values.filter(Number.isFinite),m=mean(xs);return xs.length>1&&m!==null?Math.sqrt(xs.reduce((s,x)=>s+(x-m)**2,0)/xs.length):0;}
function baseline(rows,key,method='recent_fallback'){
 const vals=rows.map(x=>finite(x[key])).filter(x=>x!==null),med=median(vals),deviations=med===null?[]:vals.map(v=>Math.abs(v-med)),mad=median(deviations);
 const filtered=mad&&mad>0?vals.filter(v=>Math.abs(.6745*(v-med)/mad)<=3.5):vals;
 return {sampleSize:filtered.length,rawSampleSize:vals.length,mean:filtered.length?round(mean(filtered),2):null,median:filtered.length?round(median(filtered),2):null,mad:mad===null?null:round(mad,2),outliersRejected:Math.max(0,vals.length-filtered.length),method};
}
function latestMetric(rows,key,nowMs,maxAgeDays=7){
 let row=null,rowMs=null;
 for(const candidate of rows){const value=finite(candidate[key]),t=ts(candidate.capturedAt||candidate.date);if(value===null||t===null||t>nowMs||t<nowMs-maxAgeDays*DAY)continue;if(rowMs===null||t>rowMs){row=candidate;rowMs=t;}}
 if(!row)return null;
 return {row,value:finite(row[key]),capturedAt:row.capturedAt||row.date,date:row.date,source:row.source,ageHours:round(Math.max(0,(nowMs-rowMs)/HOUR),1)};
}
function baselineForMetric(rows,key,latest,nowMs){
 const latestMs=latest?ts(latest.capturedAt):null;
 const recent28=rows.filter(row=>{const t=ts(row.capturedAt||row.date);return t!==null&&t>=nowMs-28*DAY&&t<=nowMs&&finite(row[key])!==null;});
 if(latestMs===null)return baseline(recent28,key,'recent_fallback');
 const prior=recent28.filter(row=>{const t=ts(row.capturedAt||row.date);return t!==null&&t<latestMs;});
 return prior.length>=3?baseline(prior,key,'prior_28d_robust'):baseline(prior,key,'recent_fallback');
}
function freshnessWeight(ageHours){if(ageHours===null||ageHours===undefined)return 0;if(ageHours<=24)return 1;if(ageHours<=48)return .8;if(ageHours<=72)return .6;if(ageHours<=96)return .35;return 0;}
function metricScore(key,value,base){
 if(value===null)return null;
 const b=base?.median??base?.mean;
 if(key==='hrvMs'){if(!(b>0))return null;return clamp(65+(value/b-1)*120,0,100);}
 if(key==='restingHeartRateBpm'){if(!(b>0))return null;return clamp(65-(value-b)*6,0,100);}
 if(key==='sleepHours')return clamp((value-4)/4*100,0,100);
 if(key==='sleepScore')return clamp(value,0,100);
 if(key==='stressScore')return value<=5?clamp((5-value)/4*100,0,100):clamp(100-value,0,100);
 return null;
}
function dailyReadinessTrajectory(rows,baselines,coreMetrics,weights,nowMs){
 const start=nowMs-7*DAY,byDate=new Map();
 for(const row of rows){const t=ts(row.capturedAt||row.date);if(t===null||t<start||t>nowMs)continue;const date=row.date||dayKey(row.capturedAt);if(!date)continue;if(!byDate.has(date))byDate.set(date,[]);byDate.get(date).push(row);}
 const points=[...byDate.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,dayRows])=>{const parts=[];for(const key of coreMetrics){let latest=null,latestMs=-Infinity;for(const row of dayRows){const value=finite(row[key]),t=ts(row.capturedAt||row.date);if(value===null||t===null||t<latestMs)continue;latest={value};latestMs=t;}if(!latest)continue;const score=metricScore(key,latest.value,baselines[key]);if(score===null)continue;parts.push({key,score,weight:weights[key]||.1});}const den=parts.reduce((s,x)=>s+x.weight,0),score=parts.length>=2&&den>0?round(parts.reduce((s,x)=>s+x.score*x.weight,0)/den,0):null;return {date,score,componentCount:parts.length};}).filter(x=>x.score!==null);
 const recent=points.slice(-3),prior=points.slice(-6,-3),recentAverage=recent.length?round(mean(recent.map(x=>x.score)),1):null,priorAverage=prior.length?round(mean(prior.map(x=>x.score)),1):null,delta=recentAverage!==null&&priorAverage!==null?round(recentAverage-priorAverage,1):null,guardedOrLowDays=recent.filter(x=>x.score<65).length,persistentStrain=recent.length>=3&&guardedOrLowDays>=2,direction=delta===null?'insufficient':delta<=-8?'declining':delta>=8?'improving':'stable';
 return {direction,delta,recentAverage,priorAverage,recentDays:recent.length,guardedOrLowDays,persistentStrain,points:points.slice(-7)};
}
function personalSleepDebt(rows,nowMs){
 const recentStart=nowMs-3*DAY,baselineStart=recentStart-28*DAY,byDate=new Map();
 for(const row of rows){const value=finite(row.sleepHours),t=ts(row.capturedAt||row.date);if(value===null||t===null||t>nowMs||t<baselineStart)continue;const date=row.date||dayKey(row.capturedAt);if(!date)continue;const current=byDate.get(date);if(!current||t>=current.t)byDate.set(date,{date,t,value,source:row.source});}
 const points=[...byDate.values()].sort((a,b)=>a.t-b.t),recent=points.filter(x=>x.t>=recentStart),baselinePoints=points.filter(x=>x.t<recentStart),baselineValues=baselinePoints.map(x=>x.value);
 const baselineHours=baselineValues.length>=5?median(baselineValues):null;
 if(!(baselineHours>0)||recent.length<2)return {status:'insufficient',baselineHours:baselineHours===null?null:round(baselineHours,2),recentAverageHours:recent.length?round(mean(recent.map(x=>x.value)),2):null,deltaHours:null,deficitHours:null,relativeRatio:null,recentDays:recent.length,baselineDays:baselineValues.length,belowBaselineDays:0,accumulated:false,source:'personal_baseline'};
 const recentAverage=mean(recent.map(x=>x.value)),relativeRatio=recentAverage/baselineHours,belowBaselineDays=recent.filter(x=>x.value<baselineHours*.9).length,deficitHours=recent.reduce((sum,x)=>sum+Math.max(0,baselineHours-x.value),0),accumulated=recent.length>=2&&belowBaselineDays>=2&&relativeRatio<=.85;
 return {status:accumulated?'below_personal_baseline':'stable',baselineHours:round(baselineHours,2),recentAverageHours:round(recentAverage,2),deltaHours:round(recentAverage-baselineHours,2),deficitHours:round(deficitHours,2),relativeRatio:round(relativeRatio,3),recentDays:recent.length,baselineDays:baselineValues.length,belowBaselineDays,accumulated,source:'personal_baseline'};
}
function build(stateInput={},options={}){
 const state=object(stateInput)?stateInput:{},now=options.now instanceof Date?options.now:new Date(options.now||Date.now()),nowMs=now.getTime();
 const all=sourceRows(state).map(normalize).filter(x=>x.capturedAt||x.date).filter(x=>{const t=ts(x.capturedAt||x.date);return t!==null&&t<=nowMs;}).sort((a,b)=>(ts(a.capturedAt||a.date)||0)-(ts(b.capturedAt||b.date)||0));
 const recent=all.filter(x=>{const t=ts(x.capturedAt||x.date);return t!==null&&t>=nowMs-7*DAY;}),latest=recent.at(-1)||null,days=new Set(recent.map(x=>x.date).filter(Boolean));
 const metrics=['hrvMs','restingHeartRateBpm','sleepHours','sleepScore','stressScore','steps','activeMinutes'],coreMetrics=['hrvMs','restingHeartRateBpm','sleepHours','sleepScore','stressScore'],weights={hrvMs:.25,restingHeartRateBpm:.25,sleepHours:.2,sleepScore:.15,stressScore:.15};
 const metricLatest=Object.fromEntries(metrics.map(key=>[key,latestMetric(all,key,nowMs,7)]));
 const baselines=Object.fromEntries(metrics.map(key=>[key,baselineForMetric(all,key,metricLatest[key],nowMs)]));
 const trajectory=dailyReadinessTrajectory(all,baselines,coreMetrics,weights,nowMs),sleepDebt=personalSleepDebt(all,nowMs);
 const components=[],reasons=[];
 for(const key of coreMetrics){
  const latestValue=metricLatest[key],value=latestValue?.value??null,score=metricScore(key,value,baselines[key]),freshness=freshnessWeight(latestValue?.ageHours);
  if(score!==null&&freshness>0)components.push({key,value,score:round(score,1),freshness,ageHours:latestValue.ageHours,source:latestValue.source,weight:(weights[key]||.1)*freshness});
  if(latestValue&&latestValue.ageHours>72)reasons.push(`STALE_${key.toUpperCase()}`);
  const base=baselines[key]?.median??baselines[key]?.mean;
  if(key==='hrvMs'&&value!==null&&base>0&&value/base<.8)reasons.push('HRV_BELOW_RECENT_BASELINE');
  if(key==='restingHeartRateBpm'&&value!==null&&base>0&&value-base>=5)reasons.push('RHR_ABOVE_RECENT_BASELINE');
  if(key==='sleepHours'&&value!==null&&value<6)reasons.push('SHORT_SLEEP_SIGNAL');
  if(key==='sleepScore'&&value!==null&&value<60)reasons.push('LOW_SLEEP_SCORE');
  if(key==='stressScore'&&value!==null&&((value<=5&&value>=4)||(value>5&&value>=70)))reasons.push('ELEVATED_STRESS_SIGNAL');
 }
 const weightedDen=components.reduce((s,x)=>s+x.weight,0),readinessScore=components.length>=2&&weightedDen>0?round(components.reduce((s,x)=>s+x.score*x.weight,0)/weightedDen,0):null;
 const coreCoverage=components.length/coreMetrics.length,freshCoverage=coreMetrics.reduce((s,key)=>s+freshnessWeight(metricLatest[key]?.ageHours),0)/coreMetrics.length,dayCoverage=days.size/7;
 const baselineKeys=['hrvMs','restingHeartRateBpm'],baselineSupport=mean(baselineKeys.map(key=>clamp((baselines[key]?.sampleSize||0)/5,0,1)))??0;
 const agreement=components.length>=2?round(clamp(1-stdev(components.map(x=>x.score))/35,0,1),2):.35;
 const confidence=round(clamp(coreCoverage*.25+freshCoverage*.2+dayCoverage*.2+baselineSupport*.2+agreement*.15,0,1),2);
 const redFlags=reasons.filter(x=>['HRV_BELOW_RECENT_BASELINE','RHR_ABOVE_RECENT_BASELINE','SHORT_SLEEP_SIGNAL','LOW_SLEEP_SCORE','ELEVATED_STRESS_SIGNAL'].includes(x)).length;
 if(trajectory.persistentStrain)reasons.push('PERSISTENT_RECOVERY_STRAIN');if(sleepDebt.accumulated)reasons.push('ACCUMULATED_SLEEP_DEBT');
 const readinessBand=readinessScore===null?'unknown':readinessScore<45?'low':readinessScore<65?'guarded':readinessScore<80?'ready':'high';
 const recoveryConstraint=readinessScore===null?(sleepDebt.accumulated?'guarded':'unknown'):readinessScore<45||redFlags>=2?'protect':readinessScore<65||redFlags===1||trajectory.persistentStrain||sleepDebt.accumulated?'guarded':'normal';
 const quality=readinessScore!==null&&confidence>=.75&&components.length>=3&&days.size>=5?'strong':readinessScore!==null&&confidence>=.4&&components.length>=2?'usable':'insufficient';
 const latestMap=Object.fromEntries(metrics.map(key=>[key,metricLatest[key]?{value:metricLatest[key].value,capturedAt:metricLatest[key].capturedAt,date:metricLatest[key].date,source:metricLatest[key].source,ageHours:metricLatest[key].ageHours}:null]));
 const componentMap=Object.fromEntries(components.map(x=>[x.key,{value:x.value,score:x.score,ageHours:x.ageHours,freshness:round(x.freshness,2),source:x.source}]));
 return Object.freeze({version:VERSION,asOf:now.toISOString(),quality,confidence,sourceCount:new Set(recent.map(x=>x.source)).size,recentDays:days.size,latest:latest?Object.freeze(latest):null,metricLatest:Object.freeze(latestMap),baselines:Object.freeze(baselines),derived:Object.freeze({readinessScore,readinessBand,recoveryConstraint,signalAgreement:agreement,componentCount:components.length,components:Object.freeze(componentMap),trajectory:Object.freeze({...trajectory,points:Object.freeze(trajectory.points.map(x=>Object.freeze(x)))}),sleepDebt:Object.freeze(sleepDebt),reasonCodes:Object.freeze([...new Set(reasons)])}),guardrails:Object.freeze({optionalExternalSignals:true,sourcePreserved:true,futureSignalsExcluded:true,robustBaseline:true,latestExcludedFromBaselineWhenPossible:true,metricLatestFusion:true,staleSignalsDownweighted:true,noMedicalDiagnosis:true,noStateMutation:true,missingSignalsDoNotImplyNormal:true,multiDayRecoveryTrajectory:true,trajectoryRequiresRepeatedEvidence:true,trajectoryCanOnlyConstrain:true,personalSleepBaseline:true,sleepDebtRequiresRepeatedEvidence:true,noClinicalSleepTarget:true,sleepDebtCanOnlyConstrain:true})});
}
function compactForContext(v={}){return {version:String(v.version||VERSION),asOf:String(v.asOf||''),quality:String(v.quality||'insufficient'),confidence:finite(v.confidence)??0,sourceCount:Number(v.sourceCount)||0,recentDays:Number(v.recentDays)||0,latest:object(v.latest)?v.latest:null,metricLatest:object(v.metricLatest)?v.metricLatest:{},baselines:object(v.baselines)?v.baselines:{},derived:object(v.derived)?v.derived:{readinessScore:null,readinessBand:'unknown',recoveryConstraint:'unknown',reasonCodes:[]},guardrails:{optionalExternalSignals:true,sourcePreserved:true,futureSignalsExcluded:true,robustBaseline:true,latestExcludedFromBaselineWhenPossible:true,metricLatestFusion:true,staleSignalsDownweighted:true,noMedicalDiagnosis:true,noStateMutation:true,missingSignalsDoNotImplyNormal:true,multiDayRecoveryTrajectory:true,trajectoryRequiresRepeatedEvidence:true,trajectoryCanOnlyConstrain:true,personalSleepBaseline:true,sleepDebtRequiresRepeatedEvidence:true,noClinicalSleepTarget:true,sleepDebtCanOnlyConstrain:true}};}
const API=Object.freeze({VERSION,normalize,build,compactForContext,latestMetric,baselineForMetric,dailyReadinessTrajectory,personalSleepDebt});

module.exports=API;
