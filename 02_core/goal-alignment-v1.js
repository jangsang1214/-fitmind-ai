/* GARANG Goal Alignment v1
   Deterministic, evidence-backed fit to the user's model goal.
   A missing domain is unknown, never a zero and never an invented score.
*/
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.GarangGoalAlignment=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const list=v=>Array.isArray(v)?v:[],num=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;},clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const date=v=>String(v||'').slice(0,10),dayMs=v=>{const x=Date.parse(`${date(v)}T12:00:00Z`);return Number.isFinite(x)?x:null;};
function goalClass(state){const g=String(state?.profile?.goal||state?.onboarding?.goal||'').toLowerCase();if(/근육|muscle|bulk|hypertrophy/.test(g))return'muscle_gain';if(/체지방|감량|fat.?loss|weight.?loss|cut/.test(g))return'fat_loss';if(/러닝|running|run/.test(g))return'running_performance';if(/퍼포먼스|performance|strength|기록 향상/.test(g))return'performance';return'maintenance';}
function rows(state,days,end){const endMs=dayMs(end),start=endMs-(days-1)*86400000;return list(state).filter(r=>{const t=dayMs(r?.date);return t!==null&&t>=start&&t<=endMs;});}
function score(id,label,values,evidence,period){const valid=values.filter(v=>v!==null);return {id,label,score:valid.length?Math.round(valid.reduce((a,b)=>a+b,0)/valid.length):null,evidence,period,status:valid.length?'measured':'insufficient_data'};}
function average(values){const valid=values.filter(v=>v!==null);return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;}
function numericField(row,...keys){for(const key of keys){const value=num(row?.[key]);if(value!==null)return value;}return null;}
function uniqueDates(rowsValue){return new Set(rowsValue.map(row=>date(row?.date)).filter(Boolean));}
function recoveryReadiness(row){
 const parts=[];
 const sleep=numericField(row,'sleep','sleepHours','sleep_hours');
 const energy=numericField(row,'energy');
 const stress=numericField(row,'stress');
 const soreness=numericField(row,'soreness','muscleSoreness','muscle_soreness');
 if(sleep!==null)parts.push(clamp(sleep/8*100));
 if(energy!==null)parts.push(clamp(energy/5*100));
 if(stress!==null)parts.push(clamp((6-stress)/5*100));
 if(soreness!==null)parts.push(clamp((6-soreness)/5*100));
 return average(parts);
}
function trendScore(values,favorableDirection){
 const valid=values.filter(value=>value!==null);
 if(valid.length<2)return null;
 const delta=valid.at(-1)-valid[0];
 if(Math.abs(delta)<0.05)return 65;
 const favorable=favorableDirection==='down'?delta<0:delta>0;
 return favorable?85:35;
}
function summarize(state,{days=30,endDate}={}){
 const end=date(endDate)||date(new Date().toISOString()),goal=goalClass(state),workouts=rows(state?.workouts,days,end),meals=rows(state?.meals,days,end),runs=rows(state?.runs,days,end),body=rows(state?.body,days,end),checkins=rows(state?.dailyCheckins?.length?state.dailyCheckins:state?.checkins,days,end),plans=rows(state?.planner,days,end);
 const activityRows=[...workouts,...runs],activityDays=uniqueDates(activityRows).size,planDone=plans.filter(x=>x.done===true||x.completed===true||String(x.status||'').toLowerCase()==='completed').length,planRate=plans.length?Math.round(planDone/plans.length*100):null;
 const weeklyFrequency=num(state?.userModel?.weeklyFrequency)??num(state?.onboarding?.weeklyFrequency)??3;
 const targetTrainingDays=Math.max(1,weeklyFrequency*days/7),trainingScore=activityDays?clamp(activityDays/targetTrainingDays*100):null;

 const weight=num(state?.profile?.weight)??num(state?.onboarding?.weight),proteinTarget=weight>0?weight*1.6:null;
 const proteinByDay=new Map();
 meals.forEach(row=>{const protein=numericField(row,'protein');if(protein===null)return;const key=date(row.date),current=proteinByDay.get(key)||0;proteinByDay.set(key,current+Math.max(0,protein));});
 const proteinValues=[...proteinByDay.values()],proteinScore=proteinTarget&&proteinValues.length?clamp(average(proteinValues.map(value=>value/proteinTarget*100))):null;
 const proteinEvidence=proteinValues.length?`${proteinValues.length}일 단백질 기록 · 목표 ${Math.round(proteinTarget||0)}g/일`:(proteinTarget?'단백질 수치가 있는 식단 기록 필요':'프로필 체중 필요');

 const recoveryValues=checkins.map(recoveryReadiness).filter(value=>value!==null),recoveryScore=average(recoveryValues);
 const recoveryEvidence=recoveryValues.length?`${recoveryValues.length}회 회복 데이터`:'수면·에너지·스트레스·근육통 기록 필요';

 const bodySorted=body.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))),bodyWeight=bodySorted.map(row=>numericField(row,'weight')),bodyMuscle=bodySorted.map(row=>numericField(row,'muscle','muscleMass','skeletalMuscle')),bodyFat=bodySorted.map(row=>numericField(row,'fatPercent','bodyFatPercent','body_fat_percent'));
 let bodyValues=bodyWeight,favorable='stable',bodyMetric='체중';
 if(goal==='muscle_gain'&&bodyMuscle.filter(value=>value!==null).length>=2){bodyValues=bodyMuscle;favorable='up';bodyMetric='골격근량';}
 else if(goal==='fat_loss'&&bodyFat.filter(value=>value!==null).length>=2){bodyValues=bodyFat;favorable='down';bodyMetric='체지방률';}
 else if(goal==='fat_loss'){favorable='down';}
 else if(goal==='muscle_gain'){favorable='up';bodyMetric='체중';}
 const bodyScore=trendScore(bodyValues,favorable),bodyCount=bodyValues.filter(value=>value!==null).length;
 const bodyEvidence=bodyScore===null?(bodyCount?`${bodyMetric} 변화 판단에는 2회 이상 필요`:'체성분 기록 필요'):`${bodyCount}회 ${bodyMetric} 추세 · ${favorable==='down'?'감소':(favorable==='up'?'증가':'안정')} 기준`;

 const domains=[
   score('training','운동',[trainingScore],activityDays?`${activityDays}일 활동 · ${workouts.length+ runs.length}개 세션`:'운동·러닝 기록 필요',`${days}일`),
   score('nutrition','식단',[proteinScore],proteinEvidence,`${days}일`),
   score('recovery','회복',[recoveryScore],recoveryEvidence,`${days}일`),
   score('body','체성분',[bodyScore],bodyEvidence,`${days}일`)
 ];
 const measured=domains.filter(x=>x.score!==null),missingDomains=domains.filter(x=>x.score===null).map(x=>x.id),overall=measured.length>=2?Math.round(measured.reduce((s,x)=>s+x.score,0)/measured.length):null;
 const evidenceVolume=Math.min(1,(activityDays+proteinValues.length+recoveryValues.length+bodyCount)/12),confidence=Number((overall===null?0.2:0.35+measured.length*0.1+evidenceVolume*0.2).toFixed(2));
 return {version:'garang-goal-alignment-v1',goal,goalLabel:{muscle_gain:'근육 증가',fat_loss:'체지방 감소',running_performance:'러닝 퍼포먼스',performance:'퍼포먼스 향상',maintenance:'유지·건강'}[goal],overall,domains,measuredDomainCount:measured.length,missingDomains,confidence,planRate,period:{startDate:date(new Date(dayMs(end)-(days-1)*86400000).toISOString()),endDate:end,days},status:overall===null?'insufficient_data':'measured'};
}
return Object.freeze({VERSION:'garang-goal-alignment-v1',goalClass,summarize});
});
