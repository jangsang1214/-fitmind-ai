/* GARANG Goal Alignment v1
   Deterministic, evidence-backed fit to the user's model goal.
   A missing domain is unknown, never a zero and never an invented score.
*/
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.GarangGoalAlignment=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const list=v=>Array.isArray(v)?v:[],num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;},clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const date=v=>String(v||'').slice(0,10),dayMs=v=>{const x=Date.parse(`${date(v)}T12:00:00Z`);return Number.isFinite(x)?x:null;};
function goalClass(state){const g=String(state?.profile?.goal||state?.onboarding?.goal||'').toLowerCase();if(/근육|muscle|bulk|hypertrophy/.test(g))return'muscle_gain';if(/체지방|감량|fat.?loss|weight.?loss|cut/.test(g))return'fat_loss';if(/러닝|running|run/.test(g))return'running_performance';if(/퍼포먼스|performance|strength|기록 향상/.test(g))return'performance';return'maintenance';}
function rows(state,days,end){const endMs=dayMs(end),start=endMs-(days-1)*86400000;return list(state).filter(r=>{const t=dayMs(r?.date);return t!==null&&t>=start&&t<=endMs;});}
function score(id,label,values,evidence,period){const valid=values.filter(v=>v!==null);return {id,label,score:valid.length?Math.round(valid.reduce((a,b)=>a+b,0)/valid.length):null,evidence,period,status:valid.length?'measured':'insufficient_data'};}
function summarize(state,{days=30,endDate}={}){const end=date(endDate)||date(new Date().toISOString()),goal=goalClass(state),w=rows(state?.workouts,days,end),m=rows(state?.meals,days,end),r=rows(state?.runs,days,end),b=rows(state?.body,days,end),c=rows(state?.dailyCheckins?.length?state.dailyCheckins:state?.checkins,days,end),p=rows(state?.planner,days,end);
 const workoutDays=new Set(w.map(x=>date(x.date))).size,planDone=p.filter(x=>x.done===true||x.completed===true).length,planRate=p.length?planDone/p.length*100:null;
 const proteinTarget=num(state?.profile?.weight||state?.onboarding?.weight);const proteinDays=m.filter(x=>num(x.protein)>0).length,proteinScore=proteinDays?clamp(proteinTarget?m.reduce((s,x)=>s+Math.min(1,num(x.protein)/Math.max(1,proteinTarget*1.6)),0)/m.length*100:Math.min(100,proteinDays/days*100)):null;
 const trainingScore=w.length?clamp(Math.min(100,workoutDays/Math.max(1,num(state?.onboarding?.weeklyFrequency)||3*days/7)*100)):null;
 const recoveryScore=c.length?clamp(c.reduce((s,x)=>s+clamp((num(x.sleep??x.sleepHours)||0)/8*60+(10-(num(x.stress)||5))*4,0,100),0)/c.length):null;
 const bodyScore=b.length>=2?clamp(50+(goal==='muscle_gain'?Math.sign(num(b.at(-1).weight)-num(b[0].weight))*20:goal==='fat_loss'?-Math.sign(num(b.at(-1).weight)-num(b[0].weight))*20:0)):null;
 const domains=[score('training','운동',[trainingScore],`${workoutDays}일 운동 · ${w.length}개 세션`,`${days}일`),score('nutrition','식단',[proteinScore],`${proteinDays}일 단백질 기록`,`${days}일`),score('recovery','회복',[recoveryScore],`${c.length}회 회복 체크인`,`${days}일`),score('body','체성분',[bodyScore],b.length>=2?`${b.length}회 체성분 기록`:'체성분 기록 2개 이상 필요',`${days}일`)];
 const measured=domains.filter(x=>x.score!==null),overall=measured.length>=2?Math.round(measured.reduce((s,x)=>s+x.score,0)/measured.length):null;
 return {version:'garang-goal-alignment-v1',goal,goalLabel:{muscle_gain:'근육 증가',fat_loss:'체지방 감소',running_performance:'러닝 퍼포먼스',performance:'퍼포먼스 향상',maintenance:'유지·건강'}[goal],overall,domains,planRate,period:{startDate:date(new Date(dayMs(end)-(days-1)*86400000).toISOString()),endDate:end,days},status:overall===null?'insufficient_data':'measured'};
}
return Object.freeze({VERSION:'garang-goal-alignment-v1',goalClass,summarize});
});
