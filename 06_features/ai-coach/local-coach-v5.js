/* FitMind V5 Local Personal Coach */
(function(){
"use strict";
const V5={version:"5.0.0",rules:[]};
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const today=()=>new Date().toISOString().slice(0,10);
const norm=s=>String(s||"").toLowerCase().replace(/\s+/g," ");
function totals(db){
 const ms=(db.meals||[]).filter(x=>x.date===today());
 return ms.reduce((a,x)=>({k:a.k+n(x.kcal??x.calories),p:a.p+n(x.protein),c:a.c+n(x.carbs??x.carbohydrate),f:a.f+n(x.fat)}),{k:0,p:0,c:0,f:0});
}
function remember(db,t,topic){
 db.coachMemory=db.coachMemory||{facts:[],topics:[],lastAdvice:"",updatedAt:""};
 db.coachMemory.topics=(db.coachMemory.topics||[]).slice(-19).concat([{topic,text:String(t),date:today()}]);
 db.coachMemory.updatedAt=new Date().toISOString();
}
function answer(text,p){
 const db=p.db||{}, q=norm(text), meals=totals(db), body=(db.body||[]).at(-1)||{}, ws=db.workouts||[], last=ws.at(-1);
 const wt=n(body.weight);
 if(/^(안녕|하이|ㅎㅇ|hi|hello)/i.test(q)) return {text:"오 ㅋㅋ 왔네. 오늘 운동이든 식단이든 기록 기준으로 같이 보자.",topic:"smalltalk"};
 if((q.includes("칼로리")||q.includes("kcal"))&&(q.includes("오늘")||q.includes("섭취")||q.includes("먹"))){
   const goal=n(db.profile?.dailyCalories??db.profile?.calorieGoal??db.profile?.targetCalories);
   return {text:`오늘 ${Math.round(meals.k).toLocaleString()}kcal 먹었어.${goal?` 권장량 ${Math.round(goal).toLocaleString()}kcal 기준으로 약 ${Math.max(0,Math.round(goal-meals.k)).toLocaleString()}kcal 남았어.`:" 권장칼로리가 설정돼 있으면 남은 양까지 계산해줄 수 있어."}`,topic:"nutrition"};
 }
 if((q.includes("칼로리")||q.includes("소모")||q.includes("소비"))&&q.includes("운동")){
   const kcal=ws.filter(x=>x.date===today()).reduce((a,x)=>a+n(x.calories),0);
   return {text:`오늘 운동 소비량은 기록상 약 ${Math.round(kcal)}kcal야. 운동 kcal은 추정치라 실제 소비량과 차이가 날 수 있어.`,topic:"exercise_kcal"};
 }
 if(q.includes("단백질")||q.includes("프로틴")){
   if(wt) return {text:`현재 ${wt}kg 기준으로 단백질은 대략 ${Math.round(wt*1.6)}~${Math.round(wt*2.2)}g 범위를 출발점으로 잡을 수 있어. 오늘은 ${meals.p.toFixed(1)}g 먹었어.`,topic:"protein"};
   return {text:`오늘 단백질은 ${meals.p.toFixed(1)}g 기록돼 있어. 체중을 기록하면 네 기준 목표량까지 계산해줄게.`,topic:"protein"};
 }
 if(q.includes("체중")||q.includes("몸무게")||q.includes("인바디")||q.includes("골격근")||q.includes("체지방")){
   if(!wt)return {text:"아직 최근 바디체크가 없어. 체중과 체성분을 기록해주면 추세로 봐줄게.",topic:"body"};
   let s=`최근 체중 ${wt}kg`;
   if(body.bodyFat??body.body_fat) s+=`, 체지방률 ${n(body.bodyFat??body.body_fat)}%`;
   if(body.skeletalMuscle??body.muscle) s+=`, 골격근량 ${n(body.skeletalMuscle??body.muscle)}kg`;
   return {text:s+". 한 번의 측정보다 같은 조건에서 쌓인 추세를 보는 게 좋아.",topic:"body"};
 }
 if(q.includes("회복")||q.includes("근육통")||q.includes("피곤")||q.includes("쉬어")){
   const recent=ws.filter(x=>x.date>=new Date(Date.now()-7*864e5).toISOString().slice(0,10)).length;
   return {text:`최근 7일 운동 기록은 ${recent}회야. 같은 부위의 마지막 훈련 간격과 볼륨까지 같이 봐야 회복을 제대로 판단할 수 있어.`,topic:"recovery"};
 }
 if(q.includes("운동")&&(q.includes("할까")||q.includes("뭐")||q.includes("추천"))){
   return {text:last?`최근 운동은 ${last.exercise||last.exercise_name||"기록된 운동"}이야. 오늘은 최근 부위와 겹치지 않으면서 회복된 쪽을 우선하자.`:"최근 운동 기록이 없어. 첫 기록을 남기면 다음부터 네 기록 기준으로 추천할게.",topic:"workout_recommendation"};
 }
 if(q.includes("식단")||q.includes("먹어")||q.includes("음식")||q.includes("배고")){
   return {text:`오늘 식단 ${db.meals?.filter(x=>x.date===today()).length||0}건, ${Math.round(meals.k)}kcal, 단백질 ${meals.p.toFixed(1)}g 기록돼 있어. 부족한 영양부터 맞추자.`,topic:"nutrition"};
 }
 if(q.includes("벤치")||q.includes("스쿼트")||q.includes("데드")||q.includes("중량")||q.includes("증량")){
   if(last)return {text:`최근 기록 ${last.exercise||"운동"}을 기준으로 보자. 목표 반복수를 안정적으로 채웠다면 다음 세션에 2.5~5% 정도 소폭 증량을 검토하고, 정체라면 RIR·휴식·볼륨부터 점검하자.`,topic:"progressive_overload"};
   return {text:"최근 운동 기록을 남겨주면 다음 중량을 기록 기준으로 잡아줄게.",topic:"progressive_overload"};
 }
 const mem=db.coachMemory?.topics||[];
 if(mem.length)return {text:`응, 기록 기준으로 같이 보자. 방금은 ${mem.at(-1).topic} 얘기를 했어. 운동·식단·체중 중 뭐부터 볼까?`,topic:"conversation"};
 return {text:"좋아. 이제부터 네 운동·식단·바디 기록을 같이 보고 답할게. 오늘 뭐가 궁금해?",topic:"conversation"};
}
V5.answer=answer;V5.remember=remember;window.FitMindV5=V5;
})();