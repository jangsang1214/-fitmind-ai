/* GARANG Coach Engine V9.5 — true primary AI coach controller
   V8.8.2 runtime preserved. V7.7 controller is intentionally not loaded.
*/
(function(){
"use strict";
const VERSION="9.5.0", KEY="fitmind_v2";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const today=()=>new Date().toISOString().slice(0,10);
const n=x=>Number.isFinite(Number(x))?Number(x):0;
function db(){try{return window.__FitMindV6DB?window.__FitMindV6DB():JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return{}}}
function save(){try{if(window.__FitMindV6Save)window.__FitMindV6Save();else localStorage.setItem(KEY,JSON.stringify(db()))}catch(e){}}
function ensure(){const d=db();d.chat=Array.isArray(d.chat)?d.chat:[];d.chatSessions=Array.isArray(d.chatSessions)?d.chatSessions:[];d.coachMemory=d.coachMemory&&typeof d.coachMemory==="object"?d.coachMemory:{};d.coachMemory.facts=Array.isArray(d.coachMemory.facts)?d.coachMemory.facts:[];d.coachMemory.preferences=Array.isArray(d.coachMemory.preferences)?d.coachMemory.preferences:[];d.coachMemory.goals=Array.isArray(d.coachMemory.goals)?d.coachMemory.goals:[];return d}
function arr(k){const d=ensure();return Array.isArray(d[k])?d[k]:[]}
function iso(x){return String(x?.date||x?.createdAt||"").slice(0,10)}
function profile(){return ensure().profile||{}}
function goal(){const d=ensure(),p=profile(),g=d.coachMemory?.goal;return typeof g==="object"?g:{type:g||p.goal||"muscle_gain",targetWeight:p.targetWeight??null,targetCalories:p.recommendedCalories??p.tdee??null,targetProtein:p.targetProtein??n(p.weight)*1.8}}
function exerciseName(w){return w.exercise||w.name||w.exercise_name||w.exerciseId||w.title||"운동"}
function volume(w){if(n(w.volume))return n(w.volume);if(Array.isArray(w.setDetails))return w.setDetails.reduce((s,x)=>s+n(x.w??x.weight)*n(x.r??x.reps),0);if(Array.isArray(w.sets))return w.sets.reduce((s,x)=>s+n(x.weight??x.w)*n(x.reps??x.r),0);return n(w.weight??w.load)*n(w.reps??w.repeat)*Math.max(1,n(w.sets))}
function workouts(days=30){const cut=Date.now()-days*864e5;return arr("workouts").filter(w=>{const t=new Date(w.date||w.createdAt||0).getTime();return !t||t>=cut})}
function meals(days=30){const cut=Date.now()-days*864e5;return arr("meals").filter(m=>{const t=new Date(m.date||m.createdAt||0).getTime();return !t||t>=cut})}
function runs(days=30){const cut=Date.now()-days*864e5,seen=new Set(),out=[];for(const r of arr("running").concat(arr("runs"))){const id=r.id||r.createdAt||JSON.stringify(r);if(seen.has(id))continue;seen.add(id);const t=new Date(r.date||r.createdAt||0).getTime();if(!t||t>=cut)out.push(r)}return out}
function nutritionToday(){const m=arr("meals").filter(x=>iso(x)===today());return{count:m.length,kcal:m.reduce((s,x)=>s+n(x.kcal??x.calories),0),protein:m.reduce((s,x)=>s+n(x.protein),0),carbs:m.reduce((s,x)=>s+n(x.carbs??x.carbohydrate),0),fat:m.reduce((s,x)=>s+n(x.fat),0)}}
function weightTrend(){const b=arr("body").filter(x=>n(x.weight)>0).sort((a,b)=>String(a.date).localeCompare(String(b.date)));const a=b.slice(-7),c=b.slice(-14,-7),avg=x=>x.length?x.reduce((s,r)=>s+n(r.weight),0)/x.length:null;const aa=avg(a),cc=avg(c);return{current:aa,previous:cc,delta:aa!=null&&cc!=null?aa-cc:null,count:b.length}}
function load(){const w=workouts(14),last7=w.filter(x=>new Date(x.date||x.createdAt||0).getTime()>=Date.now()-7*864e5);return{records:w.length,volume:w.reduce((s,x)=>s+volume(x),0),last7Sessions:new Set(last7.map(iso)).size,last7Volume:last7.reduce((s,x)=>s+volume(x),0)}}
function state(){const p=profile(),g=goal(),t=load(),nu=nutritionToday(),wt=weightTrend(),r=runs(30);return{version:VERSION,profile:p,goal:g,training:t,nutritionToday:nu,weightTrend:wt,running30:{count:r.length,distance:r.reduce((s,x)=>s+n(x.distanceKm??x.distance??x.km),0)},recentWorkouts:arr("workouts").slice(-12).reverse().map(w=>({exercise:exerciseName(w),date:iso(w),weight:n(w.weight??w.load),reps:n(w.reps),volume:volume(w)}))}}
function category(q){if(/(벤치|스쿼트|데드|중량|세트|반복|RPE|RIR|운동|루틴|과부하|회복|근육)/i.test(q))return"workout";if(/(먹|식단|칼로리|단백질|탄수|지방|영양|끼니)/.test(q))return"nutrition";if(/(체중|몸무게|체지방|감량|증량|추세|정체)/.test(q))return"body";if(/(러닝|달리기|달린|페이스|거리|GPS)/i.test(q))return"running";if(/(기억|내 기록|내가 말한)/.test(q))return"memory";if(/(목표|벌크|린벌크|컷|다이어트|유지)/i.test(q))return"goal";return"general"}
function decision(q){
 const s=state(),g=s.goal||{},p=s.profile||{},t=s.training,nu=s.nutritionToday,c=category(q);
 if(/안녕|ㅎㅇ|하이|반가/.test(q))return"왔네 ㅋㅋ. 지금까지 기록도 같이 보고 운동·식단·러닝을 연결해서 보자. 오늘 뭐부터 볼까?";
 if(c==="nutrition"){const target=n(g.targetProtein)||n(p.targetProtein)||n(p.weight)*1.8,left=Math.max(0,target-nu.protein);return `오늘 ${Math.round(nu.kcal)}kcal, 단백질 ${Math.round(nu.protein)}g을 기록했어. ${left>10?`단백질 목표까지 약 ${Math.round(left)}g 남았어.`:"단백질은 목표 흐름에 가까워."}`;}
 if(c==="body"){return s.weightTrend.delta==null?"체중 기록이 더 쌓이면 최근 7일 평균과 이전 7일 평균을 비교해서 추세를 볼게.":`최근 7일 평균 ${s.weightTrend.current.toFixed(1)}kg, 이전 7일 ${s.weightTrend.previous.toFixed(1)}kg으로 ${s.weightTrend.delta>=0?"+":""}${s.weightTrend.delta.toFixed(1)}kg 변했어.`}
 if(c==="running"){return s.running30.count?`최근 30일 러닝 ${s.running30.count}회, 총 ${s.running30.distance.toFixed(2)}km야. 다음 러닝은 최근 거리와 회복 상태를 같이 보고 강도를 정하자.`:"아직 러닝 기록이 없어. GPS 러닝을 기록하면 거리·페이스·빈도까지 코칭에 연결할 수 있어."}
 if(c==="memory"){const m=ensure().coachMemory;return `현재 코치가 참조하는 장기기억은 사실 ${m.facts.length}개, 선호 ${m.preferences.length}개, 목표 ${m.goals.length}개야. 여기에 운동·식단·러닝·체중 상태를 함께 연결해.`}
 if(c==="goal")return `현재 목표는 ${g.type||p.goal||"미설정"}${g.targetWeight?`, 목표 체중 ${g.targetWeight}kg`:""}야. 이후 운동과 식단을 따로 보지 않고 목표 달성 관점에서 같이 조정할게.`;
 if(c==="workout"){const bench=s.recentWorkouts.find(x=>/벤치/i.test(x.exercise));if(t.last7Sessions>=6)return `최근 7일에 ${t.last7Sessions}일 운동했어. 지금은 무조건 중량을 올리기보다 회복과 수행 질을 먼저 확인하는 게 좋아.`;if(bench)return `최근 벤치는 ${bench.weight||"-"}kg × ${bench.reps||"-"}회야. 다음 세션은 최근 반복 성공 여부와 RIR을 확인하고 2.5~5kg 정도의 작은 증량을 우선 판단하자.`;return `최근 7일 운동 ${t.last7Sessions}일, 볼륨 약 ${Math.round(t.last7Volume).toLocaleString()}kg야. 다음 세션은 같은 동작의 중량·반복·RIR을 비교해서 증량 여부를 결정하자.`}
 return `현재 네 프로필과 운동 ${t.records}개, 오늘 식단 ${nu.count}개, 최근 러닝 ${s.running30.count}회를 함께 참조하고 있어. 질문하면 필요한 데이터부터 꺼내서 판단할게.`
}
function insight(){const s=state();if(s.training.last7Sessions>=6)return"최근 운동 빈도가 높아. 다음 세션은 회복 상태를 확인한 뒤 강도를 조절하는 게 좋아.";const b=s.recentWorkouts.find(x=>/벤치/i.test(x.exercise));if(b)return`최근 ${b.exercise} ${b.weight||"-"}kg × ${b.reps||"-"}회 기록을 기준으로 다음 세션의 중량과 볼륨을 조절할 수 있어.`;if(s.running30.count)return`최근 30일 러닝 ${s.running30.count}회 · ${s.running30.distance.toFixed(1)}km가 코칭 데이터에 연결돼 있어.`;return"운동·식단·러닝·체중 기록을 연결해서 오늘의 코칭을 계속 업데이트할게."}
function compactContext(){const d=ensure();return{version:VERSION,profile:d.profile||{},workouts:arr("workouts").slice(-40),meals:arr("meals").slice(-40),body:arr("body").slice(-14),running:runs(30),coachMemory:d.coachMemory,coachState:state(),recentChat:d.chat.slice(-20)}}
function serverUrl(){const d=ensure();return d.api?.url||localStorage.getItem("fitmind_server_endpoint")||""}
async function ask(text){const url=serverUrl();if(url){try{const h={"Content-Type":"application/json"},key=ensure().api?.key;if(key)h.Authorization="Bearer "+key;const r=await fetch(url,{method:"POST",headers:h,body:JSON.stringify({version:VERSION,query:text,context:compactContext()})});if(r.ok){const j=await r.json();return j.text||j.reply||j.message||decision(text)}}catch(e){}}return decision(text)}
function render(){const log=$("chatLog");if(!log)return;const d=ensure();log.innerHTML=d.chat.length?d.chat.slice(-80).map(x=>`<div class="msg ${x.role==="user"?"user":"ai"}">${x.role==="ai"?'<span class="v95-tag">V9.5</span>':""}${esc(x.text)}</div>`).join(""):'<div class="card coach-welcome">안녕하세요. 네 운동·식단·러닝·체중 데이터를 연결해서 같이 보자.</div>';requestAnimationFrame(()=>log.scrollTop=log.scrollHeight)}
function record(text,answer){const d=ensure();d.coachMemory.v95=d.coachMemory.v95||{events:[]};d.coachMemory.v95.events.push({date:today(),query:String(text).slice(0,500),answer:String(answer).slice(0,1000),state:state()});d.coachMemory.v95.events=d.coachMemory.v95.events.slice(-200);d.coachMemory.lastAdvice=answer;save();try{window.GARANG_V93_LEARNING?.add?.("coach_decision",{query:String(text).slice(0,300),category:category(text),answer:String(answer).slice(0,500)},{status:"success"})}catch(e){}}
function newChat(){const d=ensure();if(d.chat.length){const first=d.chat.find(x=>x.role==="user");d.chatSessions.push({id:"s_"+Date.now(),title:first?.text||"새 대화",createdAt:new Date().toISOString(),messages:d.chat.slice()});d.chatSessions=d.chatSessions.slice(-50)}d.chat=[];save();render();$("chatInput")?.focus()}
function history(){const d=ensure();let p=$("v95History");if(p)p.remove();p=document.createElement("div");p.id="v95History";p.className="v95-panel";const rows=d.chatSessions.slice().reverse();p.innerHTML=`<div class="v95-panel-head"><b>대화 기록</b><button type="button" id="v95Close">닫기</button></div>${rows.length?rows.map((x,i)=>`<button type="button" class="v95-history-item" data-i="${d.chatSessions.length-1-i}"><span>${esc(String(x.title||"새 대화").slice(0,42))}</span><small>${new Date(x.createdAt).toLocaleDateString("ko-KR")}</small></button>`).join(""):"<p>저장된 대화가 없습니다.</p>"}`;$("chat")?.appendChild(p);$("v95Close").onclick=()=>p.remove();p.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{const s=ensure().chatSessions[Number(b.dataset.i)];if(!s)return;const x=ensure();x.chat=s.messages.slice();save();render();p.remove()})}
function plan(){const s=state();const focus=s.recentWorkouts[0]?.exercise||"주요 운동";return `오늘은 ${focus} 최근 기록을 기준으로 수행 질을 먼저 확인하고, 성공하면 소폭 증량하는 방향이 좋아. 최근 7일 운동 ${s.training.last7Sessions}일이므로 회복 상태도 함께 보자.`}
function report(){const s=state();return `최근 7일 운동 ${s.training.last7Sessions}일 · 볼륨 ${Math.round(s.training.last7Volume).toLocaleString()}kg / 오늘 식단 ${Math.round(s.nutritionToday.kcal)}kcal · 단백질 ${Math.round(s.nutritionToday.protein)}g / 최근 30일 러닝 ${s.running30.count}회 · ${s.running30.distance.toFixed(1)}km`;}
function bind(){const form=$("chatForm"),input=$("chatInput");if(!form||!input||form.dataset.v95Bound)return;form.dataset.v95Bound="1";form.onsubmit=async e=>{e.preventDefault();const text=input.value.trim();if(!text)return;input.value="";const d=ensure();d.chat.push({role:"user",text,date:today(),ts:Date.now()});save();render();const answer=await ask(text);const d2=ensure();d2.chat.push({role:"ai",text:answer,date:today(),ts:Date.now(),engine:VERSION,category:category(text)});record(text,answer);save();render();};}
function buildUI(){const page=$("chat");if(!page)return;
 page.querySelector(".coachQuick")?.remove();
 page.querySelector(".coachInsight")?.remove();
 page.querySelector(".v77-memory-mini")?.remove();
 const old=page.querySelector("#v77ChatActions");if(old)old.remove();
 const title=page.querySelector(".pageTitle");if(!title)return;
 const legacyTitle=title.querySelector("h2");if(legacyTitle)legacyTitle.textContent="개인 AI 코치";
 const legacyDesc=title.querySelector("p");if(legacyDesc)legacyDesc.textContent="운동·식단·러닝·체중 데이터를 하나의 Personal State로 연결합니다.";
 const legacyButton=title.querySelector("button");if(legacyButton)legacyButton.remove();
 let bar=$("v95CoachBar");if(!bar){bar=document.createElement("div");bar.id="v95CoachBar";title.after(bar)}
 const s=state(),m=ensure().coachMemory;
 bar.innerHTML=`<div class="v95-top"><div><span class="eyebrow">AI COACH</span><h3>개인 AI 코치</h3><p>운동 · 식단 · 러닝 · 체중 데이터를 하나의 Personal State로 연결합니다.</p></div><span class="v95-connected">개인 데이터 연결됨</span></div>
 <div class="v95-status"><span>장기기억 ${m.facts.length+m.preferences.length+m.goals.length}개</span><strong>COACH ENGINE V9.5</strong><span>운동 ${s.training.records} · 식단 ${s.nutritionToday.count} · 러닝 ${s.running30.count}</span></div>
 <div class="v95-actions"><button type="button" id="v95New">＋ 새 채팅</button><button type="button" id="v95Hist">대화 기록</button><button type="button" id="v95Plan">운동 플랜</button><button type="button" id="v95Report">주간 리포트</button></div>
 <div class="v95-quick"><button type="button" data-q="오늘 운동 뭐 할까?">오늘 운동 뭐 할까?</button><button type="button" data-q="오늘 단백질 얼마나 먹어야 해?">단백질</button><button type="button" data-q="최근 기록을 분석해줘">최근 분석</button></div>
 <div class="v95-insight"><span class="eyebrow">TODAY'S COACH</span><strong>${esc(insight())}</strong></div>`;
 $("v95New").onclick=newChat;$("v95Hist").onclick=history;$("v95Plan").onclick=()=>{const a=plan();const d=ensure();d.chat.push({role:"ai",text:a,date:today(),ts:Date.now(),engine:VERSION,category:"workout"});save();render()};$("v95Report").onclick=()=>{const a=report();const d=ensure();d.chat.push({role:"ai",text:a,date:today(),ts:Date.now(),engine:VERSION,category:"report"});save();render()};bar.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>window.garangAsk(b.dataset.q));
 bind();render();
}
window.garangAsk=async q=>{const input=$("chatInput");if(input){input.value=q;$("chatForm")?.requestSubmit()}};
window.newGarangChat=newChat;
window.GARANGCoachEngine={version:VERSION,state,ask,decision,compactContext,plan,report};
window.FitMindV77={version:VERSION,db,save,render,newChat,showHistory:history,planner:()=>({text:plan()}),weeklyReport:()=>({text:report()}),ask};
const style=document.createElement("style");style.id="v95Style";style.textContent=`
#v95CoachBar{margin:14px 0 18px}
#v95CoachBar .v95-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:20px;border:1px solid #2a2d35;border-radius:22px;background:linear-gradient(145deg,#121318,#0d0e11);box-shadow:0 16px 40px rgba(0,0,0,.28)}
.v95-top h3{margin:4px 0 5px;font-size:29px;color:#f7f7fa}.v95-top p{margin:0;color:#8d919d;font-size:13px}.v95-connected{padding:9px 13px;border-radius:999px;background:#f1f2ff;color:#66708a;font-weight:800;font-size:12px}
.v95-status{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:12px 16px;border:1px solid #292c34;border-top:0;border-radius:0 0 18px 18px;background:#101116;color:#858a98;font-size:12px}.v95-status strong{color:#c4a4ff;letter-spacing:.04em}
.v95-actions,.v95-quick{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.v95-actions button,.v95-quick button{border:1px solid #30343d;border-radius:16px;padding:12px 16px;background:#17191e;color:#f1f2f5;font-weight:800}.v95-actions button:first-child{background:#202228}
.v95-quick button{background:#111318;color:#cfd2db}
.v95-insight{padding:22px;border:1px solid #2b2e36;border-radius:22px;background:#111216;margin:14px 0 18px}.v95-insight strong{display:block;color:#f4f4f6;font-size:18px;line-height:1.55;margin-top:10px}
.v95-tag{display:inline-block;color:#bca0ff;border:1px solid #503d69;border-radius:7px;font-size:10px;font-weight:900;padding:2px 6px;margin-right:6px}
#v95History{border:1px solid #2c3038;background:#111216;border-radius:18px;padding:14px;margin:12px 0}.v95-panel-head{display:flex;justify-content:space-between;color:#fff;margin-bottom:8px}.v95-panel-head button{background:#202228;color:#fff;border:1px solid #30343d;border-radius:10px;padding:7px 10px}.v95-history-item{width:100%;display:flex;justify-content:space-between;gap:8px;background:none;color:#ddd;border:0;border-top:1px solid #252831;padding:12px 4px;text-align:left}.v95-history-item small{color:#777}
`;
document.head.appendChild(style);
function init(){buildUI();setTimeout(buildUI,250);setTimeout(buildUI,1000)}
document.addEventListener("DOMContentLoaded",init);window.addEventListener("load",()=>setTimeout(init,200));
})();
