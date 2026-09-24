'use strict';
const VERSION='confidence-calibration-v1.0.0';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const list=v=>Array.isArray(v)?v.filter(object):[];
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const round=(v,d=4)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;};

function actualValue(v){
 if(v===true)return 1;
 if(v===false)return 0;
 const n=finite(v);
 return n===null?null:(n>=.5?1:0);
}
function normalizeSample(sample={}){
 const prediction=finite(sample.prediction??sample.probability??sample.confidence);
 const actual=actualValue(sample.actual??sample.positive??sample.outcome);
 const weight=Math.max(0,finite(sample.weight)??1);
 if(prediction===null||actual===null||weight<=0)return null;
 return {id:String(sample.id||''),date:String(sample.date||''),prediction:clamp(prediction,0,1),actual,weight};
}
function evaluate(input={},options={}){
 const samples=list(input?.samples||input).map(normalizeSample).filter(Boolean);
 const binCount=Math.max(4,Math.min(20,Math.round(finite(options.bins)??10)));
 const minSamples=Math.max(4,Math.round(finite(options.minSamples)??12));
 const bins=Array.from({length:binCount},(_,i)=>({index:i,min:i/binCount,max:(i+1)/binCount,count:0,weight:0,predictionSum:0,actualSum:0}));
 let totalWeight=0,brierSum=0,logLossSum=0,predictionSum=0,actualSum=0;
 for(const row of samples){
  const idx=Math.min(binCount-1,Math.floor(row.prediction*binCount)),bin=bins[idx],p=Math.min(1-1e-6,Math.max(1e-6,row.prediction));
  bin.count++;bin.weight+=row.weight;bin.predictionSum+=row.prediction*row.weight;bin.actualSum+=row.actual*row.weight;
  totalWeight+=row.weight;predictionSum+=row.prediction*row.weight;actualSum+=row.actual*row.weight;
  brierSum+=((row.prediction-row.actual)**2)*row.weight;
  logLossSum+=(-(row.actual*Math.log(p)+(1-row.actual)*Math.log(1-p)))*row.weight;
 }
 const populated=bins.filter(x=>x.weight>0).map(x=>{
  const meanPrediction=x.predictionSum/x.weight,observedRate=x.actualSum/x.weight,gap=Math.abs(meanPrediction-observedRate);
  return Object.freeze({index:x.index,min:round(x.min,3),max:round(x.max,3),count:x.count,weight:round(x.weight,3),meanPrediction:round(meanPrediction),observedRate:round(observedRate),gap:round(gap)});
 });
 const ece=totalWeight?populated.reduce((sum,x)=>sum+(x.weight/totalWeight)*x.gap,0):null;
 const mce=populated.length?Math.max(...populated.map(x=>x.gap)):null;
 const brier=totalWeight?brierSum/totalWeight:null,logLoss=totalWeight?logLossSum/totalWeight:null;
 const meanPrediction=totalWeight?predictionSum/totalWeight:null,observedRate=totalWeight?actualSum/totalWeight:null;
 const signedGap=meanPrediction===null||observedRate===null?null:meanPrediction-observedRate,alerts=[];
 if(samples.length>=minSamples&&ece!==null&&ece>.15)alerts.push('CALIBRATION_ERROR_HIGH');
 if(samples.length>=minSamples&&brier!==null&&brier>.25)alerts.push('BRIER_SCORE_HIGH');
 if(samples.length>=minSamples&&signedGap!==null&&signedGap>.12)alerts.push('SYSTEMATIC_OVERCONFIDENCE');
 if(samples.length>=minSamples&&signedGap!==null&&signedGap<-.12)alerts.push('SYSTEMATIC_UNDERCONFIDENCE');
 const status=samples.length<minSamples?'insufficient':(ece!==null&&ece<=.08&&brier!==null&&brier<=.18)?'strong':(ece!==null&&ece<=.15&&brier!==null&&brier<=.25)?'usable':'weak';
 return Object.freeze({version:VERSION,status,sampleSize:samples.length,totalWeight:round(totalWeight,3),binCount,ece:ece===null?null:round(ece),mce:mce===null?null:round(mce),brier:brier===null?null:round(brier),logLoss:logLoss===null?null:round(logLoss),meanPrediction:meanPrediction===null?null:round(meanPrediction),observedRate:observedRate===null?null:round(observedRate),signedGap:signedGap===null?null:round(signedGap),bins:Object.freeze(populated),alerts:Object.freeze(alerts),guardrails:Object.freeze({evaluationOnly:true,holdoutPreferred:true,noCausalClaim:true,noProductionMutation:true,noConfidencePromotionWithoutEvidence:true})});
}
function compactForContext(v={}){
 return {version:String(v.version||VERSION),status:String(v.status||'insufficient'),sampleSize:Number(v.sampleSize)||0,ece:finite(v.ece),mce:finite(v.mce),brier:finite(v.brier),meanPrediction:finite(v.meanPrediction),observedRate:finite(v.observedRate),signedGap:finite(v.signedGap),alerts:Array.isArray(v.alerts)?v.alerts.slice(0,8):[],guardrails:{evaluationOnly:true,holdoutPreferred:true,noCausalClaim:true,noProductionMutation:true,noConfidencePromotionWithoutEvidence:true}};
}
module.exports=Object.freeze({VERSION,evaluate,normalizeSample,compactForContext});
