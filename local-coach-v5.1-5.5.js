/* FitMind AI V5.5.1 — Integrated Local Coach
   Additive layer on V5.0.0. The chat UI calls FitMindV5.answer(), so this file
   intentionally wraps/extends the existing V5 answer path instead of creating
   an unused parallel engine.
*/
(function(){
"use strict";
const VERSION="5.5.1";
const DAY=86400000;
const N=v=>Number.isFinite(Number(v))?Number(v):0;
const A=v=>Array.isArray(v)?v:[];
const S=v=>String(v??"").trim();
const today=()=>new Date().toISOString().slice(0,10);
const norm=s=>S(s).toLowerCase().replace(/\s+/g," ");
const dt=v=>{const d=new Date(v);return isNaN(d)?null:d};
const recent=(a,days)=>A(a).filter(x=>{const d=dt(x?.date);return d&&d>=new Date(Date.now()-days*DAY)});
const mean=a=>a.length?a.reduce((s,x)=>s+N(x),0)/a.length:0;
const exercise=x=>S(x?.exercise||x?.exercise_name||x?.name);
const muscle=x=>S(x?.muscle||x?.primary_muscle||x?.target_muscle);
const kcal=x=>N(x?.kcal??x?.calories??x?.energy);
const prot=x=>N(x?.protein);
const wt=x=>N(x?.weight);
const reps=x=>N(x?.reps??x?.repetitions);
const sets=x=>Math.max(1,N(x?.sets)||1);

function profile(db){
 const p=db?.profile||{};
 return {goal:S(p.goal||p.target||p.objective),calorieGoal:N(p.dailyCalories??p.calorieGoal??p.targetCalories),
   weight:N(p.weight??p.currentWeight),height:N(p.height),targetWeight:N(p.targetWeight??p.goalWeight)};
}

/* ---------- V5.1: real data analysis ---------- */
function analyze(db){
 const ws=recent(db?.workouts,28), ms=recent(db?.meals,28), body=A(db?.body).filter(x=>wt(x)>0), p=profile(db);
 const byExercise={},byMuscle={},daily={},mealDaily={};
 ws.forEach(w=>{
   const e=exercise(w)||"기타",m=muscle(w)||"미분류",d=w.date||today();
   byExercise[e]??={sessions:0,totalSets:0,totalReps:0,maxWeight:0,lastDate:null};
   byExercise[e].sessions++;byExercise[e].totalSets+=sets(w);byExercise[e].totalReps+=reps(w)*sets(w);
   byExercise[e].maxWeight=Math.max(byExercise[e].maxWeight,wt(w));byExercise[e].lastDate=w.date||null;
   byMuscle[m]??={sessions:0,totalSets:0};byMuscle[m].sessions++;byMuscle[m].totalSets+=sets(w);
   daily[d]??={workouts:0,kcal:0};daily[d].workouts++;daily[d].kcal+=kcal(w);
 });
 ms.forEach(m=>{const d=m.date||today();mealDaily[d]??={kcal:0,protein:0};mealDaily[d].kcal+=kcal(m);mealDaily[d].protein+=prot(m)});
 const md=Object.values(mealDaily), b=body.slice().sort((x,y)=>String(x.date).localeCompare(String(y.date)));
 const last=b.at(-1)||{},first=b[0]||{};
 return {periodDays:28,workouts:ws.length,workoutKcal:ws.reduce((s,x)=>s+kcal(x),0),
   weeklySets:Math.round(ws.reduce((s,x)=>s+sets(x),0)/4*10)/10,byExercise,byMuscle,daily,mealDaily,
   avgDailyKcal:mean(md.map(x=>x.kcal).filter(x=>x>0)),avgDailyProtein:mean(md.map(x=>x.protein).filter(x=>x>0)),
   latestWeight:wt(last),firstWeight:wt(first),weightDelta:wt(last)-wt(first),
   bodyFat:N(last.bodyFat??last.body_fat),muscleMass:N(last.skeletalMuscle??last.muscle??last.skeletal_muscle),goal:p.goal};
}

/* ---------- V5.2: compatible memory ---------- */
function ensureMemory(db){
 db.coachMemory=db.coachMemory||{};
 const m=db.coachMemory;
 m.facts=A(m.facts);m.topics=A(m.topics);m.advice=A(m.advice);m.feedback=A(m.feedback);m.preferences=m.preferences||{};
 m.updatedAt=m.updatedAt||new Date().toISOString();return m;
}
function remember(db,item,legacyTopic){
 const m=ensureMemory(db);
 /* Preserve the V5.0 signature: remember(db,text,topic). */
 if(typeof item==="string"){
   m.topics=m.topics.slice(-49).concat([{topic:S(legacyTopic||"conversation"),text:item,date:today()}]);
   m.updatedAt=new Date().toISOString();return;
 }
 item=item||{};
 if(item.type==="fact")m.facts=m.facts.slice(-99).concat([{text:S(item.text),date:today()}]);
 if(item.type==="topic")m.topics=m.topics.slice(-49).concat([{text:S(item.text),topic:S(item.topic),date:today()}]);
 if(item.type==="advice")m.advice=m.advice.slice(-49).concat([{text:S(item.text),date:today(),context:item.context||{}}]);
 if(item.type==="feedback")m.feedback=m.feedback.slice(-49).concat([{text:S(item.text),result:S(item.result),date:today(),exercise:S(item.exercise)}]);
 m.updatedAt=new Date().toISOString();
}
function recall(db,key){
 const q=norm(key),m=ensureMemory(db);
 return [...m.facts,...m.topics,...m.advice,...m.feedback].filter(x=>norm(x.text).includes(q)).slice(-10);
}

/* ---------- V5.3: decision ---------- */
function decide(db,q0){
 const q=norm(q0),a=analyze(db),p=profile(db),flags=[];
 if(a.avgDailyKcal&&p.calorieGoal&&a.avgDailyKcal<p.calorieGoal*.85)flags.push("평균 섭취량이 목표보다 낮음");
 if(a.avgDailyProtein&&a.latestWeight&&a.avgDailyProtein<a.latestWeight*1.4)flags.push("단백질 섭취가 낮을 가능성");
 if(a.workouts>=10)flags.push("최근 4주 운동 빈도가 높음");
 if(a.weightDelta<0&&(p.goal.includes("근육")||p.goal.includes("증량")))flags.push("최근 체중 하락");
 if(/쉬|회복|피곤|근육통/.test(q))return{decision:"recovery",confidence:.8,flags};
 if(/벤치|스쿼트|데드|중량|증량|몇 ?키로/.test(q))return{decision:"progress",confidence:.82,flags};
 if(/식단|먹|칼로리|단백질/.test(q))return{decision:"nutrition",confidence:.82,flags};
 return{decision:"analyze",confidence:.65,flags};
}

/* ---------- V5.4: routine ---------- */
function routine(db,focus){
 const f=S(focus)||"전신",last={};
 A(db.workouts).forEach(w=>{const n=exercise(w);if(n)last[n]=w});
 const rows=Object.entries(last).filter(([n,w])=>f==="전신"||n.includes(f)||muscle(w).includes(f)).slice(-8);
 return {focus:f,exercises:rows.map(([n,w])=>({exercise:n,sets:sets(w),targetReps:reps(w)?`${Math.max(5,reps(w))}-${Math.min(12,reps(w)+2)}`:"8-12",
   suggestedWeight:wt(w)?Math.round(wt(w)*1.025*2)/2:null}))};
}

/* ---------- V5.5: feedback learning ---------- */
function learn(db,f){
 const m=ensureMemory(db),key=S(f?.exercise||"general");m.preferences.learning=m.preferences.learning||{};
 m.preferences.learning[key]??={success:0,fail:0,adjustment:0};
 const x=m.preferences.learning[key],r=S(f?.result||"");
 if(/성공|여유|쉬웠|잘 됨|가벼|충분/.test(r)){x.success++;x.adjustment=Math.min(5,x.adjustment+.5)}
 if(/실패|무거|힘들|못 했|안 됨|어려/.test(r)){x.fail++;x.adjustment=Math.max(-5,x.adjustment-.5)}
 remember(db,{type:"feedback",exercise:key,text:S(f?.text||f?.message),result:r});return x;
}

/* ---------- Natural language workout parser ---------- */
function parseWorkout(text){
 const q=S(text);
 const kg=q.match(/(\d+(?:\.\d+)?)\s*(?:kg|킬로|키로)/i);
 const rr=q.match(/(\d+)\s*(?:회|방|개)/i);
 const ss=q.match(/(\d+)\s*(?:세트|셋트)/i);
 const name=/벤치/.test(q)?"바벨 벤치프레스":/스쿼트/.test(q)?"바벨 스쿼트":/데드/.test(q)?"컨벤셔널 데드리프트":
   /오버헤드|ohp/.test(q.toLowerCase())?"바벨 오버헤드프레스":null;
 if(!name||(!kg&&!rr))return null;
 return {exercise:name,weight:kg?N(kg[1]):0,reps:rr?N(rr[1]):0,sets:ss?N(ss[1]):1};
}
function recentExercise(db,name){
 return A(db.workouts).filter(w=>exercise(w)===name||exercise(w).includes(name)||name.includes(exercise(w))).slice(-8);
}
function progressAnswer(db,parsed){
 const hist=recentExercise(db,parsed.exercise),p=hist.at(-1),a=analyze(db);
 if(!parsed.weight)return null;
 let msg=`확인했어. ${parsed.exercise} ${parsed.weight}kg × ${parsed.reps||"-"}회`;
 if(parsed.sets>1)msg+=` × ${parsed.sets}세트`;
 msg+=".";
 if(p){
   const delta=parsed.weight-wt(p);
   msg+=` 최근 기록 ${wt(p)}kg × ${reps(p)||"-"}회`;
   if(delta>0)msg+=`에서 ${delta}kg 올라왔네.`;
   else if(delta===0)msg+="와 같은 중량이야.";
   else msg+=`보다 ${Math.abs(delta)}kg 낮아.`;
 }
 const learning=ensureMemory(db).preferences.learning?.[parsed.exercise];
 if(learning?.adjustment>0)msg+=` 이전에 이 운동에서 여유가 있었다는 피드백도 반영할게.`;
 if(learning?.adjustment<0)msg+=` 이전에 무겁다고 했던 피드백이 있어서 보수적으로 볼게.`;
 if(parsed.reps>=8)msg+=" 다음 세션은 같은 중량에서 반복수를 한 번 더 확보하거나, 컨디션이 좋다면 2.5kg 정도만 올리는 쪽이 안전해.";
 else msg+=" 다음 세션은 같은 중량을 유지하면서 반복수를 먼저 확보하는 쪽이 좋아 보여.";
 return msg;
}

/* ---------- Natural everyday conversation ---------- */
const casual=[
 [/^(안녕|하이|ㅎㅇ|hello|hi|좋은 아침|잘자|잘 자)/i,()=>["오 왔네 ㅋㅋ 오늘은 뭐 얘기해볼까?","왔구나 ㅋㅋ 운동 얘기 아니어도 돼. 그냥 얘기해도 돼.","오랜만이네 ㅋㅋ 오늘 하루 어땠어?"][Math.floor(Math.random()*3)]],
 [/^(ㅋㅋ+|ㅋ{2,})$/,()=>["ㅋㅋㅋㅋ 왜 웃겨","ㅋㅋ 뭐 있었어?","ㅋㅋㅋㅋ 나도 웃김"][Math.floor(Math.random()*3)]],
 [/(오늘|하루).*(어땠|망했|힘들|좋았)/,()=>["오늘 꽤 빡센 하루였나 보네. 뭐가 제일 힘들었어?","그래도 하루 끝까지 왔네 ㅋㅋ 뭐 때문에 그랬어?","좋았든 망했든 일단 오늘은 오늘이지. 무슨 일 있었어?"][Math.floor(Math.random()*3)]],
 [/(피곤|지쳤|힘들다|힘들어|졸려)/,()=>["오늘 좀 많이 지쳤구나. 지금은 무리해서 뭔가 더 하기보다 쉬는 게 낫겠다.","피곤하면 일단 물 좀 마시고 잠깐 쉬자. 오늘 운동까지 했다면 더더욱.","그럴 때 있지. 지금 당장 해결하려고 하지 말고 오늘은 몸부터 쉬게 해줘."][Math.floor(Math.random()*3)]],
 [/(기분.*(안 좋|별로|우울)|짜증|빡쳐|화나)/,()=>["아 그건 좀 짜증났겠다. 무슨 일 있었어?","그럴 만한 일이 있었나 보네. 얘기하고 싶으면 해봐.","오늘은 그냥 내가 들어줄게. 무슨 일인데?"][Math.floor(Math.random()*3)]],
 [/(좋다|좋아|기분 좋|신난)/,()=>["오 좋은데 ㅋㅋ 무슨 좋은 일 있었어?","그 기분 그대로 가자 ㅋㅋ 오늘 뭐 했어?","좋네. 오늘은 뭔가 잘 풀리는 날인가 보다 ㅋㅋ"][Math.floor(Math.random()*3)]],
 [/(뭐해|뭐 하고|심심)/,()=>["나야 네 기록 보고 대기 중이지 ㅋㅋ 너는 뭐해?","심심하면 얘기하자 ㅋㅋ 요즘 뭐에 제일 꽂혀 있어?","ㅋㅋ 그럼 오늘 아무 얘기나 해보자."][Math.floor(Math.random()*3)]],
 [/(고마워|감사|ㄱㅅ)/,()=>["ㅋㅋ 별말을. 같이 맞춰가면 되지.","언제든지. 기록 쌓이면 더 정확하게 봐줄게.","ㅇㅋ ㅋㅋ 다음 것도 가져와."][Math.floor(Math.random()*3)]],
 [/(미안|죄송)/,()=>["괜찮아 ㅋㅋ 그럴 수 있지.","괜찮아. 굳이 미안해하지 않아도 돼.","ㄱㅊㄱㅊ ㅋㅋ 다시 보면 돼."][Math.floor(Math.random()*3)]],
 [/(잠|잘까|자야|취침)/,()=>["응, 지금 피곤하면 자는 게 제일 이득이야. 회복도 운동의 일부니까.","오늘 할 거 다 했으면 자자 ㅋㅋ 내일 이어가면 돼.","수면부터 챙기자. 내일 컨디션이 훨씬 중요해."][Math.floor(Math.random()*3)]]
];

function casualAnswer(q){
 for(const [re,fn] of casual)if(re.test(q))return fn();
 return null;
}

/* ---------- Integrated answer: this replaces the V5.0 chat path ---------- */
const base=window.FitMindV5?.answer;
function answer(text,ctx){
 const db=ctx?.db||{},q=S(text),nq=norm(q);
 const casualText=casualAnswer(q);
 if(casualText && !/칼로리|단백질|운동|벤치|스쿼트|데드|식단|체중|체지방|골격근|중량/.test(nq)){
   remember(db,{type:"topic",topic:"smalltalk",text:q});return{text:casualText,topic:"smalltalk",engine:VERSION};
 }
 const parsed=parseWorkout(q);
 if(parsed){
   const out=progressAnswer(db,parsed);
   if(out){remember(db,{type:"topic",topic:"workout_feedback",text:q});return{text:out,topic:"progressive_overload",engine:VERSION}}
 }
 if(/내 목표|내가 뭐.*목표|기억.*목표/.test(nq)){
   const p=profile(db);const m=ensureMemory(db);
   const facts=m.facts.filter(x=>x.text).slice(-5);
   return{text:p.goal?`기억하고 있어. 현재 목표는 ${p.goal}이야.`:(facts.length?`기억해둔 내용은 ${facts.at(-1).text}야.`:"아직 명확하게 저장된 목표가 없어. 목표를 말해주면 기억해둘게."),topic:"memory",engine:VERSION};
 }
 if(/기억해|기억하자|앞으로.*(할게|하고 싶|목표)/.test(nq)){
   remember(db,{type:"fact",text:q});return{text:"ㅇㅋ, 이건 기억해둘게. 다음에 관련 얘기할 때 같이 참고할게.",topic:"memory",engine:VERSION};
 }
 if(/최근.*(분석|운동량|볼륨)|4주.*운동|운동.*추세/.test(nq)){
   const a=analyze(db);
   return{text:`최근 4주 기준으로 ${a.workouts}회 운동했고 주당 평균 세트는 약 ${a.weeklySets}세트야. 총 운동 소모 추정량은 약 ${Math.round(a.workoutKcal)}kcal야. ${a.avgDailyProtein?`평균 단백질은 약 ${a.avgDailyProtein.toFixed(1)}g이야.`:"식단 기록이 더 쌓이면 단백질 추세도 볼 수 있어."}`,topic:"analysis",engine:VERSION};
 }
 if(/오늘.*(상태|컨디션)|현재.*상태/.test(nq)){
   const d=decide(db,q);return{text:`지금 기록 기준으로는 ${d.decision==="recovery"?"회복을 우선":d.decision==="nutrition"?"영양을 먼저 점검":"운동 기록을 기준으로 다음 행동을 판단"}하는 게 좋아 보여.${d.flags.length?` 체크할 점은 ${d.flags.join(", ")}야.`:" 아직 큰 경고 신호는 기록에서 안 보여."}`,topic:"decision",engine:VERSION};
 }
 if(/(루틴|운동).*짜|오늘.*가슴|오늘.*등|오늘.*어깨|오늘.*하체/.test(nq)){
   const focus=/가슴/.test(nq)?"가슴":/등/.test(nq)?"등":/어깨/.test(nq)?"어깨":/하체/.test(nq)?"하체":"전신";
   const r=routine(db,focus);
   if(r.exercises.length)return{text:`최근 기록 기준 ${focus} 루틴을 잡아봤어.\n${r.exercises.map(x=>`• ${x.exercise}: ${x.sets}세트 × ${x.targetReps}${x.suggestedWeight?` / 추천 ${x.suggestedWeight}kg`:""}`).join("\n")}\n컨디션과 RIR에 따라 ±2.5kg 정도 조정하면 돼.`,topic:"routine",engine:VERSION};
 }
 if(/벤치|스쿼트|데드|중량|증량/.test(nq)){
   const d=decide(db,q),h=A(db.workouts).slice(-8).filter(w=>/벤치|스쿼트|데드/.test(exercise(w)));
   if(h.length){const x=h.at(-1);return{text:`최근 ${exercise(x)} 기록은 ${wt(x)}kg × ${reps(x)}회${sets(x)>1?` × ${sets(x)}세트`:""}야. 목표 반복수를 안정적으로 채웠다면 다음 세션은 2.5kg 정도의 작은 증량을 검토하고, 아니면 같은 중량에서 반복수 확보가 우선이야.${d.flags.length?` 지금은 ${d.flags.join(", ")}도 같이 보고 있어.`:""}`,topic:"progressive_overload",engine:VERSION}}
 }
 /* Fallback to the original V5.0 coach, preserving every existing domain rule. */
 if(typeof base==="function"){
   const r=base(text,ctx);
   if(r?.text)return Object.assign({},r,{engine:r.engine||"v5.0-fallback"});
 }
 return {text:"좋아. 운동·식단·체중 얘기든 그냥 일상 얘기든 편하게 말해줘.",topic:"conversation",engine:VERSION};
}

window.FitMindV55=window.FitMindV55||{};
Object.assign(window.FitMindV55,{version:VERSION,analyze,remember,recall,decide,generateRoutine:routine,learn,parseWorkout});
if(window.FitMindV5){
 window.FitMindV5.answer=answer;
 window.FitMindV5.remember=remember;
 window.FitMindV5.version=VERSION;
}
})();
