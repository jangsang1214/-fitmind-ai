(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.GarangWorkoutPrescriptionShadowV1=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='workout-prescription-shadow-v1.0.0';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),list=v=>Array.isArray(v)?v.filter(object):[],finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null,clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0)),round=(v,d=2)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;};
function dateKey(v){return String(v||'').slice(0,10);}
function latestCheckin(state){return [...list(state?.dailyCheckins),...list(state?.checkins)].filter(x=>x?.date).sort((a,b)=>String(a.date).localeCompare(String(b.date))).at(-1)||null;}
function setRows(record){return list(record?.setDetails||record?.setsDetail);}
function dose(record={}){
 const details=setRows(record),sets=details.length||Math.max(1,Math.round(finite(record.sets)??1)),reps=details.length?Math.round(details.reduce((a,b)=>a+(finite(b.reps)??0),0)/details.length):Math.round(finite(record.reps)??0),weight=details.length?details.map(x=>finite(x.weight)).filter(x=>x!==null).reduce((a,b)=>a+b,0)/Math.max(1,details.map(x=>finite(x.weight)).filter(x=>x!==null).length):(finite(record.weight)??0),rpe=details.length?details.map(x=>finite(x.rpe)).filter(x=>x!==null).reduce((a,b)=>a+b,0)/Math.max(1,details.map(x=>finite(x.rpe)).filter(x=>x!==null).length):(finite(record.rpe)??null);
 return {sets,reps,weight:round(weight,1),rpe:rpe===null?null:round(rpe,1),volume:round(Math.max(0,sets*reps*weight),1)};
}
function recoveryConstraint(state){const c=latestCheckin(state);if(!c)return {active:false,reasons:[]};const reasons=[],sleep=finite(c.sleepHours??c.sleep),energy=finite(c.energy??c.energyLevel),stress=finite(c.stress??c.stressLevel),soreness=object(c.soreness)?Math.max(...Object.values(c.soreness).map(finite).filter(x=>x!==null),0):finite(c.soreness??c.muscleSoreness);if(sleep!==null&&sleep<6)reasons.push('SHORT_SLEEP');if(energy!==null&&energy<=2)reasons.push('LOW_ENERGY');if(stress!==null&&stress>=4)reasons.push('HIGH_STRESS');if(soreness!==null&&soreness>=4)reasons.push('HIGH_SORENESS');return {active:reasons.length>0,reasons};}
function build(stateInput={},options={}){
 const state=object(stateInput)?stateInput:{},groups=new Map(),cutoff=String(options.asOf||new Date().toISOString().slice(0,10)),recovery=recoveryConstraint(state);
 for(const row of list(state.workouts)){const name=String(row?.name||row?.exercise||'').trim();if(!name||dateKey(row.date)>cutoff)continue;if(!groups.has(name))groups.set(name,[]);groups.get(name).push(row);}
 const exercises=[];
 for(const [name,rows] of groups){const history=rows.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-6),latest=history.at(-1),latestDose=dose(latest),rpes=history.map(x=>dose(x).rpe).filter(x=>x!==null),avgRpe=rpes.length?round(rpes.reduce((a,b)=>a+b,0)/rpes.length,1):null,volumes=history.map(x=>dose(x).volume).filter(Number.isFinite),latestVolume=volumes.at(-1)??null,priorVolume=volumes.length>1?volumes.slice(0,-1).reduce((a,b)=>a+b,0)/(volumes.length-1):null;
  let action='collect_data',reason='INSUFFICIENT_EXERCISE_HISTORY',progressionEligibleForReview=false,suggested={...latestDose};
  if(history.length>=2){action='hold';reason='STABLE_OBSERVED_DOSE';}
  if(recovery.active&&history.length>=2){action='reduce';reason='RECOVERY_CONSTRAINT';suggested={...latestDose,sets:Math.max(1,latestDose.sets-1),weight:round(latestDose.weight*.95,1),volume:round(Math.max(0,Math.max(1,latestDose.sets-1)*latestDose.reps*latestDose.weight*.95),1)};}
  else if(history.length>=2&&(latestDose.rpe!==null&&latestDose.rpe>=9||avgRpe!==null&&avgRpe>=8.7)){action='reduce';reason='HIGH_OBSERVED_RPE';suggested={...latestDose,sets:Math.max(1,latestDose.sets-1),weight:round(latestDose.weight*.95,1),volume:round(Math.max(0,Math.max(1,latestDose.sets-1)*latestDose.reps*latestDose.weight*.95),1)};}
  else if(history.length>=3&&avgRpe!==null&&avgRpe<=7.5&&latestVolume!==null&&priorVolume!==null&&latestVolume>=priorVolume*.95){action='review_progression';reason='CONSISTENT_LOW_TO_MODERATE_RPE';progressionEligibleForReview=true;suggested={...latestDose};}
  exercises.push({exercise:name,sampleSize:history.length,lastDate:dateKey(latest?.date),observed:{latest:latestDose,averageRpe:avgRpe,latestVsPriorVolume:latestVolume!==null&&priorVolume?round(latestVolume/priorVolume,2):null},shadow:{action,reason,suggested,progressionEligibleForReview}});
 }
 exercises.sort((a,b)=>String(b.lastDate).localeCompare(String(a.lastDate))||b.sampleSize-a.sampleSize);
 const confidence=round(clamp(exercises.filter(x=>x.sampleSize>=3).length/4,0,1),2);
 return Object.freeze({version:VERSION,asOf:cutoff,confidence,recoveryConstraint:recovery,exercises:Object.freeze(exercises.slice(0,12)),guardrails:Object.freeze({shadowOnly:true,observationalOnly:true,neverAutoIncrease:true,noStateMutation:true,progressionRequiresReviewedEvidence:true})});
}
function compactForContext(v={}){return {version:String(v.version||VERSION),asOf:String(v.asOf||''),confidence:finite(v.confidence)??0,recoveryConstraint:object(v.recoveryConstraint)?v.recoveryConstraint:{active:false,reasons:[]},exercises:list(v.exercises).slice(0,8),guardrails:{shadowOnly:true,observationalOnly:true,neverAutoIncrease:true,noStateMutation:true,progressionRequiresReviewedEvidence:true}};}
return Object.freeze({VERSION,build,compactForContext,dose,recoveryConstraint});

});
