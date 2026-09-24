'use strict';
const VERSION='intelligence-observability-v1.0.0';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const list=v=>Array.isArray(v)?v.filter(object):[];
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const round=(v,d=4)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;};
const mean=values=>{const xs=values.filter(Number.isFinite);return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;};

function normalizeSnapshot(x={}){
 return {
  date:String(x.date||x.asOf||''),
  qualityOverall:finite(x.qualityOverall??x.recommendationQuality?.overall),
  calibrationEce:finite(x.calibrationEce??x.calibration?.ece),
  calibrationBrier:finite(x.calibrationBrier??x.calibration?.brier),
  executionRate:finite(x.executionRate??x.responseModel?.behavior?.executionRate),
  responseConfidence:finite(x.responseConfidence??x.responseModel?.confidence),
  dataQualityScore:finite(x.dataQualityScore??x.dataQuality?.score),
  guardrailViolations:Math.max(0,Math.round(finite(x.guardrailViolations??x.offlineEvaluation?.guardrailViolations)??0))
 };
}
function aggregate(rows){
 return Object.freeze({
  samples:rows.length,
  qualityOverall:mean(rows.map(x=>x.qualityOverall)),
  calibrationEce:mean(rows.map(x=>x.calibrationEce)),
  calibrationBrier:mean(rows.map(x=>x.calibrationBrier)),
  executionRate:mean(rows.map(x=>x.executionRate)),
  responseConfidence:mean(rows.map(x=>x.responseConfidence)),
  dataQualityScore:mean(rows.map(x=>x.dataQualityScore)),
  guardrailViolations:rows.reduce((sum,x)=>sum+x.guardrailViolations,0)
 });
}
function delta(current,baseline,key){
 const a=finite(current?.[key]),b=finite(baseline?.[key]);return a===null||b===null?null:round(a-b);
}
function build(input={},options={}){
 const snapshots=list(input?.snapshots||input).map(normalizeSnapshot).filter(x=>x.date).sort((a,b)=>a.date.localeCompare(b.date));
 const recentWindow=Math.max(2,Math.min(14,Math.round(finite(options.recentWindow)??5)));
 const baselineWindow=Math.max(recentWindow,Math.min(56,Math.round(finite(options.baselineWindow)??10)));
 const recent=snapshots.slice(-recentWindow),baseline=snapshots.slice(Math.max(0,snapshots.length-recentWindow-baselineWindow),Math.max(0,snapshots.length-recentWindow));
 const current=aggregate(recent),base=aggregate(baseline),deltas={
  qualityOverall:delta(current,base,'qualityOverall'),
  calibrationEce:delta(current,base,'calibrationEce'),
  calibrationBrier:delta(current,base,'calibrationBrier'),
  executionRate:delta(current,base,'executionRate'),
  responseConfidence:delta(current,base,'responseConfidence'),
  dataQualityScore:delta(current,base,'dataQualityScore')
 },alerts=[];
 if(current.guardrailViolations>0)alerts.push('GUARDRAIL_VIOLATION');
 if(deltas.qualityOverall!==null&&deltas.qualityOverall<=-.12)alerts.push('RECOMMENDATION_QUALITY_DRIFT');
 if(deltas.calibrationEce!==null&&deltas.calibrationEce>=.08)alerts.push('CALIBRATION_DRIFT');
 if(deltas.calibrationBrier!==null&&deltas.calibrationBrier>=.08)alerts.push('BRIER_DRIFT');
 if(deltas.executionRate!==null&&deltas.executionRate<=-.15)alerts.push('EXECUTION_RATE_DRIFT');
 if(deltas.dataQualityScore!==null&&deltas.dataQualityScore<=-.15)alerts.push('DATA_QUALITY_DRIFT');
 const enoughBaseline=baseline.length>=Math.min(4,baselineWindow),enoughRecent=recent.length>=Math.min(3,recentWindow);
 const status=!enoughBaseline||!enoughRecent?'insufficient':alerts.includes('GUARDRAIL_VIOLATION')?'critical':alerts.length?'drift':'stable';
 return Object.freeze({version:VERSION,status,snapshotCount:snapshots.length,recentWindow,baselineWindow,baseline:base,current,deltas:Object.freeze(deltas),alerts:Object.freeze(alerts),guardrails:Object.freeze({diagnosticOnly:true,noAutomaticPolicyMutation:true,noCausalClaim:true,guardrailViolationAlwaysSurfaced:true})});
}
function compactForContext(v={}){
 return {version:String(v.version||VERSION),status:String(v.status||'insufficient'),snapshotCount:Number(v.snapshotCount)||0,deltas:object(v.deltas)?v.deltas:{},alerts:Array.isArray(v.alerts)?v.alerts.slice(0,8):[],guardrails:{diagnosticOnly:true,noAutomaticPolicyMutation:true,noCausalClaim:true,guardrailViolationAlwaysSurfaced:true}};
}
module.exports=Object.freeze({VERSION,build,normalizeSnapshot,compactForContext});
