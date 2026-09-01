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
  return {...values,total:available.length?cap(available.reduce((a,b)=>a+b,0)/available.length):null,coverage:available.length,date:asOf,formulaVersion:root.GarangSchema.SCORE_FORMULA_VERSION};
 }
 function achievements(s){
  const sessions=new Set(s.workouts.map(x=>x.sessionId||x.id)).size;
  const dates=[...new Set(s.planner.filter(x=>x.done).map(x=>x.date))].sort();let best=0,n=0,prev=null;
  dates.forEach(x=>{const d=new Date(x+'T12:00:00Z').getTime();n=prev&&d-prev===86400000?n+1:1;best=Math.max(best,n);prev=d;});
  return [['workout1',sessions,1],['workout10',sessions,10],['workout50',sessions,50],['meal1',s.meals.length,1],['run1',s.runs.filter(x=>num(x.distance)>0).length,1],['body1',s.body.length,1],['body3',s.body.length,3],['planner1',s.planner.length,1],['planner7',best,7],['runGoal',Math.max(0,...s.runs.map(x=>num(x.distance))),num(s.profile?.runningGoalKm)||5]].map(([id,value,target])=>({id,value,target,progress:cap(value/target*100),unlocked:value>=target}));
 }
 function coachSummary(score,language='ko'){
  if(score?.total==null)return language==='en'?'There is not enough recorded data to calculate a Performance Score yet. Log at least one workout, meal, run, body measurement or recovery plan first.':'아직 Performance Score를 계산할 기록이 부족해. 운동·식단·러닝·체성분·회복 계획 중 하나를 먼저 기록해 줘.';
  const value=x=>x??(language==='en'?'no data':'데이터 없음');
  return language==='en'?`Your current GARANG Performance Score is ${score.total}/100: Exercise ${value(score.exercise)}, Nutrition ${value(score.nutrition)}, Recovery ${value(score.recovery)}, Activity ${value(score.activity)}, Body ${value(score.body)}. Start with one action in your lowest recorded area for the clearest improvement.`:`현재 GARANG Performance Score는 ${score.total}/100이야. 운동 ${value(score.exercise)}, 영양 ${value(score.nutrition)}, 회복 ${value(score.recovery)}, 활동 ${value(score.activity)}, 체성분 ${value(score.body)}로 계산했어. 점수를 올리려면 가장 낮은 기록 영역부터 한 가지 행동을 고르는 게 효율적이야.`;
 }
 function workoutInsights(s,exerciseDb=[]){
  const muscleByName=new Map(exerciseDb.map(x=>[String(x.exercise_name||'').trim().toLowerCase(),String(x.primary_muscle||'기타')]));
  const records=(s.workouts||[]).map((x,index)=>{const weight=Math.max(0,num(x.weight)),sets=Math.max(0,num(x.sets)),reps=Math.max(0,num(x.reps)),volume=Math.max(0,num(x.volume)||weight*sets*reps),estimated1RM=weight&&reps?Math.round(weight*(1+Math.min(reps,30)/30)*10)/10:0,name=String(x.name||'이름 없는 운동'),primaryMuscle=String(x.primaryMuscle||muscleByName.get(name.trim().toLowerCase())||'기타');return {...x,name,primaryMuscle,weight,sets,reps,volume,estimated1RM,_order:index};}).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(num(b.createdAt)-num(a.createdAt))||(b._order-a._order));
  const pickMax=(items,key)=>items.filter(x=>num(x[key])>0).sort((a,b)=>num(b[key])-num(a[key])||String(b.date||'').localeCompare(String(a.date||'')))[0]||null;
  const exerciseMap=new Map();
  for(const record of records){if(!exerciseMap.has(record.name))exerciseMap.set(record.name,[]);exerciseMap.get(record.name).push(record);}
  const exercises=[...exerciseMap].map(([name,items])=>({name,primaryMuscle:items[0].primaryMuscle,latest:items[0],count:items.length,maxWeight:pickMax(items,'weight'),maxEstimated1RM:pickMax(items,'estimated1RM'),maxVolume:pickMax(items,'volume')})).sort((a,b)=>String(b.latest.date||'').localeCompare(String(a.latest.date||''))||a.name.localeCompare(b.name));
  const muscleMap=new Map();
  for(const record of records){if(!muscleMap.has(record.primaryMuscle))muscleMap.set(record.primaryMuscle,[]);muscleMap.get(record.primaryMuscle).push(record);}
  const byMuscle=[...muscleMap].map(([name,items])=>({name,records:items,recordCount:items.length,sessionCount:new Set(items.map(x=>x.sessionId||x.id)).size,totalVolume:Math.round(items.reduce((sum,x)=>sum+x.volume,0)),latestDate:items[0]?.date||''})).sort((a,b)=>b.latestDate.localeCompare(a.latestDate)||b.totalVolume-a.totalVolume);
  return {records,exercises,byMuscle,topWeight:pickMax(records,'weight'),topEstimated1RM:pickMax(records,'estimated1RM'),topVolume:pickMax(records,'volume')};
 }
 function formatPace(value){const pace=Number(value);if(!Number.isFinite(pace)||pace<=0)return '—';let total=Math.round(pace*60),minutes=Math.floor(total/60),seconds=total%60;if(seconds===60){minutes++;seconds=0;}return `${minutes}:${String(seconds).padStart(2,'0')}`;}
 function runningInsights(s){
  const records=(s.runs||[]).map((x,index)=>{const distance=Math.max(0,num(x.distance)),duration=Math.max(0,num(x.duration)),stored=Number(x.pace),pace=Number.isFinite(stored)&&stored>0?stored:distance&&duration?duration/distance:0;return {...x,distance,duration,pace,_order:index};}).filter(x=>x.distance>0&&x.duration>0).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(num(b.createdAt)-num(a.createdAt))||(b._order-a._order));
  const totalDistance=records.reduce((sum,x)=>sum+x.distance,0),totalDuration=records.reduce((sum,x)=>sum+x.duration,0),fastest=records.slice().sort((a,b)=>a.pace-b.pace||String(b.date||'').localeCompare(String(a.date||'')))[0]||null,longest=records.slice().sort((a,b)=>b.distance-a.distance||String(b.date||'').localeCompare(String(a.date||'')))[0]||null;
  return {records,count:records.length,totalDistance,totalDuration,averagePace:totalDistance?totalDuration/totalDistance:null,fastest,longest,latest:records[0]||null};
 }
 root.GarangPerformance={calculate,achievements,coachSummary,workoutInsights,runningInsights,formatPace};
})(typeof window==='undefined'?globalThis:window);
