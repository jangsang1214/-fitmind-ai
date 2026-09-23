'use strict';
const VERSION='workout-prescription-shadow-v1.1.0';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),list=v=>Array.isArray(v)?v.filter(object):[],finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null,clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0)),round=(v,d=2)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;};
function dateKey(v){return String(v||'').slice(0,10);}
function latestCheckin(state){return [...list(state?.dailyCheckins),...list(state?.checkins)].filter(x=>x?.date).sort((a,b)=>String(a.date).localeCompare(String(b.date))).at(-1)||null;}
function setRows(record){return list(record?.setDetails||record?.setsDetail);}
function dose(record={}){
 const details=setRows(record),sets=details.length||Math.max(1,Math.round(finite(record.sets)??1)),reps=details.length?Math.round(details.reduce((a,b)=>a+(finite(b.reps)??0),0)/details.length):Math.round(finite(record.reps)??0),weights=details.map(x=>finite(x.weight)).filter(x=>x!==null),weight=details.length?(weights.length?weights.reduce((a,b)=>a+b,0)/weights.length:0):(finite(record.weight)??0),rpes=details.map(x=>finite(x.rpe)).filter(x=>x!==null),rpe=details.length?(rpes.length?rpes.reduce((a,b)=>a+b,0)/rpes.length:null):(finite(record.rpe)??null);
 return {sets,reps,weight:round(weight,1),rpe:rpe===null?null:round(rpe,1),volume:round(Math.max(0,sets*reps*weight),1)};
}
function recoveryConstraint(state){const c=latestCheckin(state);if(!c)return {active:false,reasons:[]};const reasons=[],sleep=finite(c.sleepHours??c.sleep),energy=finite(c.energy??c.energyLevel),stress=finite(c.stress??c.stressLevel),soreness=object(c.soreness)?Math.max(...Object.values(c.soreness).map(finite).filter(x=>x!==null),0):finite(c.soreness??c.muscleSoreness);if(sleep!==null&&sleep<6)reasons.push('SHORT_SLEEP');if(energy!==null&&energy<=2)reasons.push('LOW_ENERGY');if(stress!==null&&stress>=4)reasons.push('HIGH_STRESS');if(soreness!==null&&soreness>=4)reasons.push('HIGH_SORENESS');return {active:reasons.length>0,reasons};}
function roundLoad(v){const n=Math.max(0,finite(v)??0);return round(Math.round(n*2)/2,1);}
function exactDose(latestDose,action){
 const base={sets:latestDose.sets,reps:latestDose.reps,weight:latestDose.weight,targetRpe:latestDose.rpe??7.5,restSec:90};
 if(action==='reduce'){
  const sets=Math.max(1,base.sets-1),weight=base.weight>0?roundLoad(base.weight*.95):0;
  return {...base,sets,weight,targetRpe:Math.min(7,base.targetRpe),restSec:Math.max(90,base.restSec),volume:round(sets*base.reps*weight,1)};
 }
 if(action==='review_progression'){
  if(base.weight>0){const step=Math.max(.5,roundLoad(base.weight*.025));const weight=roundLoad(base.weight+step);return {...base,weight,targetRpe:Math.max(7,Math.min(8,base.targetRpe+.3)),restSec:Math.max(90,base.restSec),volume:round(base.sets*base.reps*weight,1)};}
  const reps=Math.max(base.reps+1,base.reps);return {...base,reps,targetRpe:Math.max(7,Math.min(8,base.targetRpe+.3)),volume:0};
 }
 return {...base,volume:round(base.sets*base.reps*base.weight,1)};
}
function build(stateInput={},options={}){
 const state=object(stateInput)?stateInput:{},groups=new Map(),cutoff=String(options.asOf||new Date().toISOString().slice(0,10)),recovery=recoveryConstraint(state);
 for(const row of list(state.workouts)){const name=String(row?.name||row?.exercise||'').trim();if(!name||dateKey(row.date)>cutoff)continue;if(!groups.has(name))groups.set(name,[]);groups.get(name).push(row);}
 const exercises=[];
 for(const [name,rows] of groups){const history=rows.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-6),latest=history.at(-1),latestDose=dose(latest),rpes=history.map(x=>dose(x).rpe).filter(x=>x!==null),avgRpe=rpes.length?round(rpes.reduce((a,b)=>a+b,0)/rpes.length,1):null,volumes=history.map(x=>dose(x).volume).filter(Number.isFinite),latestVolume=volumes.at(-1)??null,priorVolume=volumes.length>1?volumes.slice(0,-1).reduce((a,b)=>a+b,0)/(volumes.length-1):null;
  let action='collect_data',reason='INSUFFICIENT_EXERCISE_HISTORY',progressionEligibleForReview=false;
  if(history.length>=2){action='hold';reason='STABLE_OBSERVED_DOSE';}
  if(recovery.active&&history.length>=2){action='reduce';reason='RECOVERY_CONSTRAINT';}
  else if(history.length>=2&&(latestDose.rpe!==null&&latestDose.rpe>=9||avgRpe!==null&&avgRpe>=8.7)){action='reduce';reason='HIGH_OBSERVED_RPE';}
  else if(history.length>=3&&avgRpe!==null&&avgRpe<=7.5&&latestVolume!==null&&priorVolume!==null&&latestVolume>=priorVolume*.95){action='review_progression';reason='CONSISTENT_LOW_TO_MODERATE_RPE';progressionEligibleForReview=true;}
  const recommended=exactDose(latestDose,action),confidence=round(clamp(history.length/6*.55+(rpes.length/Math.max(1,history.length))*.25+(recovery.active?.1:.2),0,1),2),delta={sets:recommended.sets-latestDose.sets,reps:recommended.reps-latestDose.reps,weight:round(recommended.weight-latestDose.weight,1),volumePct:latestDose.volume>0?round((recommended.volume-latestDose.volume)/latestDose.volume*100,1):null};
  exercises.push({exercise:name,sampleSize:history.length,lastDate:dateKey(latest?.date),observed:{latest:latestDose,averageRpe:avgRpe,latestVsPriorVolume:latestVolume!==null&&priorVolume?round(latestVolume/priorVolume,2):null},prescription:{action,reason,recommended,delta,confidence,requiresConfirmation:action==='review_progression',progressionEligibleForReview}});
 }
 exercises.sort((a,b)=>String(b.lastDate).localeCompare(String(a.lastDate))||b.sampleSize-a.sampleSize);
 const confidence=round(clamp(exercises.filter(x=>x.sampleSize>=3).length/4,0,1),2);
 return Object.freeze({version:VERSION,asOf:cutoff,confidence,recoveryConstraint:recovery,exercises:Object.freeze(exercises.slice(0,12)),guardrails:Object.freeze({advisoryOnly:true,observationalOnly:true,exactDoseProposal:true,neverAutoIncrease:true,noStateMutation:true,progressionRequiresConfirmation:true})});
}
function compactForContext(v={}){return {version:String(v.version||VERSION),asOf:String(v.asOf||''),confidence:finite(v.confidence)??0,recoveryConstraint:object(v.recoveryConstraint)?v.recoveryConstraint:{active:false,reasons:[]},exercises:list(v.exercises).slice(0,8),guardrails:{advisoryOnly:true,observationalOnly:true,exactDoseProposal:true,neverAutoIncrease:true,noStateMutation:true,progressionRequiresConfirmation:true}};}
module.exports=Object.freeze({VERSION,build,compactForContext,dose,recoveryConstraint,exactDose});
