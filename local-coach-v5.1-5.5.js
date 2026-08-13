/* FitMind AI V5.5 — Personal Coach Intelligence Layer
   Built additively on top of V5.0.0. Does not replace existing app features.
*/
(function(){
"use strict";
const VERSION="5.5.0";
const dayMs=86400000;
const now=()=>new Date();
const today=()=>now().toISOString().slice(0,10);
const N=v=>Number.isFinite(Number(v))?Number(v):0;
const arr=v=>Array.isArray(v)?v:[];
const txt=v=>String(v??"").trim();
const dateVal=v=>{const d=new Date(v);return isNaN(d)?null:d};
const recent=(a,days)=>{const cut=new Date(Date.now()-days*dayMs);return arr(a).filter(x=>{const d=dateVal(x.date);return d&&d>=cut;});};
const mean=(a)=>a.length?a.reduce((s,x)=>s+N(x),0)/a.length:0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

function exerciseName(x){return txt(x?.exercise||x?.exercise_name||x?.name);}
function muscle(x){return txt(x?.muscle||x?.primary_muscle||x?.target_muscle);}
function kcal(x){return N(x?.kcal??x?.calories??x?.energy);}
function protein(x){return N(x?.protein);}
function weight(x){return N(x?.weight);}
function reps(x){return N(x?.reps??x?.repetitions);}
function sets(x){return N(x?.sets)||1;}

function profile(db){
  const p=db?.profile||{};
  return {
    goal:txt(p.goal||p.target||p.objective),
    calorieGoal:N(p.dailyCalories??p.calorieGoal??p.targetCalories),
    weightGoal:N(p.targetWeight??p.goalWeight),
    height:N(p.height),
    weight:N(p.weight)
  };
}

/* V5.1 — Data analysis */
function analyze(db){
  const ws=recent(db?.workouts,28), ms=recent(db?.meals,28), body=recent(db?.body,90), p=profile(db);
  const byExercise={}, byMuscle={}, daily={};
  ws.forEach(w=>{
    const e=exerciseName(w)||"기타", m=muscle(w)||"미분류";
    byExercise[e]??={sessions:0,totalSets:0,totalReps:0,maxWeight:0,lastDate:null};
    byExercise[e].sessions++; byExercise[e].totalSets+=sets(w); byExercise[e].totalReps+=reps(w)*sets(w);
    byExercise[e].maxWeight=Math.max(byExercise[e].maxWeight,weight(w));
    byExercise[e].lastDate=w.date||byExercise[e].lastDate;
    byMuscle[m]??={sessions:0,totalSets:0};
    byMuscle[m].sessions++; byMuscle[m].totalSets+=sets(w);
    const d=w.date||today(); daily[d]??={workouts:0,kcal:0}; daily[d].workouts++; daily[d].kcal+=kcal(w);
  });
  const mealDaily={};
  ms.forEach(m=>{
    const d=m.date||today(); mealDaily[d]??={kcal:0,protein:0};
    mealDaily[d].kcal+=kcal(m); mealDaily[d].protein+=protein(m);
  });
  const weights=body.filter(x=>weight(x)>0);
  const latest=weights.at(-1)||{};
  const previous=weights.length>1?weights.at(-2):null;
  const first=weights[0]||{};
  const calories=Object.values(mealDaily).map(x=>x.kcal).filter(x=>x>0);
  const prots=Object.values(mealDaily).map(x=>x.protein).filter(x=>x>0);
  return {
    periodDays:28, workouts:ws.length, workoutKcal:ws.reduce((s,x)=>s+kcal(x),0),
    weeklySets:Math.round(ws.reduce((s,x)=>s+sets(x),0)/4*10)/10,
    byExercise,byMuscle,daily,mealDaily,
    avgDailyKcal:mean(calories),avgDailyProtein:mean(prots),
    latestWeight:weight(latest),previousWeight:weight(previous),firstWeight:weight(first),
    weightDelta:weight(latest)-weight(first),
    bodyFat:N(latest.bodyFat??latest.body_fat),muscleMass:N(latest.skeletalMuscle??latest.muscle??latest.skeletal_muscle),
    goal:p.goal
  };
}

/* V5.2 — Short/long memory */
function ensureMemory(db){
  db.coachMemory=db.coachMemory||{};
  const m=db.coachMemory;
  m.facts=arr(m.facts); m.topics=arr(m.topics); m.advice=arr(m.advice);
  m.feedback=arr(m.feedback); m.preferences=m.preferences||{};
  m.updatedAt=m.updatedAt||new Date().toISOString();
  return m;
}
function remember(db,item){
  const m=ensureMemory(db);
  if(item.type==="fact")m.facts=m.facts.slice(-99).concat([{text:txt(item.text),date:today()}]);
  if(item.type==="topic")m.topics=m.topics.slice(-49).concat([{text:txt(item.text),topic:txt(item.topic),date:today()}]);
  if(item.type==="advice")m.advice=m.advice.slice(-49).concat([{text:txt(item.text),date:today(),context:item.context||{}}]);
  if(item.type==="feedback")m.feedback=m.feedback.slice(-49).concat([{text:txt(item.text),result:txt(item.result),date:today()}]);
  m.updatedAt=new Date().toISOString();
}
function recall(db,keyword){
  const m=ensureMemory(db), q=txt(keyword).toLowerCase();
  return [...m.facts,...m.topics,...m.advice,...m.feedback].filter(x=>txt(x.text).toLowerCase().includes(q)).slice(-10);
}

/* V5.3 — Decision engine */
function decide(db,query){
  const a=analyze(db), m=ensureMemory(db), q=txt(query).toLowerCase(), p=profile(db);
  const flags=[];
  if(a.workouts>=6 && a.avgDailyKcal>0 && p.calorieGoal>0 && a.avgDailyKcal<p.calorieGoal*0.85)flags.push("섭취량 부족 가능성");
  if(a.avgDailyProtein>0 && a.latestWeight>0 && a.avgDailyProtein<a.latestWeight*1.4)flags.push("단백질 부족 가능성");
  if(a.workouts>=10)flags.push("최근 운동 빈도 높음");
  if(a.weightDelta<0 && (p.goal.includes("근육")||p.goal.includes("증량")))flags.push("체중 하락 중");
  if(q.includes("쉬")||q.includes("회복")) return {decision:"recovery",confidence:.78,flags,reason:"최근 운동량과 기록을 우선 확인하고 회복 상태를 보수적으로 판단."};
  if(q.includes("중량")||q.includes("증량")||q.includes("벤치")||q.includes("스쿼트")||q.includes("데드")) return {decision:"progress",confidence:.74,flags,reason:"최근 동일 운동의 중량·반복·세트 기록을 기준으로 작은 폭의 점진적 과부하를 우선 검토."};
  if(q.includes("식단")||q.includes("먹")||q.includes("칼로리")||q.includes("단백질")) return {decision:"nutrition",confidence:.82,flags,reason:"최근 섭취 평균과 목표 칼로리·체중을 함께 비교."};
  return {decision:"analyze",confidence:.6,flags,reason:"운동·영양·체성분의 최근 추세를 함께 확인."};
}

/* V5.4 — Routine generator */
function generateRoutine(db,focus){
  const a=analyze(db), ws=arr(db.workouts), f=txt(focus)||"전신";
  const lastBy={};
  ws.forEach(w=>{const n=exerciseName(w);if(n)lastBy[n]=w;});
  const candidates=Object.entries(lastBy).filter(([n,w])=>{
    const mm=muscle(w); return !f||f==="전신"||n.includes(f)||mm.includes(f);
  }).sort((x,y)=>(dateVal(x[1].date)||0)-(dateVal(y[1].date)||0)).slice(-6);
  const routine=candidates.map(([name,w])=>{
    const kg=weight(w), r=reps(w);
    return {exercise:name,sets:sets(w),targetReps:r?`${Math.max(5,r)}-${Math.min(12,r+2)}`:"8-12",suggestedWeight:kg?Math.round(kg*1.025*2)/2:null,reason:"지난 기록에서 소폭 점진적 증가"};
  });
  if(!routine.length) return {focus:f,exercises:[],note:"기존 기록이 부족해 기본 루틴 대신 첫 기록을 남기는 것을 우선."};
  return {focus:f,exercises:routine,note:"실제 컨디션과 RPE/RIR에 따라 중량을 조정."};
}

/* V5.5 — Feedback learning */
function learn(db,feedback){
  const f=feedback||{}, result=f.result||"";
  remember(db,{type:"feedback",text:f.text||f.message||"",result});
  const key=txt(f.exercise||"general");
  const m=ensureMemory(db);
  m.preferences.learning=m.preferences.learning||{};
  m.preferences.learning[key]??={success:0,fail:0,adjustment:0};
  const x=m.preferences.learning[key];
  if(/성공|쉬움|여유|잘 됨|성공함/i.test(result)){x.success++;x.adjustment+=0.5;}
  if(/실패|어려|무거|못|힘듦/i.test(result)){x.fail++;x.adjustment-=0.5;}
  x.adjustment=clamp(x.adjustment,-5,5);
  m.updatedAt=new Date().toISOString();
  return x;
}

function status(db){
  const a=analyze(db);
  return {
    version:VERSION,analysis:a,
    memory:ensureMemory(db),
    decision:decide(db,"현재 상태"),
    generatedAt:new Date().toISOString()
  };
}
window.FitMindV55={version:VERSION,analyze,remember,recall,decide,generateRoutine,learn,status};
})();