/* GARANG Coach Engine V9.4 — Personal State / Evidence / Decision Layer
   Keeps V8.8.2 functional runtime intact and replaces the V7.7 coaching decision layer.
*/
(function(){
"use strict";
const VERSION="9.4.0";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const db=()=>{try{return typeof window.__FitMindV6DB==="function"?window.__FitMindV6DB():JSON.parse(localStorage.getItem("fitmind_v2")||"{}")}catch(e){return{}}};
const save=()=>{try{window.__FitMindV6Save?.();window.save?.()}catch(e){}};
const iso=x=>String(x?.date||x?.createdAt||"").slice(0,10);
const now=()=>new Date(), today=()=>now().toISOString().slice(0,10);
const n=x=>Number.isFinite(Number(x))?Number(x):0;
function arr(k){const d=db();return Array.isArray(d[k])?d[k]:[]}
function profile(){return db().profile||{}}
function goal(){const d=db(),p=profile(),g=d.coachMemory?.goal||localStorage.getItem("fitmind_v65_goal");return typeof g==="object"?g:{type:g||p.goal||"muscle_gain",targetWeight:p.targetWeight??null,targetCalories:p.recommendedCalories??p.tdee??null,targetProtein:p.targetProtein??(n(p.weight)*1.8)}}
function workoutVolume(w){
 if(n(w.volume)>0)return n(w.volume);
 if(Array.isArray(w.setDetails))return w.setDetails.reduce((s,x)=>s+n(x.w||x.weight)*n(x.r||x.reps),0);
 if(Array.isArray(w.sets))return w.sets.reduce((s,x)=>s+n(x.weight||x.w)*n(x.reps||x.r),0);
 return n(w.weight)*n(w.reps)*Math.max(1,n(w.sets)||1);
}
function exerciseName(w){return w.exercise||w.name||w.exercise_name||w.exerciseId||w.title||"운동"}
function workoutRows(days=30){const cut=Date.now()-days*864e5;return arr("workouts").filter(w=>{const t=new Date(w.date||w.createdAt||0).getTime();return !t||t>=cut})}
function mealRows(days=7){const cut=Date.now()-days*864e5;return arr("meals").filter(m=>{const t=new Date(m.date||m.createdAt||0).getTime();return !t||t>=cut})}
function runRows(days=30){const cut=Date.now()-days*864e5;return (arr("running").concat(arr("runs"))).filter((r,i,a)=>{const id=r.id||r.createdAt||i;return a.findIndex(x=>(x.id||x.createdAt||"")===id)===i && (!r.date||new Date(r.date).getTime()>=cut)})}
function dayNutrition(){
 const ms=arr("meals").filter(x=>iso(x)===today());
 return {kcal:ms.reduce((s,x)=>s+n(x.kcal??x.calories),0),protein:ms.reduce((s,x)=>s+n(x.protein),0),carbs:ms.reduce((s,x)=>s+n(x.carbs??x.carbohydrate),0),fat:ms.reduce((s,x)=>s+n(x.fat),0),count:ms.length}
}
function strengthMap(){
 const map={};
 arr("workouts").forEach(w=>{
   const name=exerciseName(w), vol=workoutVolume(w);
   let max=0,reps=0;
   if(Array.isArray(w.setDetails))w.setDetails.forEach(s=>{if(n(s.w||s.weight)>max){max=n(s.w||s.weight);reps=n(s.r||s.reps)}});
   if(!max)max=n(w.weight||w.load||w.kg),reps=n(w.reps||w.repeat);
   if(!map[name]||max>map[name].weight)map[name]={weight:max,reps,date:iso(w),volume:vol};
 });
 return map;
}
function weightTrend(){
 const b=arr("body").filter(x=>n(x.weight)>0).sort((a,b)=>new Date(a.date||a.createdAt)-new Date(b.date||b.createdAt));
 const recent=b.slice(-7),prev=b.slice(-14,-7),avg=a=>a.length?a.reduce((s,x)=>s+n(x.weight),0)/a.length:null;
 const r=avg(recent),p=avg(prev); return {current:r,previous:p,delta:r!=null&&p!=null?r-p:null,count:b.length};
}
function trainingLoad(){
 const w=workoutRows(14), byDay={};
 w.forEach(x=>{const d=iso(x)||today();byDay[d]=(byDay[d]||0)+workoutVolume(x)});
 const days=Object.keys(byDay).length, volume=w.reduce((s,x)=>s+workoutVolume(x),0);
 const last7=w.filter(x=>new Date(x.date||x.createdAt||0)>=new Date(Date.now()-7*864e5));
 return {sessions:days,records:w.length,volume,last7Sessions:new Set(last7.map(iso)).size,last7Volume:last7.reduce((s,x)=>s+workoutVolume(x),0)}
}
function state(){
 const p=profile(),g=goal(),t=trainingLoad(),nut=dayNutrition(),wt=weightTrend(),runs=runRows(30);
 const recent=arr("workouts").slice(-12).reverse();
 return {version:VERSION,profile:p,goal:g,training:t,nutritionToday:nut,weightTrend:wt,running30:{count:runs.length,distance:runs.reduce((s,r)=>s+n(r.distanceKm||r.distance||r.km),0)},recentWorkouts:recent.map(w=>({exercise:exerciseName(w),date:iso(w),volume:workoutVolume(w),weight:n(w.weight||w.load),reps:n(w.reps)}))}
}
function classify(q){
 q=String(q||"");
 if(/(벤치|스쿼트|데드|중량|세트|반복|RPE|RIR|운동|루틴|과부하|회복|근육)/i.test(q))return"workout";
 if(/(먹|식단|칼로리|단백질|탄수|지방|영양|끼니)/.test(q))return"nutrition";
 if(/(체중|몸무게|체지방|살|감량|증량|추세|정체)/.test(q))return"body";
 if(/(러닝|달리기|달린|페이스|거리|GPS)/i.test(q))return"running";
 if(/(기억|기억해|내가 말한|내 기록)/.test(q))return"memory";
 if(/(목표|벌크|린벌크|컷|다이어트|유지)/i.test(q))return"goal";
 return"general";
}
function progression(){
 const w=arr("workouts").slice().filter(x=>exerciseName(x)).reverse(), map={};
 w.forEach(x=>{
   const k=exerciseName(x),wt=n(x.weight||x.load||x.kg),vol=workoutVolume(x);
   if(!map[k])map[k]=[]; map[k].push({weight:wt,volume:vol,reps:n(x.reps),date:iso(x)});
 });
 return Object.fromEntries(Object.entries(map).map(([k,v])=>[k,v.slice(0,10)]));
}
function coachDecision(type,q){
 const s=state(), g=s.goal||{}, p=s.profile||{}, out=[];
 if(type==="nutrition"){
   const target=n(g.targetProtein)||n(p.targetProtein)||n(p.weight)*1.8, left=Math.max(0,target-s.nutritionToday.protein);
   if(left>10)out.push(`오늘 단백질은 ${s.nutritionToday.protein.toFixed(0)}g이고 목표까지 약 ${left.toFixed(0)}g 남았어.`);
   else out.push(`오늘 단백질은 ${s.nutritionToday.protein.toFixed(0)}g으로 목표 흐름에 가까워.`);
   if(n(g.targetCalories)&&s.nutritionToday.kcal<n(g.targetCalories)*.65)out.push(`현재 ${Math.round(s.nutritionToday.kcal)}kcal라 목표 ${Math.round(n(g.targetCalories))}kcal 대비 낮아. 활동량을 고려해 식사를 너무 줄이지 않는 게 좋아.`);
   return out.join(" ");
 }
 if(type==="body"){
   if(s.weightTrend.delta==null)return "체중 기록이 아직 부족해. 여러 날짜의 체중이 쌓이면 최근 7일 평균과 이전 7일 평균으로 추세를 볼게.";
   const d=s.weightTrend.delta; return `최근 7일 평균은 ${s.weightTrend.current.toFixed(1)}kg, 이전 7일은 ${s.weightTrend.previous.toFixed(1)}kg으로 ${d>=0?"+":""}${d.toFixed(1)}kg 변했어. 목표가 ${g.type||"현재 목표"}라면 이 추세를 기준으로 섭취량을 조정하는 게 좋아.`;
 }
 if(type==="running"){
   const r=s.running30; return r.count?`최근 30일 러닝 ${r.count}회, 총 ${r.distance.toFixed(2)}km가 기록돼 있어. 다음 러닝은 최근 거리와 회복 상태를 같이 보고 강도를 정하자.`:"아직 러닝 기록이 없어. GPS 러닝을 한 번 기록하면 거리·페이스·빈도를 기준으로 다음 러닝을 조정할 수 있어.";
 }
 if(type==="goal")return `현재 목표는 ${g.type||p.goal||"미설정"}${g.targetWeight?`, 목표 체중 ${g.targetWeight}kg`:``}. 지금부터는 기록을 보고 목표에 맞게 운동·식단을 함께 조정할게.`;
 if(type==="memory"){
   const d=db(),m=d.coachMemory||{}; return `현재 코치가 참조하는 핵심 목표는 ${m.goal||p.goal||"미설정"}이고, 체중은 ${p.weight??"-"}kg야. 최근 운동·식단·러닝 기록도 함께 분석 대상으로 사용해.`;
 }
 if(type==="workout"){
   const prog=progression(), qbench=Object.entries(prog).find(([k])=>/벤치/i.test(k));
   if(/벤치/i.test(q)&&qbench){
     const v=qbench[1],latest=v[0],prev=v[1];
     if(prev&&latest.weight>prev.weight)return `최근 벤치가 ${prev.weight}kg에서 ${latest.weight}kg로 올라갔어. 다음 세션은 바로 큰 폭으로 올리기보다 현재 중량에서 반복수를 먼저 확보하고, RIR 1~3 범위를 유지하는 방식이 좋아.`;
     return `최근 벤치 기록은 ${latest.weight||"-"}kg × ${latest.reps||"-"}회야. 다음 세션은 최근 RPE/RIR과 반복 성공 여부를 보고 2.5~5kg 단위의 작은 증량을 판단하자.`;
   }
   if(s.training.last7Sessions>=6)return `최근 7일에 ${s.training.last7Sessions}일 운동 기록이 있어. 지금은 추가 자극보다 회복까지 고려하는 게 중요해. 다음 세션 강도를 무조건 올리기보다 수행 질과 피로도를 확인하자.`;
   if(s.training.last7Sessions===0)return "최근 7일 운동 기록이 없어. 오늘 운동을 기록하면 다음 세션부터 실제 수행량을 기준으로 점진적 과부하를 계산할 수 있어.";
   return `최근 7일 운동 ${s.training.last7Sessions}일, 볼륨 약 ${Math.round(s.training.last7Volume).toLocaleString()}kg가 기록돼 있어. 다음 세션은 같은 동작의 중량·반복·RIR을 비교해서 소폭 증량 여부를 판단하자.`;
 }
 return `지금 내 코치 엔진은 네 프로필, 최근 운동 ${s.training.records}개, 오늘 식단 ${s.nutritionToday.count}개, 최근 러닝 데이터를 함께 보고 있어. ${s.weightTrend.delta==null?"체중 추세는 기록이 더 필요해.":`최근 체중 추세는 ${s.weightTrend.delta>=0?"+":""}${s.weightTrend.delta.toFixed(1)}kg야.`}`;
}
function answer(q){
 const type=classify(q), d=coachDecision(type,q);
 return {text:d,engine:VERSION,category:type,state:state(),timestamp:new Date().toISOString()};
}
function memoryFacts(){
 const d=db(),p=profile(),g=goal(),t=trainingLoad();
 return {profile:p,goal:g,training:t,weightTrend:weightTrend(),nutritionToday:dayNutrition(),recentStrength:Object.entries(strengthMap()).slice(0,12)}
}
function rememberConversation(text,answerText){
 const d=db();d.coachMemory=d.coachMemory||{};d.coachMemory.v94=d.coachMemory.v94||{events:[],lastState:null};
 d.coachMemory.v94.events.push({date:today(),text:String(text).slice(0,500),answer:String(answerText).slice(0,1000)});
 d.coachMemory.v94.events=d.coachMemory.v94.events.slice(-200);
 d.coachMemory.v94.lastState=state();save();
 try{window.GARANG_V93_LEARNING?.add?.("coach_decision",{query:String(text).slice(0,300),category:classify(text),answer:String(answerText).slice(0,500)},{status:"success"})}catch(e){}
}
function renderStatus(){
 const b=document.getElementById("v77Status");if(b){
   b.innerHTML=`<div class="v77-memory-mini">🧠 Personal State · ${state().training.records} 운동 · ${state().nutritionToday.count} 식단 · ${state().running30.count} 러닝</div><span class="v94-badge">COACH ENGINE V9.4</span>`;
 }
 const v=document.getElementById("fitmindBuildVersion");if(v)v.textContent="GARANG V9.4 · V8.8.2 CORE";
}
function bind(){
 const form=document.getElementById("chatForm"),input=document.getElementById("chatInput"),log=document.getElementById("chatLog");
 if(!form||!input||form.dataset.v94Bound)return;
 form.dataset.v94Bound="1";
 form.onsubmit=async e=>{
   e.preventDefault();const text=input.value.trim();if(!text)return;input.value="";
   const d=db();d.chat=Array.isArray(d.chat)?d.chat:[];d.chat.push({role:"user",text,date:today(),ts:Date.now()});save();
   if(log)log.innerHTML+=`<div class="msg user">${esc(text)}</div>`;
   const res=answer(text);rememberConversation(text,res.text);
   d.chat.push({role:"ai",text:res.text,date:today(),ts:Date.now(),engine:VERSION,category:res.category});d.coachMemory.lastAdvice=res.text;save();
   if(log)log.innerHTML+=`<div class="msg ai"><span class="v94-engine">V9.4</span> ${esc(res.text)}</div>`;
   log?.scrollTo({top:log.scrollHeight,behavior:"smooth"});renderStatus();
 };
}
function install(){
 const old=window.FitMindV77;
 window.GARANGCoachEngineV94={version:VERSION,state,answer,decision:coachDecision,memoryFacts,progression};
 renderStatus();bind();
 setTimeout(()=>{renderStatus();bind()},250);
 setTimeout(()=>{renderStatus();bind()},1000);
}
const st=document.createElement("style");st.textContent=`
.v94-badge{color:#bda1ff;font-weight:800;font-size:12px;letter-spacing:.04em}
.v94-engine{display:inline-block;padding:3px 7px;margin-right:5px;border:1px solid #5a3c7f;border-radius:8px;color:#c6a5ff;font-size:10px;font-weight:800;vertical-align:middle}
#v77Status{background:#101116!important;border:1px solid #282b32!important;border-radius:14px!important;padding:9px 11px!important}
`;document.head.appendChild(st);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
window.addEventListener("load",()=>setTimeout(install,300));
})();
