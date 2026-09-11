(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangPlanExecution=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const ENGINE_VERSION='plan-execution-v1.1';
const TARGET_VERSION='garang-goal-target-v1';
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const list=value=>Array.isArray(value)?value:[];
const finite=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const round=(n,d=0)=>{const p=10**d;return Math.round(n*p)/p;};
const dateRe=/^\d{4}-\d{2}-\d{2}$/;
const DOMAINS=['training','recovery','nutrition'];

function dateParts(value){
  const s=String(value||'').slice(0,10);if(!dateRe.test(s))return null;
  const [y,m,d]=s.split('-').map(Number),x=new Date(Date.UTC(y,m-1,d));
  if(x.getUTCFullYear()!==y||x.getUTCMonth()!==m-1||x.getUTCDate()!==d)return null;
  return {s,y,m,d,ms:x.getTime()};
}
function dateAdd(value,delta){const p=dateParts(value);if(!p)return null;const x=new Date(p.ms+Number(delta||0)*86400000);return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,'0')}-${String(x.getUTCDate()).padStart(2,'0')}`;}
function todayLocal(){const x=new Date();return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;}
function sameDate(row,date){return String(row?.date||row?.day||row?.performedAt||row?.createdAt||'').slice(0,10)===date;}
function recordAt(row){const raw=row?.performedAt||row?.endedAt||row?.startedAt||row?.createdAt||row?.updatedAt||null;if(!raw)return null;const ms=new Date(raw).getTime();return Number.isFinite(ms)?ms:null;}
function confirmedAt(plan){const raw=plan?.confirmedAt||null;if(!raw)return null;const ms=new Date(raw).getTime();return Number.isFinite(ms)?ms:null;}
function eligibleForPlan(row,plan){const gate=confirmedAt(plan);if(gate===null)return true;const at=recordAt(row);return at!==null&&at>=gate;}
function evidenceAt(rows){const times=list(rows).map(recordAt).filter(v=>v!==null);if(!times.length)return null;return new Date(Math.max(...times)).toISOString();}
function sourceIds(rows){return [...new Set(list(rows).map(row=>String(row?.id||row?.sessionId||row?.session_id||'')).filter(Boolean))];}
function goalClass(state){
  const raw=String(state?.profile?.goal||state?.onboarding?.goal||'').toLowerCase();
  if(/근육|muscle|bulk|hypertrophy/.test(raw))return 'muscle_gain';
  if(/체지방|체중 감소|감량|fat.?loss|weight.?loss|cut/.test(raw))return 'fat_loss';
  if(/러닝|running|run/.test(raw))return 'running_performance';
  if(/퍼포먼스|performance|strength|기록 향상/.test(raw))return 'performance';
  return 'maintenance';
}
function goalLabel(goal,lang='ko'){const labels={ko:{muscle_gain:'근육 증가',fat_loss:'체지방 감소',running_performance:'러닝 퍼포먼스',performance:'퍼포먼스 향상',maintenance:'유지·건강'},en:{muscle_gain:'Muscle gain',fat_loss:'Fat loss',running_performance:'Running performance',performance:'Performance',maintenance:'Maintenance'}};return (labels[lang]||labels.ko)[goal]||goal;}
function profileSex(state){const raw=String(state?.profile?.gender||state?.profile?.sex||state?.onboarding?.gender||state?.onboarding?.sex||'').toLowerCase();if(/female|woman|여성|여자/.test(raw))return 'female';if(/male|man|남성|남자/.test(raw))return 'male';return null;}
function latestWeight(state,date){const rows=list(state?.body).filter(row=>{const p=dateParts(String(row?.date||'').slice(0,10)),end=dateParts(date);return p&&end&&p.ms<=end.ms&&finite(row?.weight)>0;}).sort((a,b)=>String(a.date).localeCompare(String(b.date)));return finite(rows.at(-1)?.weight)||finite(state?.profile?.weight);}
function activeDays(state,endDate,days=14){const end=dateParts(endDate);if(!end)return 0;const start=end.ms-(Math.max(1,days)-1)*86400000,dates=new Set();for(const row of [...list(state?.workouts),...list(state?.runs)]){const p=dateParts(String(row?.date||'').slice(0,10));if(p&&p.ms>=start&&p.ms<=end.ms)dates.add(p.s);}return dates.size;}
function activityFactor(days14){if(days14<=1)return 1.2;if(days14<=4)return 1.35;if(days14<=7)return 1.5;if(days14<=10)return 1.6;return 1.7;}
function estimateTargets(state,date=todayLocal()){
  const goal=goalClass(state),weight=latestWeight(state,date),height=finite(state?.profile?.height),age=finite(state?.profile?.age),sex=profileSex(state),reasons=[];
  const proteinTarget=weight&&weight>0?Math.round(weight*1.6):null;
  if(!(weight>0))reasons.push('MISSING_WEIGHT');if(!(height>0))reasons.push('MISSING_HEIGHT');if(!(age>0))reasons.push('MISSING_AGE');if(!sex)reasons.push('MISSING_SEX');if(age!==null&&age<18)reasons.push('AGE_REQUIRES_CLINICAL_TARGET');
  let bmr=null,tdee=null,calorieTarget=null,factor=null,adjustment=0;const adult=age!==null&&age>=18;
  if(weight>0&&height>0&&adult&&sex){bmr=10*weight+6.25*height-5*age+(sex==='female'?-161:5);factor=activityFactor(activeDays(state,date,14));tdee=bmr*factor;adjustment=goal==='muscle_gain'?250:goal==='fat_loss'?-350:(goal==='running_performance'||goal==='performance'?150:0);calorieTarget=tdee+adjustment;if(goal==='fat_loss')calorieTarget=Math.max(calorieTarget,bmr*1.1);calorieTarget=Math.round(calorieTarget/10)*10;}
  const hasGoal=!!(state?.profile?.goal||state?.onboarding?.goal),confidence=calorieTarget?clamp(0.65+(activeDays(state,date,14)>=4?0.15:0)+(hasGoal?0.1:0),0,0.9):clamp(0.25+(proteinTarget?0.15:0),0,0.45);
  return {version:TARGET_VERSION,date,goal,goalLabel:goalLabel(goal),calorieTarget,proteinTarget,bmr:bmr===null?null:Math.round(bmr),tdee:tdee===null?null:Math.round(tdee),activityFactor:factor,goalAdjustment:calorieTarget?adjustment:null,confidence:round(confidence,2),estimateOnly:true,medicalTarget:false,reasons:[...new Set(reasons)]};
}
function mealRows(state,date){return list(state?.meals).filter(row=>sameDate(row,date));}
function mealTotalsFromRows(rows){return list(rows).reduce((a,row)=>{const kcal=finite(row?.kcal),protein=finite(row?.protein),carbs=finite(row?.carbs??row?.carbohydrate),fat=finite(row?.fat);return {meals:a.meals+1,kcal:a.kcal+(kcal??0),protein:a.protein+(protein??0),carbs:a.carbs+(carbs??0),fat:a.fat+(fat??0),kcalObserved:a.kcalObserved+(kcal===null?0:1),proteinObserved:a.proteinObserved+(protein===null?0:1),carbsObserved:a.carbsObserved+(carbs===null?0:1),fatObserved:a.fatObserved+(fat===null?0:1)};},{meals:0,kcal:0,protein:0,carbs:0,fat:0,kcalObserved:0,proteinObserved:0,carbsObserved:0,fatObserved:0});}
function mealTotals(state,date){return mealTotalsFromRows(mealRows(state,date));}
function workoutVolume(row){const details=list(row?.setDetails||row?.setsDetail);if(details.length)return Math.round(details.reduce((sum,set)=>sum+Math.max(0,finite(set?.weight)||0)*Math.max(0,finite(set?.reps)||0),0));const stored=finite(row?.volume);if(stored!==null&&stored>=0)return stored;return Math.max(0,finite(row?.weight)||0)*Math.max(0,finite(row?.reps)||0)*Math.max(1,finite(row?.sets)||1);}
function workoutRows(state,date){return list(state?.workouts).filter(row=>sameDate(row,date));}
function workoutSessions(rows){const groups=new Map();for(const row of list(rows)){const key=String(row?.sessionId||row?.session_id||row?.workoutId||row?.workout_id||row?.id||`row-${groups.size}`);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}return [...groups.values()];}
function workoutEvidence(state,date){const rows=workoutRows(state,date),sessions=workoutSessions(rows);return {rows:rows.length,sessions:sessions.length,duration:round(rows.reduce((s,row)=>s+(finite(row?.duration)||0),0),1),volume:Math.round(rows.reduce((s,row)=>s+workoutVolume(row),0)),names:[...new Set(rows.map(row=>String(row?.name||row?.title||'').trim()).filter(Boolean))].slice(0,8),sourceRecordIds:sourceIds(rows),evidenceAt:evidenceAt(rows)};}
function runningRows(state,date){return list(state?.runs).filter(row=>sameDate(row,date));}
function runningEvidence(state,date){const rows=runningRows(state,date);return {sessions:rows.length,distance:round(rows.reduce((s,row)=>s+(finite(row?.distance)||0),0),2),duration:round(rows.reduce((s,row)=>s+(finite(row?.duration)||0),0),1),sourceRecordIds:sourceIds(rows),evidenceAt:evidenceAt(rows)};}
function checkinEvidence(state,date){const rows=[...list(state?.dailyCheckins),...list(state?.checkins)].filter(row=>sameDate(row,date)),row=rows.at(-1)||null;return {count:row?1:0,row:row?clone(row):null};}
function bodyEvidence(state,date){const rows=list(state?.body).filter(row=>sameDate(row,date)),row=rows.at(-1)||null;return {count:rows.length?1:0,rows:rows.length,row:row?clone(row):null};}
function planType(value){const raw=String(value||'').toLowerCase();if(/run|running|러닝/.test(raw))return 'running';if(/meal|nutrition|식단|영양/.test(raw))return 'nutrition';if(/recover|recovery|sleep|회복|수면/.test(raw))return 'recovery';if(/rest|휴식/.test(raw))return 'rest';if(/workout|strength|exercise|운동|근력/.test(raw))return 'workout';return 'other';}
function planDomain(row,type){const explicit=String(row?.domain||'').toLowerCase();if(DOMAINS.includes(explicit))return explicit;if(['workout','running','rest'].includes(type))return 'training';if(type==='recovery')return 'recovery';if(type==='nutrition')return 'nutrition';return 'training';}
function nutritionStatus(actual,target,goal,hasEvidence=true){const observed=finite(actual);if(!(target>0))return {actual:observed,target:null,ratio:null,percent:null,status:'unknown',hasEvidence:false};if(!hasEvidence)return {actual:observed??0,target,ratio:null,percent:null,status:'not_logged',hasEvidence:false};const safeActual=Math.max(0,observed??0),ratio=safeActual/target,percent=Math.round(ratio*100);let low=0.9,high=1.1;if(goal==='muscle_gain'||goal==='performance'||goal==='running_performance'){low=0.9;high=1.15;}if(goal==='fat_loss'){low=0.85;high=1.1;}return {actual:Math.round(safeActual),target,ratio:round(ratio,3),percent,status:ratio<low?(goal==='fat_loss'?'too_low':'insufficient'):(ratio>high?'above_target':'on_target'),hasEvidence:true};}
function nutritionPlanScore(rows,targets){
  const totals=mealTotalsFromRows(rows);if(!totals.meals)return {score:0,evidence:'NONE'};
  const mealCoverage=Math.min(100,totals.meals*34),parts=[mealCoverage];
  if(targets.proteinTarget&&totals.proteinObserved)parts.push(Math.min(100,Math.round(totals.protein/targets.proteinTarget*100)));
  if(targets.calorieTarget&&totals.kcalObserved){const ratio=totals.kcal/targets.calorieTarget;parts.push(Math.max(0,Math.round(100-Math.abs(1-ratio)*100)));}
  const score=Math.round(parts.reduce((s,v)=>s+v,0)/parts.length);
  return {score:clamp(score,0,100),evidence:score>=80?'NUTRITION_TARGET_MATCH':'NUTRITION_PARTIAL',totals};
}
function recoveryActionRows(state,date,plan){return list(state?.actionLog).filter(row=>{const action=String(row?.action||'').toLowerCase(),target=String(row?.args?.date||row?.args?.targetDate||row?.date||row?.at||'').slice(0,10);return target===date&&/recovery_(completed|done)|complete_recovery|recovery_action_completed/.test(action)&&eligibleForPlan(row,plan);});}
function nextDaySleepScore(state,date,plan){
  if(!/sleep|수면/.test(String(plan?.title||'').toLowerCase()))return null;
  const next=dateAdd(date,1),rows=[...list(state?.dailyCheckins),...list(state?.checkins)].filter(row=>sameDate(row,next)),row=rows.at(-1);if(!row)return null;
  let sleep=finite(row.sleepHours??row.sleepDurationHours??row.sleepDuration??row.sleep);if(sleep!==null&&sleep>24)sleep=round(sleep/60,1);if(sleep===null)return null;
  return {score:sleep>=7.5?85:sleep>=7?75:sleep>=6.5?60:35,row,sleep};
}
function resolvePlans(state,date,evidence,targets){
  const rows=list(state?.planner).filter(row=>sameDate(row,date)).slice().sort((a,b)=>`${a?.time||'99:99'}|${a?.id||''}`.localeCompare(`${b?.time||'99:99'}|${b?.id||''}`)),currentGoal=goalClass(state);
  const workoutPool=workoutSessions(workoutRows(state,date)).map(rows=>({rows,used:false})),runPool=runningRows(state,date).map(row=>({rows:[row],used:false}));let nutritionUsed=false,recoveryUsed=false,explicit=0,derived=0;
  const items=rows.map(row=>{
    const type=planType(row?.type||row?.category),domain=planDomain(row,type),isExplicit=row?.completed===true||row?.done===true||String(row?.status||'').toLowerCase()==='completed';
    let score=isExplicit?100:0,evidenceCode=isExplicit?'PLANNER_COMPLETED':'NONE',matched=[];
    if(isExplicit)explicit++;
    else if(domain==='training'){
      if(String(row?.completionTarget||'')==='intentional_rest'&&date<todayLocal()){
        const after=[...workoutRows(state,date),...runningRows(state,date)].filter(record=>eligibleForPlan(record,row));if(!after.length){score=100;evidenceCode='INTENTIONAL_REST_OBSERVED';}
      }else{
        const pool=type==='running'?runPool:workoutPool,hit=pool.find(entry=>!entry.used&&entry.rows.some(record=>eligibleForPlan(record,row)));
        if(hit){hit.used=true;matched=hit.rows.filter(record=>eligibleForPlan(record,row));score=100;evidenceCode='ACTUAL_RECORD_MATCH';}
      }
    }else if(domain==='nutrition'&&!nutritionUsed){
      const meals=mealRows(state,date).filter(record=>eligibleForPlan(record,row));const result=nutritionPlanScore(meals,targets);score=result.score;evidenceCode=result.evidence;matched=meals;if(score>0)nutritionUsed=true;
    }else if(domain==='recovery'&&!recoveryUsed){
      const actions=recoveryActionRows(state,date,row);if(actions.length){score=100;evidenceCode='RECOVERY_ACTION_MATCH';matched=actions;recoveryUsed=true;}
      else{const sleep=nextDaySleepScore(state,date,row);if(sleep){score=sleep.score;evidenceCode='RECOVERY_SLEEP_OUTCOME';matched=[sleep.row];}}
    }
    const isDerived=!isExplicit&&score>=80;if(isDerived)derived++;
    return {id:String(row?.id||''),date,type,domain,time:String(row?.time||''),title:String(row?.title||row?.name||'Plan'),source:String(row?.source||row?.origin||'user'),goalClass:String(row?.goalClass||currentGoal),goalLabel:String(row?.goalLabel||row?.goal||''),explicitCompleted:isExplicit,derivedCompleted:isDerived,executed:isExplicit||isDerived,executionScore:score,evidence:evidenceCode,sourceRecordIds:sourceIds(matched),evidenceAt:evidenceAt(matched)};
  });
  const domains={};for(const domain of DOMAINS){const domainRows=items.filter(item=>item.domain===domain);const score=domainRows.length?Math.round(domainRows.reduce((s,item)=>s+item.executionScore,0)/domainRows.length):null;domains[domain]={planned:domainRows.length,executed:domainRows.filter(item=>item.executionScore>=80).length,rate:score,score,evidenceCount:domainRows.filter(item=>item.evidence!=='NONE').length};}
  const executed=items.filter(item=>item.executionScore>=80).length,rate=items.length?Math.round(items.reduce((s,item)=>s+item.executionScore,0)/items.length):null;
  return {planned:items.length,executed,explicitCompleted:explicit,derivedCompleted:derived,rate,domains,items};
}
function daily(state,date=todayLocal()){
  const safe=state&&typeof state==='object'?state:{},targetDate=dateParts(date)?.s||todayLocal(),targets=estimateTargets(safe,targetDate),evidence={workout:workoutEvidence(safe,targetDate),running:runningEvidence(safe,targetDate),meals:mealTotals(safe,targetDate),body:bodyEvidence(safe,targetDate),checkin:checkinEvidence(safe,targetDate)},plans=resolvePlans(safe,targetDate,evidence,targets),calories=nutritionStatus(evidence.meals.kcal,targets.calorieTarget,targets.goal,evidence.meals.kcalObserved>0),protein=nutritionStatus(evidence.meals.protein,targets.proteinTarget,targets.goal,evidence.meals.proteinObserved>0);
  const measuredNutrition=[calories,protein].filter(metric=>metric.hasEvidence&&metric.percent!==null),goalAlignment=measuredNutrition.length?Math.round(measuredNutrition.reduce((sum,metric)=>sum+clamp(metric.percent,0,100),0)/measuredNutrition.length):null;
  const hasActivity=!!(evidence.workout.sessions||evidence.running.sessions),signalCount=[hasActivity,evidence.meals.meals>0,evidence.body.count>0,evidence.checkin.count>0].filter(Boolean).length,confidence=round(clamp(0.2+(plans.planned?0.15:0)+(targets.calorieTarget?0.15:0)+signalCount*0.1,0.15,0.9),2),reasons=[];
  if(plans.derivedCompleted)reasons.push('ACTUAL_RECORDS_MATCHED_TO_PLAN');if(plans.planned&&!plans.executed)reasons.push('PLANS_NOT_EXECUTED_YET');if(evidence.meals.meals&&targets.calorieTarget)reasons.push(`CALORIE_${String(calories.status).toUpperCase()}`);if(!targets.calorieTarget)reasons.push('CALORIE_TARGET_UNKNOWN');
  return {engineVersion:ENGINE_VERSION,date:targetDate,goal:targets.goal,targets,plan:plans,evidence,nutrition:{...evidence.meals,calories,protein},coverage:{signals:4,recorded:signalCount,goalSignals:measuredNutrition.length},goalAlignment,goalAlignmentStatus:measuredNutrition.length?'measured':'insufficient_data',confidence,reasons};
}
function range(state,options={}){
  const days=clamp(Math.round(finite(options.days)||7),1,90),end=dateParts(options.endDate)?.s||todayLocal(),rows=[];for(let i=days-1;i>=0;i--)rows.push(daily(state,dateAdd(end,-i)));
  const planned=rows.reduce((s,r)=>s+r.plan.planned,0),executed=rows.reduce((s,r)=>s+r.plan.executed,0),scoreSum=rows.reduce((s,r)=>s+(r.plan.rate===null?0:r.plan.rate*r.plan.planned),0),calorieDays=rows.filter(r=>r.nutrition.meals&&r.targets.calorieTarget),proteinDays=rows.filter(r=>r.nutrition.meals&&r.targets.proteinTarget),calorieOnTarget=calorieDays.filter(r=>r.nutrition.calories.status==='on_target').length,proteinOnTarget=proteinDays.filter(r=>r.nutrition.protein.status==='on_target').length,workoutDays=rows.filter(r=>r.evidence.workout.sessions).length,runDays=rows.filter(r=>r.evidence.running.sessions).length,recordDays=rows.filter(r=>r.coverage.recorded>0).length;
  let streak=0;for(let i=rows.length-1;i>=0;i--){const rate=rows[i].plan.rate;if(rate!==null&&rate>=80)streak++;else if(rate!==null)break;}let recordStreak=0;for(let i=rows.length-1;i>=0;i--){if(rows[i].coverage.recorded>0)recordStreak++;else break;}
  const domainScores={};for(const domain of DOMAINS){const measured=rows.map(r=>r.plan.domains?.[domain]).filter(x=>x&&x.planned);domainScores[domain]=measured.length?Math.round(measured.reduce((s,x)=>s+(x.rate??0),0)/measured.length):null;}
  return {engineVersion:ENGINE_VERSION,startDate:rows[0]?.date||end,endDate:end,days,executionRate:planned?Math.round(scoreSum/planned):null,planned,executed,domainScores,recordDays,recordStreak,workoutDays,runDays,calorieOnTargetDays:calorieOnTarget,calorieLoggedDays:calorieDays.length,proteinOnTargetDays:proteinOnTarget,proteinLoggedDays:proteinDays.length,currentExecutionStreak:streak,rows};
}
function accumulation(state,options={}){const weeks=clamp(Math.round(finite(options.weeks)||4),1,12),end=dateParts(options.endDate)?.s||todayLocal(),series=[];for(let i=weeks-1;i>=0;i--){const weekEnd=dateAdd(end,-i*7),s=range(state,{endDate:weekEnd,days:7});series.push({startDate:s.startDate,endDate:s.endDate,executionRate:s.executionRate,domainScores:s.domainScores,planned:s.planned,executed:s.executed,recordDays:s.recordDays,recordStreak:s.recordStreak,workoutDays:s.workoutDays,calorieOnTargetDays:s.calorieOnTargetDays,proteinOnTargetDays:s.proteinOnTargetDays});}const comparable=series.filter(x=>x.executionRate!==null),trend=comparable.length>=2?comparable.at(-1).executionRate-comparable[0].executionRate:null;return {engineVersion:ENGINE_VERSION,weeks,endDate:end,trend,series};}
function compactForContext(state,options={}){const end=options.endDate||todayLocal(),week=range(state,{endDate:end,days:7}),day=daily(state,end);return {engineVersion:ENGINE_VERSION,date:day.date,goal:day.goal,executionRate7d:week.executionRate,domainScores7d:week.domainScores,planned7d:week.planned,executed7d:week.executed,recordDays7d:week.recordDays,recordStreak7d:week.recordStreak,calorieOnTargetDays7d:week.calorieOnTargetDays,proteinOnTargetDays7d:week.proteinOnTargetDays,currentExecutionStreak:week.currentExecutionStreak,today:{planRate:day.plan.rate,domains:day.plan.domains,goalAlignment:day.goalAlignment,goalAlignmentStatus:day.goalAlignmentStatus,calorieStatus:day.nutrition.calories.status,proteinStatus:day.nutrition.protein.status,confidence:day.confidence}};}

return Object.freeze({ENGINE_VERSION,TARGET_VERSION,goalClass,goalLabel,estimateTargets,daily,range,accumulation,compactForContext,dateAdd,nutritionStatus,workoutVolume});
});
