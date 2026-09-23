(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.GarangWorkoutPrescriptionShadowV1=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='workout-prescription-shadow-v1.2.0';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),list=v=>Array.isArray(v)?v.filter(object):[],finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null,clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0)),round=(v,d=2)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;},mean=v=>{const a=v.filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null;};
function dateKey(v){return String(v||'').slice(0,10);}
function latestCheckin(state){return [...list(state?.dailyCheckins),...list(state?.checkins)].filter(x=>x?.date).sort((a,b)=>String(a.date).localeCompare(String(b.date))).at(-1)||null;}
function setRows(record){return list(record?.setDetails||record?.setsDetail);}
function e1rm(weight,reps){const w=finite(weight),r=finite(reps);return w!==null&&w>0&&r!==null&&r>0?round(w*(1+r/30),1):null;}
function dose(record={}){
 const details=setRows(record),sets=details.length||Math.max(1,Math.round(finite(record.sets)??1)),reps=details.length?Math.round(details.reduce((a,b)=>a+(finite(b.reps)??0),0)/details.length):Math.round(finite(record.reps)??0),weights=details.map(x=>finite(x.weight)).filter(x=>x!==null),weight=details.length?(weights.length?mean(weights):0):(finite(record.weight)??0),rpes=details.map(x=>finite(x.rpe)).filter(x=>x!==null),rirs=details.map(x=>finite(x.rir)).filter(x=>x!==null),rpe=details.length?(rpes.length?mean(rpes):null):(finite(record.rpe)??null),rir=details.length?(rirs.length?mean(rirs):null):(finite(record.rir)??null),failure=details.some(x=>String(x?.setType||x?.type||'').toLowerCase()==='failure'||x?.failure===true)||(record.failure===true);
 const e1rms=details.length?details.map(x=>e1rm(x.weight,x.reps)).filter(x=>x!==null):[e1rm(weight,reps)].filter(x=>x!==null);
 return {sets,reps,weight:round(weight,1),rpe:rpe===null?null:round(rpe,1),rir:rir===null?null:round(rir,1),failure,e1rm:e1rms.length?Math.max(...e1rms):null,volume:round(Math.max(0,sets*reps*weight),1)};
}
function recoveryConstraint(state){const c=latestCheckin(state);if(!c)return {active:false,reasons:[]};const reasons=[],sleep=finite(c.sleepHours??c.sleep),energy=finite(c.energy??c.energyLevel),stress=finite(c.stress??c.stressLevel),soreness=object(c.soreness)?Math.max(...Object.values(c.soreness).map(finite).filter(x=>x!==null),0):finite(c.soreness??c.muscleSoreness);if(sleep!==null&&sleep<6)reasons.push('SHORT_SLEEP');if(energy!==null&&energy<=2)reasons.push('LOW_ENERGY');if(stress!==null&&stress>=4)reasons.push('HIGH_STRESS');if(soreness!==null&&soreness>=4)reasons.push('HIGH_SORENESS');return {active:reasons.length>0,reasons};}
function roundLoad(v){const n=Math.max(0,finite(v)??0);return round(Math.round(n*2)/2,1);}
function trend(history,key){const vals=history.map(x=>dose(x)[key]).filter(v=>v!==null&&Number.isFinite(v));if(vals.length<2)return null;const recent=vals.at(-1),prior=mean(vals.slice(0,-1));return prior&&prior>0?round(recent/prior,3):null;}
function exactDose(latestDose,action){
 const base={sets:latestDose.sets,reps:latestDose.reps,weight:latestDose.weight,targetRpe:latestDose.rpe??7.5,targetRir:latestDose.rir??2,restSec:90};
 if(action==='reduce'){const sets=Math.max(1,base.sets-(latestDose.failure?1:0)),weight=base.weight>0?roundLoad(base.weight*(latestDose.failure?.92:.95)):0,reps=Math.max(1,base.reps-(latestDose.failure?1:0));return {...base,sets,reps,weight,targetRpe:Math.min(7,base.targetRpe),targetRir:Math.max(2,base.targetRir),restSec:120,volume:round(sets*reps*weight,1)};}
 if(action==='review_progression'){if(base.weight>0){const step=clamp(roundLoad(base.weight*.025),.5,Math.max(.5,base.weight*.05)),weight=roundLoad(base.weight+step);return {...base,weight,targetRpe:Math.max(7,Math.min(8,base.targetRpe+.3)),targetRir:Math.max(1.5,Math.min(3,base.targetRir)),restSec:120,volume:round(base.sets*base.reps*weight,1)};}const reps=base.reps+1;return {...base,reps,targetRpe:Math.max(7,Math.min(8,base.targetRpe+.3)),targetRir:Math.max(1.5,Math.min(3,base.targetRir)),volume:0};}
 return {...base,volume:round(base.sets*base.reps*base.weight,1)};
}
function build(stateInput={},options={}){
 const state=object(stateInput)?stateInput:{},groups=new Map(),cutoff=String(options.asOf||new Date().toISOString().slice(0,10)),recovery=recoveryConstraint(state);
 for(const row of list(state.workouts)){const name=String(row?.name||row?.exercise||'').trim();if(!name||dateKey(row.date)>cutoff)continue;if(!groups.has(name))groups.set(name,[]);groups.get(name).push(row);}
 const exercises=[];
 for(const [name,rows] of groups){
  const history=rows.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-8),latest=history.at(-1),latestDose=dose(latest),doses=history.map(dose),rpes=doses.map(x=>x.rpe).filter(x=>x!==null),rirs=doses.map(x=>x.rir).filter(x=>x!==null),avgRpe=mean(rpes),avgRir=mean(rirs),e1rmTrend=trend(history,'e1rm'),volumeTrend=trend(history,'volume'),failureRate=history.length?round(doses.filter(x=>x.failure).length/history.length,3):0;
  let action='collect_data',reason='INSUFFICIENT_EXERCISE_HISTORY',progressionEligibleForReview=false;
  if(history.length>=2){action='hold';reason='STABLE_OBSERVED_DOSE';}
  if(recovery.active&&history.length>=2){action='reduce';reason='RECOVERY_CONSTRAINT';}
  else if(latestDose.failure||failureRate>=.34){action='reduce';reason='FAILURE_SET_SIGNAL';}
  else if(history.length>=2&&(latestDose.rpe!==null&&latestDose.rpe>=9||avgRpe!==null&&avgRpe>=8.7||latestDose.rir!==null&&latestDose.rir<=.5)){action='reduce';reason='HIGH_EFFORT_SIGNAL';}
  else if(history.length>=3&&!latestDose.failure&&(avgRir!==null?avgRir>=1.5:avgRpe!==null&&avgRpe<=7.8)&&(e1rmTrend===null||e1rmTrend>=.98)&&(volumeTrend===null||volumeTrend>=.95)){action='review_progression';reason='STABLE_PERFORMANCE_WITH_RESERVE';progressionEligibleForReview=true;}
  const recommended=exactDose(latestDose,action),signalCoverage=clamp((history.length/6*.35)+(rpes.length/history.length*.2)+(rirs.length/history.length*.2)+(doses.filter(x=>x.e1rm!==null).length/history.length*.15)+(.1),0,1),confidence=round(signalCoverage*(recovery.active?.9:1),2),delta={sets:recommended.sets-latestDose.sets,reps:recommended.reps-latestDose.reps,weight:round(recommended.weight-latestDose.weight,1),volumePct:latestDose.volume>0?round((recommended.volume-latestDose.volume)/latestDose.volume*100,1):null};
  exercises.push({exercise:name,sampleSize:history.length,lastDate:dateKey(latest?.date),observed:{latest:latestDose,averageRpe:avgRpe===null?null:round(avgRpe,1),averageRir:avgRir===null?null:round(avgRir,1),failureRate,e1rmTrend,volumeTrend},prescription:{action,reason,recommended,delta,confidence,requiresConfirmation:action==='review_progression',progressionEligibleForReview}});
 }
 exercises.sort((a,b)=>String(b.lastDate).localeCompare(String(a.lastDate))||b.sampleSize-a.sampleSize);
 const confidence=round(clamp(mean(exercises.filter(x=>x.sampleSize>=2).map(x=>x.prescription.confidence))??0,0,1),2);
 return Object.freeze({version:VERSION,asOf:cutoff,confidence,recoveryConstraint:recovery,exercises:Object.freeze(exercises.slice(0,12)),guardrails:Object.freeze({advisoryOnly:true,observationalOnly:true,exactDoseProposal:true,e1rmTrendAware:true,rirRpeAware:true,failureAware:true,neverAutoIncrease:true,noStateMutation:true,progressionRequiresConfirmation:true})});
}
function compactForContext(v={}){return {version:String(v.version||VERSION),asOf:String(v.asOf||''),confidence:finite(v.confidence)??0,recoveryConstraint:object(v.recoveryConstraint)?v.recoveryConstraint:{active:false,reasons:[]},exercises:list(v.exercises).slice(0,8),guardrails:{advisoryOnly:true,observationalOnly:true,exactDoseProposal:true,e1rmTrendAware:true,rirRpeAware:true,failureAware:true,neverAutoIncrease:true,noStateMutation:true,progressionRequiresConfirmation:true}};}
return Object.freeze({VERSION,build,compactForContext,dose,recoveryConstraint,exactDose,e1rm,trend});
});
