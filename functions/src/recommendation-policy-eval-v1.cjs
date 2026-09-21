'use strict';

const VERSION='recommendation-policy-eval-v1.0.0';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const round=(v,d=3)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;};
function preferredScale(model){
 const band=String(model?.training?.preferredDurationBand||'');
 return band==='short'?.75:band==='medium'?.9:1;
}
function build(decisionInput={},responseModelInput={},options={}){
 const d=object(decisionInput)?decisionInput:{},r=object(responseModelInput)?responseModelInput:{},baseDuration=finite(d?.recommendation?.duration),baseIntensity=finite(d?.recommendation?.intensityScale),baseVolume=finite(d?.recommendation?.volumeScale);
 const responseConfidence=clamp(finite(r.confidence)??0,0,1),prefScale=responseConfidence>=.35?preferredScale(r):1;
 const raw=[
  {id:'base',durationScale:1,intensityScale:1,volumeScale:1},
  {id:'response_fit',durationScale:prefScale,intensityScale:1,volumeScale:Math.min(1,prefScale+.1)},
  {id:'conservative',durationScale:.75,intensityScale:.85,volumeScale:.8}
 ];
 const safetyMode=['caution','recover','reduce'].includes(String(d.mode||''));
 const candidates=raw.map(c=>{
  const duration=baseDuration===null?null:Math.round(baseDuration*c.durationScale),intensity=baseIntensity===null?null:round(baseIntensity*c.intensityScale,2),volume=baseVolume===null?null:round(baseVolume*c.volumeScale,2);
  const safety=safetyMode?(c.id==='base'?.55:c.id==='conservative'?1:.85):c.id==='conservative'?.92:1;
  const adherence=c.id==='response_fit'&&responseConfidence>=.35?.75+.25*responseConfidence:c.id==='conservative'?.72:.68;
  const goalAlignment=c.id==='base'?1:c.id==='response_fit'?.96:.85;
  const recoveryCost=(intensity??1)*(volume??1);
  const utility=round(safety*.35+adherence*.3+goalAlignment*.2+(1-clamp(recoveryCost/1.5,0,1))*.15);
  return Object.freeze({...c,duration,intensityScale:intensity,volumeScale:volume,score:utility,components:{safety:round(safety),adherence:round(adherence),goalAlignment:round(goalAlignment),recoveryCost:round(recoveryCost)}});
 });
 const selected=candidates.slice().sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))[0]||null;
 const safeSelected=selected?{...selected,intensityScale:baseIntensity===null?selected.intensityScale:Math.min(baseIntensity,selected.intensityScale??baseIntensity),volumeScale:baseVolume===null?selected.volumeScale:Math.min(baseVolume,selected.volumeScale??baseVolume),durationScale:Math.min(1,selected.durationScale)}:null;
 return Object.freeze({version:VERSION,decisionId:String(d.decisionId||''),decisionMode:String(d.mode||''),responseConfidence,candidates:Object.freeze(candidates),selected:safeSelected?Object.freeze(safeSelected):null,guardrails:Object.freeze({advisoryOnly:true,transparentScoring:true,neverExceedsDeterministicDecision:true,noAutomaticProgressionIncrease:true,noSilentMutation:true})});
}
function compactForContext(value={}){const v=object(value)?value:{};return {version:String(v.version||VERSION),decisionId:String(v.decisionId||''),decisionMode:String(v.decisionMode||''),responseConfidence:clamp(finite(v.responseConfidence)??0,0,1),selected:object(v.selected)?v.selected:null,candidates:Array.isArray(v.candidates)?v.candidates.slice(0,3):[],guardrails:{advisoryOnly:true,transparentScoring:true,neverExceedsDeterministicDecision:true,noAutomaticProgressionIncrease:true,noSilentMutation:true}};}
module.exports=Object.freeze({VERSION,build,compactForContext});