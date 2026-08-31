(function(root){
 'use strict';
 const num=x=>Number.isFinite(Number(x))?Number(x):0, cap=x=>Math.round(Math.max(0,Math.min(100,x)));
 function calculate(s,asOf=root.GarangSchema.date()){
  const end=new Date(asOf+'T23:59:59').getTime(),start=end-30*86400000;
  const recent=a=>(a||[]).filter(x=>{const d=new Date(x.date+'T12:00:00').getTime();return d>start&&d<=end;});
  const w=recent(s.workouts),m=recent(s.meals),r=recent(s.runs),b=recent(s.body),p=recent(s.planner);
  const sessions=new Set(w.map(x=>x.sessionId||x.id)).size;
  const days=new Set(m.map(x=>x.date)).size;
  const recovery=p.filter(x=>x.type==='recovery');
  // Behavioral recording/plan adherence, not a medical or body-quality assessment.
  const values={exercise:w.length?cap(sessions/12*100):null,nutrition:m.length?cap(days/30*100):null,recovery:recovery.length?cap(recovery.filter(x=>x.done).length/recovery.length*100):null,activity:r.length||w.length?cap(new Set([...r,...w].map(x=>x.date)).size/20*100):null,body:b.length?cap(b.filter(x=>num(x.weight)>0).length/3*100):null};
  const available=Object.values(values).filter(x=>x!==null);
  return {...values,total:available.length?cap(available.reduce((a,b)=>a+b,0)/available.length):null,coverage:available.length,date:asOf};
 }
 function achievements(s){
  const sessions=new Set(s.workouts.map(x=>x.sessionId||x.id)).size;
  const dates=[...new Set(s.planner.filter(x=>x.done).map(x=>x.date))].sort();let best=0,n=0,prev=null;
  dates.forEach(x=>{const d=new Date(x+'T12:00:00Z').getTime();n=prev&&d-prev===86400000?n+1:1;best=Math.max(best,n);prev=d;});
  return [['workout1',sessions,1],['workout10',sessions,10],['workout50',sessions,50],['meal1',s.meals.length,1],['run1',s.runs.filter(x=>num(x.distance)>0).length,1],['body1',s.body.length,1],['body3',s.body.length,3],['planner1',s.planner.length,1],['planner7',best,7],['runGoal',s.runs.reduce((max,x)=>Math.max(max,num(x.distance)),0),num(s.profile?.runningGoalKm)||5]].map(([id,value,target])=>({id,value,target,progress:cap(value/target*100),unlocked:value>=target}));
 }
 root.GarangPerformance={calculate,achievements};
})(typeof window==='undefined'?globalThis:window);
