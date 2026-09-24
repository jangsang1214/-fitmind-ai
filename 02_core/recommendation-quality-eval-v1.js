(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.GarangRecommendationQualityEvalV1=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='recommendation-quality-eval-v1.1.0';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),list=v=>Array.isArray(v)?v:[],finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null,clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0)),round=(v,d=3)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;};
function measuredCalibration(calibration){
 if(!object(calibration)||(Number(calibration.sampleSize)||0)<4)return null;
 const ece=finite(calibration.ece),brier=finite(calibration.brier),status=String(calibration.status||'');
 if(ece===null&&brier===null)return null;
 const eceScore=ece===null?.5:clamp(1-ece/.25,0,1),brierScore=brier===null?.5:clamp(1-brier/.3,0,1),statusScore=status==='strong'?1:status==='usable'?.8:status==='weak'?.3:.45;
 return round(eceScore*.45+brierScore*.4+statusScore*.15);
}
function heuristicCalibration(offline,quality,policy){return clamp((offline.status==='diagnostic_ready'?0.35:0.1)+(Number(offline.guardrailViolations||0)===0?0.25:0)+(quality.status==='strong'?0.25:quality.status==='usable'?0.15:0.05)+(policy?.guardrails?.confidenceCalibrated===true?0.15:0),0,1);}
function build(input={}){
 const decision=object(input.decision)?input.decision:{},response=object(input.responseModel)?input.responseModel:{},policy=object(input.policy)?input.policy:{},offline=object(input.offlineEvaluation)?input.offlineEvaluation:{},workout=object(input.workoutPrescription)?input.workoutPrescription:{},nutrition=object(input.adaptiveNutrition)?input.adaptiveNutrition:{},quality=object(input.dataQuality)?input.dataQuality:{},confidenceCalibration=object(input.confidenceCalibration)?input.confidenceCalibration:null;
 const selected=object(policy.selected)?policy.selected:null,base=list(policy.candidates).find(x=>x?.id==='base')||null;
 const safeCandidate=!selected||!base||((finite(selected.durationScale)??1)<=1&&(finite(selected.intensityScale)===null||finite(base.intensityScale)===null||selected.intensityScale<=base.intensityScale)&&(finite(selected.volumeScale)===null||finite(base.volumeScale)===null||selected.volumeScale<=base.volumeScale));
 const safety=clamp((policy?.guardrails?.neverExceedsDeterministicDecision===true?0.35:0)+(workout?.guardrails?.neverAutoIncrease===true?0.2:0)+(nutrition?.guardrails?.noAutomaticTargetMutation===true?0.2:0)+(Number(offline?.guardrailViolations||0)===0?0.15:0)+(safeCandidate?0.1:0),0,1);
 const personalization=clamp((finite(response.confidence)??0)*.55+(finite(selected?.evidenceConfidence)??0)*.3+(finite(quality.score)??0)*.15,0,1);
 const actionability=clamp((decision?.recommendation?.duration!==undefined?0.2:0)+(selected?.id?0.2:0)+(list(workout?.exercises).some(x=>x?.prescription?.recommended)?0.3:0)+(nutrition?.recommendation?.targetProposal?.proposedDailyKcal?0.3:0),0,1);
 const measured=measuredCalibration(confidenceCalibration),calibration=measured===null?heuristicCalibration(offline,quality,policy):measured;
 const overall=round(safety*.35+personalization*.25+actionability*.2+calibration*.2),alerts=[];
 if(!safeCandidate||Number(offline?.guardrailViolations||0)>0)alerts.push('POLICY_GUARDRAIL_RISK');
 if((finite(quality.score)??0)<.45)alerts.push('LONGITUDINAL_EVIDENCE_SPARSE');
 if((finite(response.confidence)??0)<.35)alerts.push('PERSONALIZATION_CONFIDENCE_LOW');
 if(!list(workout?.exercises).length&&!nutrition?.estimate?.eligible)alerts.push('ACTIONABLE_ADAPTATION_EVIDENCE_LOW');
 if(confidenceCalibration&&String(confidenceCalibration.status)==='weak')alerts.push('CONFIDENCE_CALIBRATION_WEAK');
 for(const code of list(confidenceCalibration?.alerts).slice(0,4))if(!alerts.includes(code))alerts.push(String(code));
 const status=alerts.includes('POLICY_GUARDRAIL_RISK')?'blocked':overall>=.75?'ready':overall>=.5?'guarded':'collect_more_evidence';
 return Object.freeze({version:VERSION,status,overall,components:Object.freeze({safety:round(safety),personalization:round(personalization),actionability:round(actionability),calibration:round(calibration)}),alerts:Object.freeze(alerts),evidence:Object.freeze({responseSampleSize:Number(response.sampleSize)||0,responseConfidence:finite(response.confidence)??0,dataQualityStatus:String(quality.status||'insufficient'),offlineStatus:String(offline.status||'insufficient_history'),offlineEvaluatedEpisodes:Number(offline.evaluatedEpisodes)||0,calibrationStatus:String(confidenceCalibration?.status||'not_measured'),calibrationSampleSize:Number(confidenceCalibration?.sampleSize)||0,calibrationEce:finite(confidenceCalibration?.ece),calibrationBrier:finite(confidenceCalibration?.brier),calibrationSource:measured===null?'heuristic_fallback':'chronological_replay'}),guardrails:Object.freeze({evaluationOnly:true,noRecommendationMutation:true,noCausalClaim:true,lowEvidenceCannotBecomeHighConfidence:true,measuredCalibrationPreferred:true})});
}
function compactForContext(v={}){return {version:String(v.version||VERSION),status:String(v.status||'collect_more_evidence'),overall:finite(v.overall)??0,components:object(v.components)?v.components:{},alerts:list(v.alerts).slice(0,8),evidence:object(v.evidence)?v.evidence:{},guardrails:{evaluationOnly:true,noRecommendationMutation:true,noCausalClaim:true,lowEvidenceCannotBecomeHighConfidence:true,measuredCalibrationPreferred:true}};}
return Object.freeze({VERSION,build,compactForContext,measuredCalibration});

});
