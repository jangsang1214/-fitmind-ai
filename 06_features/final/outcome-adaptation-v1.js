/* GARANG Outcome Adaptation v1
   Read-only interpretation layer: Daily Plan intent -> actual evidence -> bounded next-plan recommendation.
   This module never writes state. Coach remains the approval owner for behavior-changing changes.
*/
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangOutcomeAdaptationV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const list=value=>Array.isArray(value)?value.filter(Boolean):[];
const finite=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
const rowDate=row=>String(row?.date||row?.day||row?.performedAt||row?.createdAt||'').slice(0,10);
const completed=row=>row?.completed===true||row?.done===true||String(row?.status||'').toLowerCase()==='completed';
const domainOf=row=>{
  const raw=String(row?.domain||row?.track||row?.type||row?.category||'').toLowerCase();
  if(/workout|training|exercise|run|running/.test(raw))return 'training';
  if(/meal|nutrition|food|diet/.test(raw))return 'nutrition';
  if(/recovery|sleep|rest|checkin|readiness/.test(raw))return 'recovery';
  return 'unknown';
};
function checkins(state){return list(state?.dailyCheckins).length?list(state.dailyCheckins):list(state?.checkins);}
function sameDay(rows,date){return list(rows).filter(row=>rowDate(row)===date);}
function recoveryConstraint(state,date){
  const row=sameDay(checkins(state),date).at(-1)||null;
  if(!row)return {constrained:false,reasons:[],evidence:null};
  const sleep=finite(row.sleep??row.sleepHours),energy=finite(row.energy),stress=finite(row.stress),soreness=finite(row.soreness);
  const reasons=[];
  if(sleep!==null&&sleep<6)reasons.push('low_sleep');
  if(energy!==null&&energy<=2)reasons.push('low_energy');
  if(stress!==null&&stress>=4)reasons.push('high_stress');
  if(soreness!==null&&soreness>=4)reasons.push('high_soreness');
  return {constrained:reasons.length>0,reasons,evidence:{sleep,energy,stress,soreness}};
}
function actualEvidence(state,date){
  const workouts=sameDay(state?.workouts,date),runs=sameDay(state?.runs,date),meals=sameDay(state?.meals,date),recovery=sameDay(checkins(state),date);
  return {training:workouts.length+runs.length,nutrition:meals.length,recovery:recovery.length,workouts:workouts.length,runs:runs.length,meals:meals.length,checkins:recovery.length};
}
function plannedDomains(plans){
  const counts={training:0,nutrition:0,recovery:0,unknown:0};
  plans.forEach(row=>{counts[domainOf(row)]++;});
  return counts;
}
function deriveOutcome(state={},options={}){
  const date=String(options.date||new Date().toISOString().slice(0,10)).slice(0,10);
  const plans=sameDay(state?.planner,date),actual=actualEvidence(state,date),recovery=recoveryConstraint(state,date),domains=plannedDomains(plans);
  const done=plans.filter(completed).length;
  const evidenceCount=Number(actual.training>0)+Number(actual.nutrition>0)+Number(actual.recovery>0);
  let status='insufficient-evidence';
  if(plans.length){
    if(recovery.constrained&&done<plans.length)status='recovery-constrained';
    else if(done===plans.length)status='completed';
    else if(done>0||evidenceCount>0)status='partial';
    else status='missed';
  }
  const completionRate=plans.length?Math.round(done/plans.length*100):null;
  return {date,status,planned:plans.length,completed:done,completionRate,plannedDomains:domains,actual,recovery};
}
function recommend(outcome){
  const o=outcome||{};
  if(o.status==='recovery-constrained')return {action:'reduce-load',volumeDeltaPct:-20,priority:'recovery',reason:'recovery_constraint',requiresApproval:true};
  if(o.status==='missed')return {action:'simplify',volumeDeltaPct:-10,priority:'consistency',reason:'missed_plan',requiresApproval:true};
  if(o.status==='partial')return {action:'hold-or-simplify',volumeDeltaPct:0,priority:'completion',reason:'partial_execution',requiresApproval:true};
  if(o.status==='completed')return {action:'hold',volumeDeltaPct:0,priority:'progression-check',reason:'completed_plan',requiresApproval:true};
  return {action:'collect-evidence',volumeDeltaPct:0,priority:'evidence',reason:'insufficient_evidence',requiresApproval:false};
}
function interpret(state,options={}){
  const outcome=deriveOutcome(state,options),adaptation=recommend(outcome);
  return {version:'1.0.0',outcome,adaptation,writeIntent:null};
}
return {deriveOutcome,recommend,interpret,recoveryConstraint,domainOf};
});
