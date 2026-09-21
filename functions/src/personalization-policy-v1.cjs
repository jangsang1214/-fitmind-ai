'use strict';

const VERSION='personalization-policy-v1.0.0';
const DEFAULT_MIN_CONFIDENCE=0.5;
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const list=value=>Array.isArray(value)?value:[];
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const round=(value,digits=2)=>{const p=10**digits;return Math.round(Number(value)*p)/p;};

function trustedDimension(model,name,minConfidence=DEFAULT_MIN_CONFIDENCE){
 const row=object(model?.dimensions?.[name])?model.dimensions[name]:null;
 const value=finite(row?.value),confidence=finite(row?.confidence);
 if(!row||value===null||confidence===null||confidence<minConfidence)return null;
 return {name,value,confidence:clamp(confidence,0,1),sampleSize:Math.max(0,Number(row.sampleSize)||0),evidenceIds:list(row.evidenceIds).map(String).filter(Boolean)};
}
function build(modelInput={},outcomeInput={},options={}){
 const minConfidence=clamp(finite(options.minConfidence)??DEFAULT_MIN_CONFIDENCE,0,1),responseModel=object(options.responseModel)?options.responseModel:{},candidatePolicy=object(options.candidatePolicy)?options.candidatePolicy:{};
 const reasons=[],evidenceIds=[],confidences=[];
 let durationScale=1,intensityCap=1,volumeCap=1,presentation='standard',planComplexity='standard',suppressProgression=false;
 const use=(row,reason)=>{
  if(!row)return;
  reasons.push(reason);confidences.push(row.confidence);
  for(const id of row.evidenceIds)evidenceIds.push(id);
 };
 const adherence=trustedDimension(modelInput,'planAdherence',minConfidence);
 if(adherence&&adherence.value<60){
  durationScale=Math.min(durationScale,.8);volumeCap=Math.min(volumeCap,.9);planComplexity='simplified';use(adherence,'PERSONALIZATION_LOW_ADHERENCE');
 }
 const responsiveness=trustedDimension(modelInput,'recommendationResponsiveness',minConfidence);
 if(responsiveness&&responsiveness.value<50){
  presentation='single_action';planComplexity='simplified';use(responsiveness,'PERSONALIZATION_LOW_RESPONSE');
 }
 const recovery=trustedDimension(modelInput,'recoveryStability',minConfidence);
 if(recovery&&recovery.value<55){
  intensityCap=Math.min(intensityCap,.85);volumeCap=Math.min(volumeCap,.85);suppressProgression=true;use(recovery,'PERSONALIZATION_RECOVERY_INSTABILITY');
 }
 const attributed=trustedDimension(modelInput,'attributedOutcomeScore',minConfidence);
 if(attributed&&attributed.value<55){
  intensityCap=Math.min(intensityCap,.9);volumeCap=Math.min(volumeCap,.9);suppressProgression=true;use(attributed,'PERSONALIZATION_LOW_ATTRIBUTED_OUTCOME');
 }
 const support=object(outcomeInput?.decisionSupport)?outcomeInput.decisionSupport:{};
 if(support.preferReducedLoad===true){
  intensityCap=Math.min(intensityCap,.85);volumeCap=Math.min(volumeCap,.85);suppressProgression=true;reasons.push('PERSONALIZATION_OUTCOME_RECOVERY_CONSTRAINT');
 }
 if(support.suppressProgression===true){
  suppressProgression=true;reasons.push('PERSONALIZATION_OUTCOME_EXECUTION_GAP');
 }
 const responseConfidence=clamp(finite(responseModel.confidence)??0,0,1),selected=object(candidatePolicy.selected)?candidatePolicy.selected:null;
 if(responseConfidence>=.35&&selected){
  const scale=finite(selected.durationScale),candidateIntensity=finite(selected.intensityScale),candidateVolume=finite(selected.volumeScale);
  if(scale!==null&&scale<1){durationScale=Math.min(durationScale,scale);reasons.push('PERSONALIZATION_RESPONSE_DURATION_FIT');confidences.push(responseConfidence);}
  if(candidateIntensity!==null&&candidateIntensity<1){intensityCap=Math.min(intensityCap,candidateIntensity);reasons.push('PERSONALIZATION_RESPONSE_INTENSITY_CONSTRAINT');confidences.push(responseConfidence);}
  if(candidateVolume!==null&&candidateVolume<1){volumeCap=Math.min(volumeCap,candidateVolume);reasons.push('PERSONALIZATION_RESPONSE_VOLUME_CONSTRAINT');confidences.push(responseConfidence);}
 }
 const active=reasons.length>0;
 const confidence=active?round(confidences.length?confidences.reduce((a,b)=>a+b,0)/confidences.length:clamp(finite(outcomeInput?.longitudinal?.confidence)??finite(outcomeInput?.confidence)??0,0,1)):0;
 return Object.freeze({
  version:VERSION,
  active,
  confidence,
  reasonCodes:Object.freeze([...new Set(reasons)].slice(0,8)),
  evidenceIds:Object.freeze([...new Set(evidenceIds)].slice(0,24)),
  adjustments:Object.freeze({
   durationScale:round(clamp(durationScale,.6,1)),
   intensityCap:round(clamp(intensityCap,.6,1)),
   volumeCap:round(clamp(volumeCap,.6,1)),
   presentation,
   planComplexity,
   suppressProgression
  }),
  guardrails:Object.freeze({
   deterministic:true,
   evidenceGated:true,
   canConstrainOnly:true,
   noAutomaticProgressionIncrease:true,
   noSilentDataMutation:true,
   llmCannotOverride:true,
   responseLearningCanConstrainOnly:true
  })
 });
}
function compactForContext(policyInput={}){
 const policy=object(policyInput)?policyInput:{};
 return {
  version:String(policy.version||VERSION),
  active:policy.active===true,
  confidence:clamp(finite(policy.confidence)??0,0,1),
  reasonCodes:list(policy.reasonCodes).map(String).filter(Boolean).slice(0,8),
  evidenceIds:list(policy.evidenceIds).map(String).filter(Boolean).slice(0,24),
  adjustments:{
   durationScale:clamp(finite(policy?.adjustments?.durationScale)??1,.6,1),
   intensityCap:clamp(finite(policy?.adjustments?.intensityCap)??1,.6,1),
   volumeCap:clamp(finite(policy?.adjustments?.volumeCap)??1,.6,1),
   presentation:String(policy?.adjustments?.presentation||'standard'),
   planComplexity:String(policy?.adjustments?.planComplexity||'standard'),
   suppressProgression:policy?.adjustments?.suppressProgression===true
  },
  guardrails:{deterministic:true,evidenceGated:true,canConstrainOnly:true,noAutomaticProgressionIncrease:true,noSilentDataMutation:true,llmCannotOverride:true,responseLearningCanConstrainOnly:true}
 };
}
module.exports=Object.freeze({VERSION,DEFAULT_MIN_CONFIDENCE,trustedDimension,build,compactForContext});
