(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangPlanExecution=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const ENGINE_VERSION='plan-execution-v1';
const TARGET_VERSION='garang-goal-target-v1';
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const list=value=>Array.isArray(value)?value:[];
const finite=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const round=(n,d=0)=>{const p=10**d;return Math.round(n*p)/p;};
const dateRe=/^\d{4}-\d{2}-\d{2}$/;

function dateParts(value){
  const s=String(value||'').slice(0,10);if(!dateRe.test(s))return null;
  const [y,m,d]=s.split('-').map(Number),x=new Date(Date.UTC(y,m-1,d));
  if(x.getUTCFullYear()!==y||x.getUTCMonth()!==m-1||x.getUTCDate()!==d)return null;
  return {s,y,m,d,ms:x.getTime()};
}
function dateAdd(value,delta){
  const p=dateParts(value);if(!p)return null;const x=new Date(p.ms+Number(delta||0)*86400000);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,'0')}-${String(x.getUTCDate()).padStart(2,'0')}`;
}
function todayLocal(){const x=new Date();return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;}
function sameDate(row,date){return String(row?.date||row?.day||row?.performedAt||row?.createdAt||'').slice(0,10)===date;}
function goalClass(state){
  const raw=String(state?.profile?.goal||state?.onboarding?.goal||'').toLowerCase();
  if(/근육|muscle|bulk|hypertrophy/.test(raw))return 'muscle_gain';
  if(/체지방|체중 감소|감량|fat.?loss|weight.?loss|cut/.test(raw))return 'fat_loss';
  if(/러닝|running|run/.test(raw))return 'running_performance';
  if(/퍼포먼스|performance|strength|기록 향상/.test(raw))return 'performance';
  return 'maintenance';
}
function goalLabel(goal,lang='ko'){
  const labels={ko:{muscle_gain:'근육 증가',fat_loss:'체지방 감소',running_performance:'러닝 퍼포먼스',performance:'퍼포먼스 향상',maintenance:'유지·건강'},en:{muscle_gain:'Muscle gain',fat_loss:'Fat loss',running_performance:'Running performance',performance:'Performance',maintenance:'Maintenance'}};
  return (labels[lang]||labels.ko)[goal]||goal;
}
function profileSex(state){
  const raw=String(state?.profile?.gender||state?.profile?.sex||state?.onboarding?.gender||state?.onboarding?.sex||'').toLowerCase();
  if(/female|woman|여성|여자/.test(raw))return 'female';if(/male|man|남성|남자/.test(raw))return 'male';return null;
}
function latestWeight(state,date){
  const rows=list(state?.body).filter(row=>{const p=dateParts(String(row?.date||'').slice(0,10)),end=dateParts(date);return p&&end&&p.ms<=end.ms&&finite(row?.weight)>0;}).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  return finite(rows.at(-1)?.weight)||finite(state?.profile?.weight);
}
function activeDays(state,endDate,days=14){
  const end=dateParts(endDate);if(!end)return 0;const start=end.ms-(Math.max(1,days)-1)*86400000,dates=new Set();
  for(const row of [...list(state?.workouts),...list(state?.runs)]){const p=dateParts(String(row?.date||'').slice(0,10));if(p&&p.ms>=start&&p.ms<=end.ms)dates.add(p.s);}
  return dates.size;
}
function activityFactor(days14){if(days14<=1)return 1.2;if(days14<=4)return 1.35;if(days14<=7)return 1.5;if(days14<=10)return 1.6;return 1.7;}
function estimateTargets(state,date=todayLocal()){
  const goal=goalClass(state),weight=latestWeight(state,date),height=finite(state?.profile?.height),age=finite(state?.profile?.age),sex=profileSex(state),reasons=[];
  const proteinTarget=weight&&weight>0?Math.round(weight*1.6):null;
  if(!(weight>0))reasons.push('MISSING_WEIGHT');if(!(height>0))reasons.push('MISSING_HEIGHT');if(!(age>0))reasons.push('MISSING_AGE');if(!sex)reasons.push('MISSING_SEX');if(age!==null&&age<18)reasons.push('AGE_REQUIRES_CLINICAL_TARGET');
  let bmr=null,tdee=null,calorieTarget=null,factor=null,adjustment=0;const adult=age!==null&&age>=18;
  if(weight>0&&height>0&&adult&&sex){
    bmr=10*weight+6.25*height-5*age+(sex==='female'?-161:5);factor=activityFactor(activeDays(state,date,14));tdee=bmr*factor;
    adjustment=goal==='muscle_gain'?250:goal==='fat_loss'?-350:(goal==='running_performance'||goal==='performance'?150:0);calorieTarget=tdee+adjustment;
    if(goal==='fat_loss')calorieTarget=Math.max(calorieTarget,bmr*1.1);calorieTarget=Math.round(calorieTarget/10)*10;
  }
  const hasGoal=!!(state?.profile?.goal||state?.onboarding?.goal);
  const confidence=calorieTarget?clamp(0.65+(activeDays(state,date,14)>=4?0.15:0)+(hasGoal?0.1:0),0,0.9):clamp(0.25+(proteinTarget?0.15:0),0,0.45);
  return {version:TARGET_VERSION,date,goal,goalLabel:goalLabel(goal),calorieTarget,proteinTarget,bmr:bmr===null?null:Math.round(bmr),tdee:tdee===null?null:Math.round(tdee),activityFactor:factor,goalAdjustment:calorieTarget?adjustment:null,confidence:round(confidence,2),estimateOnly:true,medicalTarget:false,reasons:[...new Set(reasons)]};
}
function mealTotals(state,date){return list(state?.meals).filter(row=>sameDate(row,date)).reduce((a,row)=>{const kcal=finite(row?.kcal),protein=finite(row?.protein),carbs=finite(row?.carbs??row?.carbohydrate),fat=finite(row?.fat);return {meals:a.meals+1,kcal:a.kcal+(kcal??0),protein:a.protein+(protein??0),carbs:a.carbs+(carbs??0),fat:a.fat+(fat??0),kcalObserved:a.kcalObserved+(kcal===null?0:1),proteinObserved:a.proteinObserved+(protein===null?0:1),carbsObserved:a.carbsObserved+(carbs===null?0:1),fatObserved:a.fatObserved+(fat===null?0:1)};},{meals:0,kcal:0,protein:0,carbs:0,fat:0,kcalObserved:0,proteinObserved:0,carbsObserved:0,fatObserved:0});}
function workoutEvidence(state,date){
  const rows=list(state?.workouts).filter(row=>sameDate(row,date)),keys=new Set(rows.map(row=>String(row?.sessionId||row?.session_id||row?.workoutId||row?.workout_id||'')).filter(Boolean));
  const sessions=keys.size||(rows.length?1:0),duration=rows.reduce((s,row)=>s+(finite(row?.duration)||0),0),volume=rows.reduce((s,row)=>s+(finite(row?.volume)||0),0),names=[...new Set(rows.map(row=>String(row?.name||row?.title||'').trim()).filter(Boolean))];
  return {rows:rows.length,sessions,duration:round(duration,1),volume:Math.round(volume),names:names.slice(0,8)};
}
function runningEvidence(state,date){const rows=list(state?.runs).filter(row=>sameDate(row,date));return {sessions:rows.length,distance:round(rows.reduce((s,row)=>s+(finite(row?.distance)||0),0),2),duration:round(rows.reduce((s,row)=>s+(finite(row?.duration)||0),0),1)};}
function checkinEvidence(state,date){const rows=[...list(state?.dailyCheckins),...list(state?.checkins)].filter(row=>sameDate(row,date)),row=rows.at(-1)||null;return {count:row?1:0,row:row?clone(row):null};}
function bodyEvidence(state,date){const rows=list(state?.body).filter(row=>sameDate(row,date)),row=rows.at(-1)||null;return {count:rows.length?1:0,rows:rows.length,row:row?clone(row):null};}
function planType(value){const raw=String(value||'').toLowerCase();if(/run|running|러닝/.test(raw))return 'running';if(/meal|nutrition|식단|영양/.test(raw))return 'nutrition';if(/recover|recovery|sleep|회복|수면/.test(raw))return 'recovery';if(/rest|휴식/.test(raw))return 'rest';if(/workout|strength|exercise|운동|근력/.test(raw))return 'workout';return 'other';}
function resolvePlans(state,date,evidence){
  const rows=list(state?.planner).filter(row=>sameDate(row,date)).slice().sort((a,b)=>`${a?.time||'99:99'}|${a?.id||''}`.localeCompare(`${b?.time||'99:99'}|${b?.id||''}`));
  const pools={workout:evidence.workout.sessions,running:evidence.running.sessions,nutrition:evidence.meals.meals?1:0,recovery:evidence.checkin.count,rest:0,other:0};let explicit=0,derived=0;
  const items=rows.map(row=>{const type=planType(row?.type||row?.category),isExplicit=row?.completed===true||row?.done===true||String(row?.status||'').toLowerCase()==='completed';let isDerived=false;if(isExplicit)explicit++;else if((pools[type]||0)>0){isDerived=true;pools[type]-=1;derived++;}return {id:String(row?.id||''),date,type,time:String(row?.time||''),title:String(row?.title||row?.name||'Plan'),source:String(row?.source||row?.origin||'user'),explicitCompleted:isExplicit,derivedCompleted:isDerived,executed:isExplicit||isDerived,evidence:isExplicit?'PLANNER_COMPLETED':(isDerived?'ACTUAL_RECORD_MATCH':'NONE')};});
  const executed=explicit+derived;return {planned:items.length,executed,explicitCompleted:explicit,derivedCompleted:derived,rate:items.length?Math.round(executed/items.length*100):null,items};
}
function nutritionStatus(actual,target,goal,hasEvidence=true){
  const observed=finite(actual);
  if(!(target>0))return {actual:observed,target:null,ratio:null,percent:null,status:'unknown',hasEvidence:false};
  if(!hasEvidence)return {actual:observed??0,target,ratio:null,percent:null,status:'not_logged',hasEvidence:false};
  const safeActual=Math.max(0,observed??0),ratio=safeActual/target,percent=Math.round(ratio*100);let low=0.9,high=1.1;if(goal==='muscle_gain'||goal==='performance'||goal==='running_performance'){low=0.9;high=1.15;}if(goal==='fat_loss'){low=0.85;high=1.1;}
  return {actual:Math.round(safeActual),target,ratio:round(ratio,3),percent,status:ratio<low?(goal==='fat_loss'?'too_low':'insufficient'):(ratio>high?'above_target':'on_target'),hasEvidence:true};
}
function daily(state,date=todayLocal()){
  const safe=state&&typeof state==='object'?state:{},targetDate=dateParts(date)?.s||todayLocal(),evidence={workout:workoutEvidence(safe,targetDate),running:runningEvidence(safe,targetDate),meals:mealTotals(safe,targetDate),body:bodyEvidence(safe,targetDate),checkin:checkinEvidence(safe,targetDate)},targets=estimateTargets(safe,targetDate),plans=resolvePlans(safe,targetDate,evidence),calories=nutritionStatus(evidence.meals.kcal,targets.calorieTarget,targets.goal,evidence.meals.kcalObserved>0),protein=nutritionStatus(evidence.meals.protein,targets.proteinTarget,targets.goal,evidence.meals.proteinObserved>0);
  const measuredNutrition=[calories,protein].filter(metric=>metric.hasEvidence&&metric.percent!==null),goalAlignment=measuredNutrition.length?Math.round(measuredNutrition.reduce((sum,metric)=>sum+clamp(metric.percent,0,100),0)/measuredNutrition.length):null;
  const hasActivity=!!(evidence.workout.sessions||evidence.running.sessions);
  const signalCount=[hasActivity,evidence.meals.meals>0,evidence.body.count>0,evidence.checkin.count>0].filter(Boolean).length;
  const confidence=round(clamp(0.2+(plans.planned?0.15:0)+(targets.calorieTarget?0.15:0)+signalCount*0.1,0.15,0.9),2),reasons=[];
  if(plans.derivedCompleted)reasons.push('ACTUAL_RECORDS_MATCHED_TO_PLAN');if(plans.planned&&!plans.executed)reasons.push('PLANS_NOT_EXECUTED_YET');if(evidence.meals.meals&&targets.calorieTarget)reasons.push(`CALORIE_${String(calories.status).toUpperCase()}`);if(!targets.calorieTarget)reasons.push('CALORIE_TARGET_UNKNOWN');
  return {engineVersion:ENGINE_VERSION,date:targetDate,goal:targets.goal,targets,plan:plans,evidence,nutrition:{...evidence.meals,calories,protein},coverage:{signals:4,recorded:signalCount,goalSignals:measuredNutrition.length},goalAlignment,goalAlignmentStatus:measuredNutrition.length?'measured':'insufficient_data',confidence,reasons};
}
function range(state,options={}){
  const days=clamp(Math.round(finite(options.days)||7),1,90),end=dateParts(options.endDate)?.s||todayLocal(),rows=[];for(let i=days-1;i>=0;i--)rows.push(daily(state,dateAdd(end,-i)));
  const planned=rows.reduce((s,r)=>s+r.plan.planned,0),executed=rows.reduce((s,r)=>s+r.plan.executed,0),calorieDays=rows.filter(r=>r.nutrition.meals&&r.targets.calorieTarget),proteinDays=rows.filter(r=>r.nutrition.meals&&r.targets.proteinTarget),calorieOnTarget=calorieDays.filter(r=>r.nutrition.calories.status==='on_target').length,proteinOnTarget=proteinDays.filter(r=>r.nutrition.protein.status==='on_target').length,workoutDays=rows.filter(r=>r.evidence.workout.sessions).length,runDays=rows.filter(r=>r.evidence.running.sessions).length,recordDays=rows.filter(r=>r.coverage.recorded>0).length;
  let streak=0;for(let i=rows.length-1;i>=0;i--){const rate=rows[i].plan.rate;if(rate!==null&&rate>=80)streak++;else if(rate!==null)break;}
  let recordStreak=0;for(let i=rows.length-1;i>=0;i--){if(rows[i].coverage.recorded>0)recordStreak++;else break;}
  return {engineVersion:ENGINE_VERSION,startDate:rows[0]?.date||end,endDate:end,days,executionRate:planned?Math.round(executed/planned*100):null,planned,executed,recordDays,recordStreak,workoutDays,runDays,calorieOnTargetDays:calorieOnTarget,calorieLoggedDays:calorieDays.length,proteinOnTargetDays:proteinOnTarget,proteinLoggedDays:proteinDays.length,currentExecutionStreak:streak,rows};
}
function accumulation(state,options={}){const weeks=clamp(Math.round(finite(options.weeks)||4),1,12),end=dateParts(options.endDate)?.s||todayLocal(),series=[];for(let i=weeks-1;i>=0;i--){const weekEnd=dateAdd(end,-i*7),s=range(state,{endDate:weekEnd,days:7});series.push({startDate:s.startDate,endDate:s.endDate,executionRate:s.executionRate,planned:s.planned,executed:s.executed,recordDays:s.recordDays,recordStreak:s.recordStreak,workoutDays:s.workoutDays,calorieOnTargetDays:s.calorieOnTargetDays,proteinOnTargetDays:s.proteinOnTargetDays});}const comparable=series.filter(x=>x.executionRate!==null),trend=comparable.length>=2?comparable.at(-1).executionRate-comparable[0].executionRate:null;return {engineVersion:ENGINE_VERSION,weeks,endDate:end,trend,series};}
function compactForContext(state,options={}){const end=options.endDate||todayLocal(),week=range(state,{endDate:end,days:7}),day=daily(state,end);return {engineVersion:ENGINE_VERSION,date:day.date,goal:day.goal,executionRate7d:week.executionRate,planned7d:week.planned,executed7d:week.executed,recordDays7d:week.recordDays,recordStreak7d:week.recordStreak,calorieOnTargetDays7d:week.calorieOnTargetDays,proteinOnTargetDays7d:week.proteinOnTargetDays,currentExecutionStreak:week.currentExecutionStreak,today:{planRate:day.plan.rate,goalAlignment:day.goalAlignment,goalAlignmentStatus:day.goalAlignmentStatus,calorieStatus:day.nutrition.calories.status,proteinStatus:day.nutrition.protein.status,confidence:day.confidence}};}

return Object.freeze({ENGINE_VERSION,TARGET_VERSION,goalClass,goalLabel,estimateTargets,daily,range,accumulation,compactForContext,dateAdd,nutritionStatus});
});
