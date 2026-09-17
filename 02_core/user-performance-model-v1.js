(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GarangUserPerformanceModelV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const MODEL_VERSION='user-performance-model-v1.0.0';
const DEFAULT_CONTEXT_MIN_CONFIDENCE=0.5;
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const list=v=>Array.isArray(v)?v:[];
const clean=v=>String(v??'').trim();
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)));
const round=(v,d=2)=>{if(!Number.isFinite(v))return null;const p=10**d;return Math.round((v+Number.EPSILON)*p)/p;};
const dateKey=v=>{const s=clean(v);const m=s.match(/^\d{4}-\d{2}-\d{2}/);return m?m[0]:null;};
const rowDate=row=>dateKey(row?.date||row?.performedAt||row?.createdAt||row?.at||row?.updatedAt||row?.resolvedAt);
const newestDate=rows=>list(rows).map(rowDate).filter(Boolean).sort().at(-1)||null;
const unique=values=>[...new Set(list(values).map(String).filter(Boolean))];
const evidenceId=row=>clean(row?.id||row?.recommendationId||row?.decisionId||row?.callId)||null;
const evidenceIds=rows=>unique(list(rows).map(evidenceId).filter(Boolean)).slice(-24);
function dimension(value,{confidence=0,sampleSize=0,lastUpdated=null,evidence=[]}={}){
  return Object.freeze({
    value:value===null||value===undefined?null:round(Number(value),2),
    confidence:round(clamp(confidence,0,1),2),
    sampleSize:Math.max(0,Number(sampleSize)||0),
    lastUpdated:lastUpdated||null,
    evidenceIds:evidenceIds(evidence)
  });
}
function recentRows(rows,{days=28,asOf=new Date()}={}){
  const end=new Date(asOf);end.setHours(23,59,59,999);const start=new Date(end);start.setDate(start.getDate()-Math.max(0,days-1));start.setHours(0,0,0,0);
  return list(rows).filter(row=>{const d=rowDate(row);if(!d)return false;const t=new Date(`${d}T12:00:00`);return Number.isFinite(t.getTime())&&t>=start&&t<=end;});
}
function trainingConsistency(state,opts){
  const rows=recentRows(state?.workouts,opts),days=unique(rows.map(rowDate)),target=Math.max(1,Math.min(7,finite(state?.onboarding?.weeklyFrequency)||4));
  const weeks=Math.max(1,(opts?.days||28)/7),expected=target*weeks,value=expected?clamp(days.length/expected*100,0,100):null;
  return dimension(value,{confidence:clamp(days.length/8,0,1),sampleSize:days.length,lastUpdated:newestDate(rows),evidence:rows});
}
function recoveryStability(state,opts){
  const rows=recentRows(state?.dailyCheckins||state?.checkins,opts),scores=[];
  for(const row of rows){const energy=finite(row?.energy),stress=finite(row?.stress),sleep=finite(row?.sleepHours??row?.sleep);const sorenessValues=object(row?.soreness)?Object.values(row.soreness).map(finite).filter(v=>v!==null):[];const soreness=sorenessValues.length?Math.max(...sorenessValues):finite(row?.soreness);const parts=[];if(energy!==null)parts.push(clamp((energy-1)/4*100,0,100));if(stress!==null)parts.push(clamp((5-stress)/4*100,0,100));if(sleep!==null)parts.push(clamp(sleep/8*100,0,100));if(soreness!==null)parts.push(clamp((5-soreness)/5*100,0,100));if(parts.length)scores.push(parts.reduce((a,b)=>a+b,0)/parts.length);}
  const value=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;
  return dimension(value,{confidence:clamp(scores.length/7,0,1),sampleSize:scores.length,lastUpdated:newestDate(rows),evidence:rows});
}
function nutritionConsistency(state,opts){
  const rows=recentRows(state?.meals,opts),days=unique(rows.map(rowDate)),windowDays=Math.max(7,opts?.days||28),value=clamp(days.length/windowDays*100,0,100);
  return dimension(value,{confidence:clamp(days.length/14,0,1),sampleSize:days.length,lastUpdated:newestDate(rows),evidence:rows});
}
function planAdherence(state,opts){
  const plans=recentRows(state?.planner,opts),resolved=plans.filter(row=>row?.completed===true||row?.status==='completed'||row?.status==='missed'||row?.status==='skipped'),completed=resolved.filter(row=>row?.completed===true||row?.status==='completed');
  const value=resolved.length?completed.length/resolved.length*100:null;
  return dimension(value,{confidence:clamp(resolved.length/12,0,1),sampleSize:resolved.length,lastUpdated:newestDate(resolved),evidence:resolved});
}
function recommendationResponsiveness(state,opts){
  const audit=recentRows(state?.recommendationAudit||state?.actionLog,opts).filter(row=>['write_confirmed','write_rejected','recommendation_accepted','recommendation_rejected','recommendation_dismissed','recommendation_ignored'].includes(clean(row?.event||row?.name||row?.type)));
  const accepted=audit.filter(row=>['write_confirmed','recommendation_accepted'].includes(clean(row?.event||row?.name||row?.type))).length;
  const value=audit.length?accepted/audit.length*100:null;
  return dimension(value,{confidence:clamp(audit.length/8,0,1),sampleSize:audit.length,lastUpdated:newestDate(audit),evidence:audit});
}
function build(stateInput,{days=28,asOf=new Date()}={}){
  const state=object(stateInput)?stateInput:{},opts={days:Math.max(7,Math.min(56,Number(days)||28)),asOf};
  const dimensions={
    trainingConsistency:trainingConsistency(state,opts),
    recoveryStability:recoveryStability(state,opts),
    nutritionConsistency:nutritionConsistency(state,opts),
    planAdherence:planAdherence(state,opts),
    recommendationResponsiveness:recommendationResponsiveness(state,opts)
  };
  return Object.freeze({modelVersion:MODEL_VERSION,asOf:new Date(asOf).toISOString(),windowDays:opts.days,dimensions,guardrails:Object.freeze({readOnly:true,noDecisionMutation:true,noAutomaticProgression:true})});
}
function validate(model){
  if(!object(model)||model.modelVersion!==MODEL_VERSION)return {valid:false,reasons:['MODEL_VERSION_INVALID']};
  const reasons=[];for(const [name,row] of Object.entries(model.dimensions||{})){for(const key of ['value','confidence','sampleSize','lastUpdated','evidenceIds'])if(!Object.prototype.hasOwnProperty.call(row||{},key))reasons.push(`${name}:${key}:missing`);if(Number(row?.confidence)<0||Number(row?.confidence)>1)reasons.push(`${name}:confidence:range`);if(!Array.isArray(row?.evidenceIds))reasons.push(`${name}:evidenceIds:type`);}return {valid:reasons.length===0,reasons};
}
function compactForContext(modelInput,{minConfidence=DEFAULT_CONTEXT_MIN_CONFIDENCE}={}){
  const check=validate(modelInput);if(!check.valid){const error=new Error('USER_PERFORMANCE_MODEL_INVALID');error.reasons=check.reasons;throw error;}
  const parsed=finite(minConfidence),threshold=round(clamp(parsed===null?DEFAULT_CONTEXT_MIN_CONFIDENCE:parsed,0,1),2),dimensions={},withheldDimensions=[];
  for(const [name,row] of Object.entries(modelInput.dimensions||{})){
    const trusted=row?.value!==null&&row?.value!==undefined&&Number(row?.confidence)>=threshold;
    if(trusted){dimensions[name]=Object.freeze({...row,evidenceIds:Object.freeze([...list(row?.evidenceIds)])});continue;}
    withheldDimensions.push(Object.freeze({name,reason:row?.value===null||row?.value===undefined?'NO_VALUE':'LOW_CONFIDENCE',confidence:round(Number(row?.confidence)||0,2),sampleSize:Math.max(0,Number(row?.sampleSize)||0)}));
  }
  return Object.freeze({
    modelVersion:modelInput.modelVersion,
    asOf:modelInput.asOf,
    windowDays:modelInput.windowDays,
    minConfidence:threshold,
    dimensions:Object.freeze(dimensions),
    withheldDimensions:Object.freeze(withheldDimensions),
    guardrails:Object.freeze({readOnly:true,affectsDecision:false,noDecisionMutation:true,noAutomaticProgression:true})
  });
}
return Object.freeze({MODEL_VERSION,DEFAULT_CONTEXT_MIN_CONFIDENCE,build,validate,compactForContext});
});
