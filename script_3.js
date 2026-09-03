
const KEY="garang_v9_1_state";
const today=()=>new Date().toISOString().slice(0,10);
const blank=()=>({profile:{},goals:{},recovery:{},workouts:[],nutrition:[],running:[],memory:{longTerm:[],shortTerm:[],events:[]},learning:{events:[],patterns:[],knowledge:[]},updatedAt:null});
let db=JSON.parse(localStorage.getItem(KEY)||"null")||blank(); if(!db.learning)db.learning={events:[],patterns:[],knowledge:[]}; buildGlobalPatterns();

function save(){db.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(db));render()}
function addEvent(type,data){
 const event={id:crypto.randomUUID(),type,data,createdAt:new Date().toISOString()};
 db.memory.events.push(event);db.memory.events=db.memory.events.slice(-200);
 recordLearningEvent(type,data);
}
function recordLearningEvent(type,data,outcome=null){
 if(!db.learning)db.learning={events:[],patterns:[],knowledge:[]};
 const weight=type==="workout"?1:type==="nutrition"?.8:type==="running"?.8:.4;
 const ev={id:crypto.randomUUID(),eventType:type,context:{
   goal:db.goals.primary||null,experience:db.profile.experience||null,
   weightKg:db.profile.weightKg||null
 },action:data,outcome,quality:{weight,validated:false},createdAt:new Date().toISOString()};
 db.learning.events.push(ev);db.learning.events=db.learning.events.slice(-1000);
 if(outcome&&outcome.status==="success")ev.quality.validated=true;
 buildGlobalPatterns();
 if(window.GARANG_SERVER?.configured && window.GARANG_SERVER?.consent?.globalLearning){
   window.GARANG_SERVER.saveLearning({eventType:ev.eventType,context:ev.context,outcome:ev.outcome,actionSummary:ev.eventType,quality:ev.quality})
     .catch(err=>console.warn("Global Learning sync failed",err));
 }
}
function buildGlobalPatterns(){
 const es=db.learning.events||[], map={};
 es.forEach(e=>{
   const key=[e.eventType,e.context.goal||"unknown",e.context.experience||"unknown"].join("|");
   if(!map[key])map[key]={key,eventType:e.eventType,goal:e.context.goal||"unknown",experience:e.context.experience||"unknown",count:0,success:0,failure:0};
   map[key].count++;
   if(e.outcome?.status==="success")map[key].success++;
   if(e.outcome?.status==="failure")map[key].failure++;
 });
 db.learning.patterns=Object.values(map).sort((a,b)=>b.count-a.count).slice(0,100);
}
function saveProfile(){
 db.profile={weightKg:+document.querySelector("#weight").value||null,experience:document.querySelector("#experience").value};
 db.goals={primary:document.querySelector("#goal").value};
 db.recovery={sleepHours:+document.querySelector("#sleep").value||null,fatigue:+document.querySelector("#fatigue").value||null};
 addEvent("profile_update",{profile:db.profile,goals:db.goals,recovery:db.recovery});save();
}
function addWorkout(){
 const ex=document.querySelector("#ex").value.trim();const wt=+document.querySelector("#wt").value;const reps=+document.querySelector("#reps").value;const rpe=+document.querySelector("#rpe").value||null;
 if(!ex||!wt||!reps)return;
 const x={id:crypto.randomUUID(),date:today(),exerciseId:ex,sets:[{weight:wt,reps,rpe}],volume:wt*reps};
 db.workouts.push(x);addEvent("workout",x);addShort(`최근 운동: ${ex} ${wt}kg × ${reps} @${rpe||"-"}`);save();
}
function addNutrition(){
 const food=document.querySelector("#food").value.trim();if(!food)return;
 const x={id:crypto.randomUUID(),date:today(),food,calories:+kcal.value||0,protein:+protein.value||0,carbs:+carb.value||0,fat:+fat.value||0};
 db.nutrition.push(x);addEvent("nutrition",x);addShort(`식단: ${food}`);save();
}
function addRunning(){
 const x={id:crypto.randomUUID(),date:today(),distanceKm:+distance.value||0,durationMin:+duration.value||0,pace:pace.value,calories:+runKcal.value||0};
 db.running.push(x);addEvent("running",x);addShort(`러닝: ${x.distanceKm}km`);save();
}
function addShort(text){db.memory.shortTerm.push({text,createdAt:new Date().toISOString()});db.memory.shortTerm=db.memory.shortTerm.slice(-50)}
function recordOutcome(eventType,status,notes=""){
 if(!db.learning?.events?.length)return;
 for(let i=db.learning.events.length-1;i>=0;i--){
   const e=db.learning.events[i];
   if(e.eventType===eventType&&!e.outcome){e.outcome={status,notes,recordedAt:new Date().toISOString()};e.quality.validated=status==="success";break}
 }
 buildGlobalPatterns();save();
}
function state(){
 const w=db.workouts.slice(-14),n=db.nutrition.slice(-7);
 const vol=w.reduce((s,x)=>s+(+x.volume||0),0), prot=n.reduce((s,x)=>s+(+x.protein||0),0);
 let score=null,label="unknown";const sl=+db.recovery.sleepHours,f=+db.recovery.fatigue;
 if(sl||f){score=70;if(sl)score+=Math.max(-20,Math.min(15,(sl-7)*8));if(f)score-=Math.max(0,Math.min(25,(f-3)*7));score=Math.max(0,Math.min(100,Math.round(score)));label=score>=75?"ready":score>=55?"moderate":"fatigued"}
 return {profile:db.profile,goals:db.goals,training:{sessions14d:w.length,volume14d:vol,lastWorkout:w.at(-1)||null},nutrition:{days:n.length,avgProtein:n.length?prot/n.length:null},running:{sessions:db.running.length},recovery:db.recovery,readiness:{score,label},memory:db.memory,globalLearning:{events:db.learning?.events?.length||0,patterns:db.learning?.patterns?.length||0}};
}
function knowledge(q){
 const docs=[
  {title:"WHO Physical Activity Guidelines",tags:["러닝","유산소","근력","건강"],text:"성인은 주당 150~300분 중강도 또는 75~150분 고강도 유산소 활동과 주 2회 이상의 근력운동을 권고받는다.",url:"https://www.who.int/publications/i/item/9789240015128"},
  {title:"ISSN Protein and Exercise",tags:["단백질","영양","근비대"],text:"운동하는 대부분의 사람에게 하루 1.4~2.0 g/kg 단백질 범위가 제시된다.",url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/"},
  {title:"GARANG Coaching Rules",tags:["RPE","RIR","볼륨","개인화"],text:"운동 추천은 최근 훈련 부위, 훈련량, 회복, 목표, 사용자 기록을 조회한 후 결정한다. 운동 볼륨은 세트별 중량×반복의 합으로 계산한다.",url:"internal"}
 ];
 return docs.filter(d=>(d.title+" "+d.tags.join(" ")+" "+d.text).toLowerCase().includes(q.toLowerCase().split(/\s+/).find(t=>t.length>1)||"__none__"));
}
function coachFallback(q){
 const s=state(),k=knowledge(q),gp=(db.learning?.patterns||[]).filter(p=>(p.goal===s.goals.primary||p.goal==="unknown"));let a="";
 if(s.training.sessions14d){a+=`현재 기록 기준으로 보면 최근 14일 운동 ${s.training.sessions14d}회, 운동 볼륨 ${Math.round(s.training.volume14d)}kg입니다. `;a+=`준비도는 ${s.readiness.label}${s.readiness.score!=null?`(${s.readiness.score}/100)`:``}입니다.\\n\\n`}
 else a+="아직 운동 데이터가 없어 일반적인 운동 원칙을 기준으로 답변합니다. 목표와 최근 수행기록이 쌓이면 개인화 수준이 올라갑니다.\\n\\n";
 if(/벤치|프레스|중량|운동|세트|반복|rpe|rir/i.test(q)){
   const last=s.training.lastWorkout;
   a+=last?`최근 기록 ${last.exerciseId}: ${last.sets?.map(x=>`${x.weight}kg × ${x.reps}${x.rpe?` @${x.rpe}`:""}`).join(", ")}. 다음 중량 결정은 반복수 달성, RPE/RIR, 기술 안정성, 회복을 함께 보고 정하는 것이 좋습니다.`:"처음 기록한다면 첫 세션은 무리한 PR보다 기술과 수행 난이도를 확인하면서 RPE 7~8 수준에서 기준 기록을 만드는 것이 좋습니다.";
 }else if(/단백질|식단|칼로리|먹/i.test(q)){
   a+=`최근 7일 평균 단백질은 ${s.nutrition.avgProtein!=null?Math.round(s.nutrition.avgProtein)+"g/day":"아직 계산할 데이터가 없습니다"}. 체중과 목표를 함께 보면 더 정확한 식단 전략을 세울 수 있습니다.`;
 }else a+="질문의 목적과 현재 데이터를 함께 보면 더 구체적인 행동 계획을 만들 수 있습니다. 현재 목표, 최근 운동, 회복 상태를 우선 반영하세요.";
 if(k.length)a+="\\n\\n관련 지식:\\n"+k.map(x=>`• ${x.title}: ${x.text}`).join("\\n");
 a+="\\n\\n※ 의료/부상 문제는 AI가 진단하지 않으며 필요한 경우 전문가 평가가 우선입니다.";
 return a;
}
async function askCoach(){
 const q=document.querySelector("#question").value.trim();if(!q)return;
 document.querySelector("#coachAnswer").textContent=coachFallback(q);
 renderContext();
 learnEvents.textContent=db.learning?.events?.length||0;
 learnPatterns.textContent=db.learning?.patterns?.length||0;
 learnSuccess.textContent=(db.learning?.events||[]).filter(e=>e.outcome?.status==="success").length;
 learnFailure.textContent=(db.learning?.events||[]).filter(e=>e.outcome?.status==="failure").length;
 learningList.innerHTML=(db.learning?.events||[]).slice().reverse().slice(0,30).map(e=>`<div class=item><b>${e.eventType}</b> · ${e.outcome?.status||"pending"} · ${JSON.stringify(e.action)}<div class=muted>${e.createdAt}</div></div>`).join("")||"<div class=muted>아직 없음</div>";
 patternList.innerHTML=(db.learning?.patterns||[]).map(p=>`<div class=item><b>${p.eventType}</b> · goal=${p.goal} · level=${p.experience}<br>표본 ${p.count} · 성공 ${p.success} · 실패 ${p.failure}</div>`).join("")||"<div class=muted>아직 패턴 없음</div>";
}
function context(){return JSON.stringify({userState:state(),knowledgeHint:"고품질 지식 우선 + 최신 정보는 서버측 Web Search Adapter 연결 가능",coachEngine:"User State → Memory → Knowledge/Web → LLM"},null,2)}
function copyContext(){navigator.clipboard?.writeText(context());}
function render(){
  const s=state(), $=id=>document.getElementById(id);
  const set=(id,v)=>{const el=$(id);if(el)el.textContent=v};
  const html=(id,v)=>{const el=$(id);if(el)el.innerHTML=v};
  set("mWorkout",db.workouts.length);set("mNutrition",db.nutrition.length);set("mRunning",db.running.length);set("mReady",s.readiness.label);
  const w=$("weight"),e=$("experience"),g=$("goal"),sl=$("sleep"),f=$("fatigue");
  if(w)w.value=s.profile.weightKg||""; if(e)e.value=s.profile.experience||""; if(g)g.value=s.goals.primary||"hypertrophy"; if(sl)sl.value=s.recovery.sleepHours||""; if(f)f.value=s.recovery.fatigue||"";
  html("workoutList",db.workouts.slice().reverse().slice(0,15).map(x=>`<div class=item><b>${x.exerciseId}</b> · ${x.sets.map(z=>`${z.weight}kg × ${z.reps}${z.rpe?` @${z.rpe}`:""}`).join(", ")}<div class=muted>${x.date} · ${x.volume}kg</div></div>`).join("")||"<div class=muted>기록 없음</div>");
  html("nutritionList",db.nutrition.slice().reverse().slice(0,15).map(x=>`<div class=item><b>${x.food}</b> · ${x.calories} kcal · P ${x.protein}g · C ${x.carbs}g · F ${x.fat}g<div class=muted>${x.date}</div></div>`).join("")||"<div class=muted>기록 없음</div>");
  html("runningList",db.running.slice().reverse().slice(0,15).map(x=>`<div class=item><b>${x.distanceKm} km</b> · ${x.durationMin}분 · ${x.pace||"-"} /km · ${x.calories} kcal<div class=muted>${x.date}</div></div>`).join("")||"<div class=muted>기록 없음</div>");
  const nt=db.nutrition.filter(x=>x.date===today());
  set("sumKcal",nt.reduce((a,x)=>a+x.calories,0));set("sumProtein",nt.reduce((a,x)=>a+x.protein,0)+"g");set("sumCarb",nt.reduce((a,x)=>a+x.carbs,0)+"g");set("sumFat",nt.reduce((a,x)=>a+x.fat,0)+"g");
  set("rSets",db.workouts.reduce((a,x)=>a+x.sets.length,0));set("rVolume",Math.round(db.workouts.reduce((a,x)=>a+x.volume,0))+"kg");set("rKcal",nt.reduce((a,x)=>a+x.calories,0));set("rDistance",db.running.reduce((a,x)=>a+x.distanceKm,0).toFixed(2)+"km");
  set("reportAI",`현재 준비도: ${s.readiness.label}${s.readiness.score!=null?` (${s.readiness.score}/100)`:``}\n최근 14일 운동: ${s.training.sessions14d}\n최근 14일 볼륨: ${Math.round(s.training.volume14d)}kg\n최근 7일 평균 단백질: ${s.nutrition.avgProtein?Math.round(s.nutrition.avgProtein)+"g/day":"데이터 부족"}`);
  html("longMemory",(db.memory.longTerm.length?db.memory.longTerm:[{text:"현재 저장된 장기 기억 없음"}]).map(x=>`<div class=item>${x.text||JSON.stringify(x)}</div>`).join(""));
  html("shortMemory",db.memory.shortTerm.slice().reverse().slice(0,20).map(x=>`<div class=item>${x.text}</div>`).join("")||"<div class=muted>없음</div>");
  html("eventMemory",db.memory.events.slice().reverse().slice(0,20).map(x=>`<div class=item><b>${x.type}</b> · ${JSON.stringify(x.data)}<div class=muted>${x.createdAt}</div></div>`).join("")||"<div class=muted>없음</div>");
  renderContext();
  set("learnEvents",db.learning?.events?.length||0);
  set("learnPatterns",db.learning?.patterns?.length||0);
  set("learnSuccess",(db.learning?.events||[]).filter(e=>e.outcome?.status==="success").length);
  set("learnFailure",(db.learning?.events||[]).filter(e=>e.outcome?.status==="failure").length);
  html("learningList",(db.learning?.events||[]).slice().reverse().slice(0,30).map(e=>`<div class=item><b>${e.eventType}</b> · ${e.outcome?.status||"pending"} · ${JSON.stringify(e.action)}<div class=muted>${e.createdAt}</div></div>`).join("")||"<div class=muted>아직 없음</div>");
  html("patternList",(db.learning?.patterns||[]).map(p=>`<div class=item><b>${p.eventType}</b> · goal=${p.goal} · level=${p.experience}<br>표본 ${p.count} · 성공 ${p.success} · 실패 ${p.failure}</div>`).join("")||"<div class=muted>아직 패턴 없음</div>");
}
function renderContext(){document.querySelector("#context").textContent=context()}
document.querySelector("#nav").addEventListener("click",e=>{
 const b=e.target.closest("button[data-tab]"); if(!b)return;
 const target=document.getElementById(b.dataset.tab); if(!target)return;
 document.querySelectorAll("section").forEach(x=>x.classList.remove("active"));
 target.classList.add("active");
 document.querySelectorAll("#nav button").forEach(x=>x.classList.toggle("active",x===b));
 window.scrollTo({top:0,behavior:"smooth"});
});
reset.onclick=()=>{if(confirm("모든 GARANG 로컬 데이터를 삭제할까요?")){db=blank();save()}};
render();
