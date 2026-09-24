(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.GarangPersonalPerformanceIntelligenceV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='personal-performance-intelligence-v1.0.0';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const round=(v,d=2)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;};

function dim(model,key){
 const row=model?.dimensions?.[key]||{};
 return {value:finite(row.value),confidence:clamp(finite(row.confidence)??0,0,1),sampleSize:Math.max(0,Number(row.sampleSize)||0)};
}
function candidate(domain,priority,reason,action,confidence,evidence=[]){return {domain,priority,reason,action,confidence:round(clamp(confidence,0,1),2),evidence};}
function build(input={},options={}){
 const userState=object(input.userState)?input.userState:{},running=object(input.runningPerformance)?input.runningPerformance:{},model=object(input.userPerformance)?input.userPerformance:{},review=object(input.weeklyReview)?input.weeklyReview:{};
 const readiness=String(userState?.readiness?.band||'unknown'),fatigue=String(userState?.fatigue?.band||'unknown'),load=String(userState?.load?.band||'unknown'),stateConfidence=clamp(finite(userState.confidence)??0,0,1);
 const training=dim(model,'trainingConsistency'),nutrition=dim(model,'nutritionConsistency'),adherence=dim(model,'planAdherence'),outcome=dim(model,'attributedOutcomeScore');
 const runningConfidence=clamp(finite(running.confidence)??0,0,1),candidates=[];
 const stateReasons=Array.isArray(userState?.readiness?.reasons)?userState.readiness.reasons:[];
 const pain=stateReasons.includes('PAIN_CAUTION')||Array.isArray(userState?.fatigue?.reasons)&&userState.fatigue.reasons.includes('PAIN_CAUTION');
 if(pain)candidates.push(candidate('recovery',100,'PAIN_CAUTION','protect_recovery_and_avoid_intensity_progression',Math.max(.7,stateConfidence),['readiness']));
 if(fatigue==='high'||readiness==='low')candidates.push(candidate('recovery',92,'RECOVERY_SIGNAL_LOW','reduce_complexity_and_prioritize_recovery',Math.max(.45,stateConfidence),['readiness','fatigue']));
 if(running?.load?.band==='spike'&&runningConfidence>=.4)candidates.push(candidate('running',86,'RUN_LOAD_SPIKE','hold_or_reduce_running_load',runningConfidence,['running_load']));
 if(running?.trend?.direction==='slower'&&running?.trend?.status==='measured'&&runningConfidence>=.45)candidates.push(candidate('running',78,'RUN_PACE_TREND_SLOWER','prioritize_running_consistency_and_recovery',runningConfidence,['running_trend']));
 if(nutrition.value!==null&&nutrition.value<55&&nutrition.confidence>=.4)candidates.push(candidate('nutrition',72,'NUTRITION_CONSISTENCY_LOW','simplify_next_nutrition_action',nutrition.confidence,['nutrition_consistency']));
 if(adherence.value!==null&&adherence.value<60&&adherence.confidence>=.4)candidates.push(candidate('planning',68,'PLAN_ADHERENCE_LOW','reduce_next_plan_friction',adherence.confidence,['plan_adherence']));
 if(training.value!==null&&training.value<55&&training.confidence>=.4)candidates.push(candidate('training',64,'TRAINING_CONSISTENCY_LOW','protect_training_consistency_before_progression',training.confidence,['training_consistency']));
 if(running?.trend?.direction==='improving'&&running?.load?.band==='stable'&&runningConfidence>=.5)candidates.push(candidate('running',50,'RUNNING_TREND_HEALTHY','maintain_current_running_structure',runningConfidence,['running_trend','running_load']));
 candidates.push(candidate('consistency',20,'NO_HIGH_PRIORITY_RISK','continue_current_structure_and_collect_outcomes',Math.max(.25,stateConfidence,training.confidence,nutrition.confidence,adherence.confidence,runningConfidence),['longitudinal_evidence']));
 candidates.sort((a,b)=>b.priority-a.priority||b.confidence-a.confidence||a.domain.localeCompare(b.domain));
 const focus=candidates[0],confidenceInputs=[stateConfidence,runningConfidence,training.confidence,nutrition.confidence,adherence.confidence,outcome.confidence].filter(x=>x>0),confidence=round(confidenceInputs.length?confidenceInputs.reduce((a,b)=>a+b,0)/confidenceInputs.length:0,2);
 const evidenceCount=training.sampleSize+nutrition.sampleSize+adherence.sampleSize+outcome.sampleSize+(Number(running?.evidence?.validRuns)||0);
 const status=focus.priority>=90?'protect':focus.priority>=65?'adjust':evidenceCount<4?'collect_more_evidence':'continue';
 const weeklyKind=String(review?.nextAdjustment?.kind||'');
 return Object.freeze({
  version:VERSION,asOf:String(options.asOf||userState.asOf||running.asOf||''),status,confidence,
  focus:Object.freeze(focus),
  domains:Object.freeze({
   recovery:Object.freeze({readiness,fatigue,load,stateConfidence}),
   running:Object.freeze({confidence:runningConfidence,trend:String(running?.trend?.direction||'unknown'),loadBand:String(running?.load?.band||'unknown'),recommendation:String(running?.recommendation?.action||'')}),
   training:Object.freeze(training),nutrition:Object.freeze(nutrition),planning:Object.freeze(adherence),outcome:Object.freeze(outcome)
  }),
  longitudinal:Object.freeze({evidenceCount,weeklyAdjustment:weeklyKind||null,outcomeValue:outcome.value}),
  candidates:Object.freeze(candidates.slice(0,5).map(Object.freeze)),
  guardrails:Object.freeze({interpretationOnly:true,noSilentMutation:true,noAutomaticProgression:true,noMedicalClaim:true,lowConfidenceCannotEscalate:true})
 });
}
function compactForContext(v={}){
 return {version:String(v.version||VERSION),asOf:String(v.asOf||''),status:String(v.status||'collect_more_evidence'),confidence:finite(v.confidence)??0,focus:object(v.focus)?v.focus:null,domains:object(v.domains)?v.domains:{},longitudinal:object(v.longitudinal)?v.longitudinal:{},candidates:Array.isArray(v.candidates)?v.candidates.slice(0,5):[],guardrails:{interpretationOnly:true,noSilentMutation:true,noAutomaticProgression:true,noMedicalClaim:true,lowConfidenceCannotEscalate:true}};
}
return Object.freeze({VERSION,build,compactForContext,dim});
});
