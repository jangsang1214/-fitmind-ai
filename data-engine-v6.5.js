/* FitMind AI V6.5 — Personal Data Engine + Coach Tools + Goals + Trends + Memory UI */
(function(){
"use strict";
const KEY="fitmind_v2", GOAL_KEY="fitmind_v65_goal";
const db=()=>window.__FitMindV6DB?window.__FitMindV6DB():JSON.parse(localStorage.getItem(KEY)||'{}');
const save=()=>window.__FitMindV6Save?window.__FitMindV6Save():localStorage.setItem(KEY,JSON.stringify(db()));
const day=new Date(); const iso=d=>new Date(d).toISOString().slice(0,10);
const today=iso(day);
const n=x=>Number(x)||0;
function goal(){
 const d=db(), p=d.profile||{}, g=JSON.parse(localStorage.getItem(GOAL_KEY)||"null")||{};
 return Object.assign({type:"maintain",targetWeight:null,targetCalories:null,targetProtein:null,targetStrength:null},g,
   {weight:p.weight??g.weight??null});
}
function setGoal(g){localStorage.setItem(GOAL_KEY,JSON.stringify(Object.assign(goal(),g)));return goal();}
function mealsToday(){
 const d=db();return (d.meals||[]).filter(x=>iso(x.date||x.createdAt||today)===today);
}
function workoutsToday(){
 const d=db();return (d.workouts||[]).filter(x=>iso(x.date||x.createdAt||today)===today);
}
function mealTotals(){
 return mealsToday().reduce((a,m)=>{
   a.kcal+=n(m.kcal||m.calories);a.protein+=n(m.protein);a.carbs+=n(m.carbs);a.fat+=n(m.fat);return a;
 },{kcal:0,protein:0,carbs:0,fat:0});
}
function workoutKcal(){
 return workoutsToday().reduce((a,w)=>a+n(w.kcal||w.calories||w.calorieBurn),0);
}
function bodyHistory(){
 const d=db();return (d.body||[]).filter(x=>x.weight!=null).sort((a,b)=>new Date(a.date)-new Date(b.date));
}
function avg(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;}
function trend(){
 const h=bodyHistory(), recent=h.slice(-7), prior=h.slice(-14,-7);
 const rw=avg(recent.map(x=>n(x.weight))),pw=avg(prior.map(x=>n(x.weight)));
 const strength=(db().workouts||[]).slice(-30).reduce((a,w)=>a+n(w.volume||w.totalVolume),0);
 return {weight7:rw||null,previous7:pw||null,weightDelta:(rw&&pw)?rw-pw:null,recentBody:recent,strengthVolume30:strength};
}
function tool(name,args={}){
 switch(name){
  case"todayNutrition":return mealTotals();
  case"todayWorkout":return {sessions:workoutsToday(),kcal:workoutKcal()};
  case"goal":return goal();
  case"trend":return trend();
  case"profile":return db().profile||{};
  case"memory":return window.FitMindConversationLearning?.context?.()||db().coachMemory||{};
 }
 return null;
}
function estimateTarget(){
 const p=db().profile||{},g=goal(), weight=n(p.weight||g.weight);
 const bmr=n(p.bmr||p.BMR), cal=n(g.targetCalories||p.recommendedCalories||p.tdee||bmr);
 const protein=n(g.targetProtein||weight*1.8);
 return {calories:cal,protein,weight};
}
function recommendation(){
 const t=estimateTarget(),m=mealTotals(),w=workoutKcal(),g=goal(),tr=trend(),out=[];
 if(t.protein&&m.protein<t.protein*.65)out.push("단백질 섭취가 현재 목표보다 낮아. 다음 식사에서 단백질 25~40g을 우선 채우는 걸 추천해.");
 if(t.calories&&m.kcal<t.calories*.55)out.push("현재 섭취량이 목표보다 낮아. 오늘 활동량까지 고려하면 식사를 너무 줄이지 않는 게 좋아.");
 if(g.type==="lean_bulk"&&tr.weightDelta!=null&&tr.weightDelta<-.15)out.push("린벌크 목표인데 최근 7일 평균 체중이 내려가는 추세야. 섭취량을 소폭 올리는 걸 검토해.");
 if(g.type==="cut"&&tr.weightDelta!=null&&tr.weightDelta>.25)out.push("컷 목표인데 최근 평균 체중이 올라가는 추세야. 1~2주 추세를 확인하고 섭취량을 조정하자.");
 if(w===0)out.push("오늘 운동 기록이 아직 없어. 계획된 운동을 했다면 기록해두면 다음 코칭 정확도가 올라가.");
 return out.slice(0,2);
}
function classify(q){
 q=String(q||"");
 if(/오늘.*(먹|칼로리|단백질)|단백질.*(먹|남)|섭취량|영양/.test(q))return"nutrition";
 if(/오늘.*(운동|소모|칼로리)|운동.*(칼로리|평가)|운동량/.test(q))return"workout";
 if(/체중|몸무게|추세|정체|왜.*안.*(빠|찌)|근육.*추세/.test(q))return"trend";
 if(/목표|벌크|린벌크|컷|다이어트|유지/.test(q))return"goal";
 if(/기억|기억하|내가.*말했/.test(q))return"memory";
 return"general";
}
function groundedAnswer(q){
 const type=classify(q),m=mealTotals(),w=tool("todayWorkout"),g=goal(),tr=trend(),t=estimateTarget();
 const evidence=[];
 if(type==="nutrition"){
   evidence.push(`오늘 기록 기준 섭취 ${Math.round(m.kcal)}kcal, 단백질 ${m.protein.toFixed(1)}g이야.`);
   if(t.calories)evidence.push(`설정 목표는 약 ${Math.round(t.calories)}kcal, 단백질 ${Math.round(t.protein)}g이야.`);
   return {text:evidence.join(" ")+` ${recommendation().join(" ")}`,confidence:"high",tools:["todayNutrition","goal"]};
 }
 if(type==="workout"){
   return {text:`오늘 기록된 운동은 ${w.sessions.length}개 세션이고, 기록된 운동 kcal는 약 ${Math.round(w.kcal)}kcal야. ${recommendation().join(" ")}`,confidence:w.sessions.length?"high":"medium",tools:["todayWorkout","profile"]};
 }
 if(type==="trend"){
   if(tr.weightDelta==null)return {text:"아직 비교할 수 있는 체중 기록이 부족해. 체중을 여러 번 기록하면 7일 평균 추세로 분석할 수 있어.",confidence:"low",tools:["trend"]};
   return {text:`최근 7일 평균 체중은 ${tr.weight7.toFixed(1)}kg, 이전 7일은 ${tr.previous7.toFixed(1)}kg으로 약 ${tr.weightDelta>0?"+":""}${tr.weightDelta.toFixed(1)}kg 변했어. 목표가 ${g.type}이라면 이 추세를 기준으로 섭취량과 운동을 조정하면 돼.`,confidence:"high",tools:["trend","goal"]};
 }
 if(type==="goal")return {text:`현재 목표는 ${g.type}이고 목표 체중은 ${g.targetWeight??"미설정"}kg, 목표 칼로리는 ${g.targetCalories??"자동 계산"}이야. 원하면 목표를 바탕으로 오늘 행동까지 정해줄게.`,confidence:"medium",tools:["goal"]};
 if(type==="memory"){
   const mem=tool("memory");return {text:"현재 저장된 개인 기억을 기준으로 답할게. "+JSON.stringify(mem.facts?.slice?.(0,3)||[]),confidence:"medium",tools:["memory"]};
 }
 return null;
}
function injectMemoryPanel(){
 if(document.getElementById("v65MemoryPanel")||!document.getElementById("chat"))return;
 const box=document.createElement("div");box.id="v65MemoryPanel";box.hidden=true;
 box.innerHTML='<div class="v65-mem-head"><b>🧠 AI가 기억하는 정보</b><button type="button" id="v65CloseMem">닫기</button></div><pre id="v65MemText"></pre>';
 const controls=document.getElementById("v61ChatControls")||document.getElementById("v6ChatActions");
 if(controls){
   const b=document.createElement("button");b.type="button";b.id="v65MemoryBtn";b.textContent="🧠 기억";
   b.onclick=()=>{const c=window.FitMindConversationLearning?.context?.()||{};document.getElementById("v65MemText").textContent=JSON.stringify(c,null,2);box.hidden=false;};
   controls.appendChild(b);controls.parentNode.insertBefore(box,controls.nextSibling);
   document.getElementById("v65CloseMem").onclick=()=>box.hidden=true;
 }
}
window.FitMindDataEngineV65={version:"6.5.0",tool,goal,setGoal,trend,recommendation,classify,groundedAnswer,mealTotals,workoutsToday};
document.addEventListener("DOMContentLoaded",()=>{injectMemoryPanel();setTimeout(injectMemoryPanel,500);});
})();
