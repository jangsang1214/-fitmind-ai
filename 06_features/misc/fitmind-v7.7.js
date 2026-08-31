/* FitMind AI V7.7 — unified coach layer
   V7.0 server/LLM router hook
   V7.1 long-term memory
   V7.2 personal-data tools
   V7.3 adaptive workout program
   V7.4 nutrition coach
   V7.5 weekly/monthly reports
   V7.6 adaptive routine engine
   V7.7 account/plan/retention scaffolding
   This file is additive: it keeps the existing V5/V6 data model and overrides only the chat UX/orchestration layer.
*/
(function(){
'use strict';
const VERSION='7.7.0', KEY='fitmind_v2';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today=()=>new Date().toISOString().slice(0,10);
const db=()=>window.__FitMindV6DB?window.__FitMindV6DB():JSON.parse(localStorage.getItem(KEY)||'{}');
const save=()=>window.__FitMindV6Save?window.__FitMindV6Save():localStorage.setItem(KEY,JSON.stringify(db()));
const num=x=>Number.isFinite(Number(x))?Number(x):0;

function normalize(){
 const d=db();
 d.chat=Array.isArray(d.chat)?d.chat:[];
 d.chatSessions=Array.isArray(d.chatSessions)?d.chatSessions:[];
 d.coachMemory=d.coachMemory||{};
 d.coachMemory.facts=Array.isArray(d.coachMemory.facts)?d.coachMemory.facts:[];
 d.coachMemory.topics=Array.isArray(d.coachMemory.topics)?d.coachMemory.topics:[];
 d.coachMemory.preferences=d.coachMemory.preferences||{};
 d.coachMemory.goals=Array.isArray(d.coachMemory.goals)?d.coachMemory.goals:[];
 d.coachMemory.feedback=Array.isArray(d.coachMemory.feedback)?d.coachMemory.feedback:[];
 return d;
}
function remember(text,type='topic',confidence=.7){
 const d=normalize(); const t=String(text||'').trim(); if(!t)return;
 const arr=type==='fact'?d.coachMemory.facts:type==='goal'?d.coachMemory.goals:type==='preference'?d.coachMemory.preferences.items||(d.coachMemory.preferences.items=[]):d.coachMemory.topics;
 if(type==='preference'){
   if(!arr.includes(t))arr.push(t); if(arr.length>50)arr.splice(0,arr.length-50);
 }else{
   const item={text:t,type,confidence,date:today()};
   const exists=arr.some(x=>String(x?.text||'')===t);
   if(!exists)arr.push(item);
   if(arr.length>100)arr.splice(0,arr.length-100);
 }
 d.coachMemory.updatedAt=new Date().toISOString(); save();
}
function extractMemory(t){
 const q=String(t||'').trim();
 if(/내 이름은|나는 .*좋아|난 .*좋아|나는 .*싫어|난 .*싫어|내 목표는|목표는|앞으로 .*할 거|앞으로 .*하려고/.test(q)) remember(q,/좋아|싫어/.test(q)?'preference':/목표/.test(q)?'goal':'fact',.85);
 if(/기억해|기억하|잊지마/.test(q)) remember(q.replace(/기억해|기억하|잊지마/g,'').trim(),'fact',.95);
}
function context(){
 const d=normalize(), mem=d.coachMemory;
 return {version:VERSION,profile:d.profile||{},recentWorkouts:(d.workouts||[]).slice(-20),recentMeals:(d.meals||[]).slice(-20),recentBody:(d.body||[]).slice(-10),recentChat:d.chat.slice(-16),memory:{facts:mem.facts.slice(-20),topics:mem.topics.slice(-20),goals:mem.goals.slice(-10),preferences:mem.preferences.items?.slice?.(-20)||[]}};
}

function totals(){
 const d=normalize(), td=today();
 const meals=d.meals.filter(x=>String(x.date||x.createdAt||'').slice(0,10)===td);
 const workouts=d.workouts.filter(x=>String(x.date||x.createdAt||'').slice(0,10)===td);
 return {
  mealsKcal:meals.reduce((a,x)=>a+num(x.kcal??x.calories),0),
  protein:meals.reduce((a,x)=>a+num(x.protein),0), carbs:meals.reduce((a,x)=>a+num(x.carbs),0), fat:meals.reduce((a,x)=>a+num(x.fat),0),
  workoutKcal:workouts.reduce((a,x)=>a+num(x.kcal??x.calories??x.calorieBurn),0), workoutCount:workouts.length
 };
}
function target(){
 const d=normalize(),p=d.profile||{},g=window.FitMindDataEngineV65?.goal?.()||{};
 const weight=num(p.weight||g.weight), calories=num(g.targetCalories||p.recommendedCalories||p.tdee||p.BMR||p.bmr), protein=num(g.targetProtein||weight*1.8);
 return {weight,calories,protein,goal:g.type||'maintain'};
}
function workoutProgram(){
 const d=normalize(),p=d.profile||{}, recent=d.workouts.slice(-30);
 const goal=(window.FitMindDataEngineV65?.goal?.()?.type)||'maintain';
 const days=Math.min(6,Math.max(3,Math.round(num(p.trainingDays)||5)));
 const templates=days>=5?['가슴·삼두','등·이두','하체','어깨·복근','전신/약점']:days===4?['상체 A','하체 A','상체 B','하체 B']:['전신 A','전신 B','전신 C'];
 const last=(name)=>recent.filter(x=>String(x.exercise||x.name||x.exercise_name||'').includes(name)).slice(-1)[0];
 const bench=last('벤치');
 return {goal,days,templates,progression:bench?'벤치 기록이 확인돼 다음 세션은 마지막 성공 중량에서 2.5~5% 증량 또는 동일 중량 반복을 우선 검토.':'첫 주는 RIR 2~3을 기준으로 기준중량을 잡고 기록을 쌓기.',notes:'실제 세트·중량은 사용자의 최근 기록과 컨디션을 반영해 세션마다 조정.'};
}
function nutritionCoach(){
 const t=totals(),g=target(), leftCal=Math.max(0,g.calories-t.mealsKcal), leftP=Math.max(0,g.protein-t.protein);
 return {today:t,target:g,remaining:{calories:g.calories?leftCal:null,protein:leftP},advice:leftP>40?'다음 식사에서 단백질 25~40g을 우선 채우는 게 좋아.':leftCal>700?'활동량을 고려해 식사를 너무 줄이지 않는 게 좋아.':'현재 섭취량은 목표에 비교적 가까워.'};
}
function report(days=7){
 const d=normalize(), cutoff=Date.now()-days*86400000;
 const ws=d.workouts.filter(x=>new Date(x.date||x.createdAt||0).getTime()>=cutoff), ms=d.meals.filter(x=>new Date(x.date||x.createdAt||0).getTime()>=cutoff), body=d.body.filter(x=>new Date(x.date||x.createdAt||0).getTime()>=cutoff);
 const avgK=ms.length?ms.reduce((a,x)=>a+num(x.kcal??x.calories),0)/Math.max(1,days):0;
 const avgP=ms.length?ms.reduce((a,x)=>a+num(x.protein),0)/Math.max(1,days):0;
 const weights=body.map(x=>num(x.weight)).filter(Boolean);
 return {period:`${days}일`,workoutSessions:ws.length,totalWorkoutKcal:ws.reduce((a,x)=>a+num(x.kcal??x.calories),0),avgDailyKcal:Math.round(avgK),avgDailyProtein:Math.round(avgP*10)/10,weightStart:weights[0]??null,weightEnd:weights.at(-1)??null,delta:weights.length>1?weights.at(-1)-weights[0]:null};
}
function adaptiveRoutine(){
 const d=normalize(), p=d.profile||{};
 const recent=d.workouts.slice(-7), recovery=num(p.condition||8);
 const volume=recent.reduce((a,x)=>a+num(x.volume||x.totalVolume),0);
 if(recovery<=4)return {mode:'recovery',action:'오늘은 강도를 낮추고 회복 중심으로 진행. 주요 리프트는 평소의 70~80% 또는 RIR 3~4.'};
 if(volume>0 && recent.length>=6)return {mode:'deload',action:'최근 7일 운동 빈도가 높아. 다음 세션은 세트 수를 20~30% 줄이는 것을 고려.'};
 return {mode:'progress',action:'최근 기록을 기준으로 성공한 동작은 2.5~5% 증량을 우선 검토하고, 실패 시 동일 중량을 반복.'};
}
function localAnswer(q){
 const t=String(q||'').trim();
 const lower=t.toLowerCase();
 const data=window.FitMindDataEngineV65;
 if(/오늘.*(칼로리|섭취|단백질)|단백질.*(남|얼마)|영양/.test(t)){
   const n=nutritionCoach(); return `오늘은 ${Math.round(n.today.mealsKcal)}kcal, 단백질 ${n.today.protein.toFixed(1)}g을 기록했어. 목표는 ${n.target.calories?Math.round(n.target.calories)+'kcal':'자동 계산'} / 단백질 ${Math.round(n.target.protein)}g이고, ${n.advice}`;
 }
 if(/오늘.*(운동|소모)|운동.*(칼로리|평가)/.test(t)){
   const n=totals(); return `오늘 기록된 운동은 ${n.workoutCount}회고, 기록된 운동 소비량은 약 ${Math.round(n.workoutKcal)}kcal야. ${adaptiveRoutine().action}`;
 }
 if(/루틴|프로그램|운동 계획|운동 짜/.test(t)){
   const p=workoutProgram(); return `현재 목표 ${p.goal}, 주 ${p.days}회 기준으로 ${p.templates.join(' → ')} 구성을 추천해. ${p.progression}`;
 }
 if(/리포트|이번주|이번 주|주간/.test(t)){
   const r=report(7); return `이번 주 운동 ${r.workoutSessions}회, 운동 소비 ${Math.round(r.totalWorkoutKcal)}kcal, 평균 섭취 ${r.avgDailyKcal}kcal, 평균 단백질 ${r.avgDailyProtein}g이야.${r.delta!=null?` 체중은 ${r.weightStart}→${r.weightEnd}kg로 ${r.delta>0?'+':''}${r.delta.toFixed(1)}kg 변했어.`:''}`;
 }
 if(/기억|내가.*말했|내 목표/.test(t)){
   const m=context().memory; const bits=[...(m.facts||[]).map(x=>x.text),...(m.goals||[]).map(x=>x.text),...(m.preferences||[])].slice(-5);
   return bits.length?`기억하고 있는 내용 중 최근 항목은 ${bits.join(' / ')}야.`:'아직 장기기억으로 저장할 만한 정보가 많지 않아. 목표나 선호를 말해주면 중요한 것만 기억할게.';
 }
 if(/안녕|ㅎㅇ|하이/.test(lower))return 'ㅋㅋ 왔네. 오늘은 운동 얘기할까, 식단 얘기할까, 아니면 그냥 일상 얘기할까?';
 if(/고마워|감사/.test(t))return 'ㅋㅋ 별말을. 도움이 됐으면 됐지. 더 필요한 거 있으면 바로 말해.';
 if(/잘자|자러/.test(t))return 'ㅇㅋ 오늘은 여기까지 하자. 푹 자고 내일 이어서 보면 돼.';
 const base=window.FitMindDialogueV651?.answer?.(t,context());
 if(base)return base;
 const v5=window.FitMindV5?.answer?.(t,{db:db(),context:context()});
 return v5?.text||'응, 듣고 있어. 운동·식단 얘기든 그냥 일상 얘기든 편하게 이어서 말해줘.';
}
async function ask(q){
 const ctx=context();
 if(window.FitMindCloud?.route){
   const r=await window.FitMindCloud.route(q,ctx,(text)=>localAnswer(text));
   if(typeof r==='string')return r;
   if(r?.reply||r?.message)return r.reply||r.message;
   if(r?.text)return r.text;
 }
 return localAnswer(q);
}

function scrollLatest(instant=false){
 const log=$('chatLog'); if(!log)return;
 const go=()=>{log.scrollTop=log.scrollHeight; log.scrollTo?.({top:log.scrollHeight,behavior:instant?'auto':'smooth'});};
 requestAnimationFrame(go);setTimeout(go,80);setTimeout(go,260);setTimeout(go,650);
}
function render(){
 const d=normalize(),log=$('chatLog'); if(!log)return;
 log.innerHTML=d.chat.length?d.chat.slice(-80).map(x=>`<div class="msg ${x.role==='user'?'user':'ai'}">${esc(x.text)}</div>`).join(''):'<div class="card">새 대화가 시작됐어. 운동·식단·기록뿐 아니라 일상 얘기도 편하게 해줘.</div>';
 scrollLatest(true);
}
function archiveCurrent(){
 const d=normalize(); if(!d.chat.length)return;
 const first=d.chat.find(x=>x.role==='user');
 d.chatSessions.push({id:'chat_'+Date.now(),createdAt:new Date().toISOString(),title:(first?.text||'새 대화').slice(0,60),messages:d.chat.slice()});
 if(d.chatSessions.length>50)d.chatSessions=d.chatSessions.slice(-50);
}
function newChat(){
 const d=normalize();
 archiveCurrent();
 d.chat=[]; save();
 document.querySelectorAll('#v61ChatControls,#v603ChatControls,#v6ChatActions').forEach(x=>{if(x!==$('v77ChatControls'))x.remove();});
 render();
 const input=$('chatInput'); if(input){input.value='';input.focus();}
 scrollLatest(true);
}
function history(){
 const d=normalize(); let panel=$('v77HistoryPanel');
 if(!panel){
   panel=document.createElement('div');panel.id='v77HistoryPanel';panel.className='v77-history';
   panel.innerHTML='<div class="v77-history-head"><b>대화 기록</b><button type="button" id="v77CloseHistory">닫기</button></div><div id="v77HistoryList"></div>';
   $('v77ChatControls').after(panel); $('v77CloseHistory').onclick=()=>panel.remove();
 }
 const list=$('v77HistoryList');
 list.innerHTML=d.chatSessions.slice().reverse().map((s,i)=>`<button type="button" data-i="${d.chatSessions.length-1-i}"><b>${esc(s.title||'새 대화')}</b><small>${new Date(s.createdAt).toLocaleString('ko-KR')}</small></button>`).join('')||'<p>저장된 이전 대화가 없어.</p>';
 list.querySelectorAll('button').forEach(b=>b.onclick=()=>{const s=normalize().chatSessions[Number(b.dataset.i)];if(!s)return;const d2=normalize();d2.chat=s.messages.slice();save();render();panel.remove();scrollLatest(true);});
}
async function send(text){
 const q=String(text||'').trim();if(!q)return;
 const d=normalize(); d.chat.push({role:'user',text:q,date:today(),ts:Date.now()}); save(); extractMemory(q); render();
 const answer=await ask(q);
 const d2=normalize(); d2.chat.push({role:'ai',text:answer,date:today(),ts:Date.now()}); save(); render();
}
function ensureControls(){
 const page=$('chat');if(!page)return;
 document.querySelectorAll('#v61ChatControls,#v603ChatControls,#v6ChatActions').forEach(x=>x.remove());
 let controls=$('v77ChatControls');
 if(!controls){controls=document.createElement('div');controls.id='v77ChatControls';controls.className='v77-controls';controls.innerHTML='<button type="button" id="v77NewChat">＋ 새 채팅</button><button type="button" id="v77History">대화 기록</button><button type="button" id="v77CoachTools">코치 도구</button>';page.querySelector('h2')?.after(controls);}
 if(!controls.dataset.bound){controls.dataset.bound='1';$('v77NewChat').onclick=newChat;$('v77History').onclick=history;$('v77CoachTools').onclick=showTools;}
}
function showTools(){
 let panel=$('v77Tools');if(panel){panel.remove();return;}
 panel=document.createElement('div');panel.id='v77Tools';panel.className='v77-tools';
 panel.innerHTML='<div class="v77-tool-grid"><button data-tool="program">🏋️ 운동 프로그램</button><button data-tool="nutrition">🍚 식단 코칭</button><button data-tool="report">📊 주간 리포트</button><button data-tool="adaptive">🔄 루틴 조정</button><button data-tool="memory">🧠 장기기억</button><button data-tool="plan">💎 플랜 상태</button></div><pre id="v77ToolOut"></pre>';
 $('v77ChatControls').after(panel);
 panel.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{
  const k=b.dataset.tool,out=$('v77ToolOut');let v;
  if(k==='program')v=workoutProgram(); if(k==='nutrition')v=nutritionCoach(); if(k==='report')v=report(7); if(k==='adaptive')v=adaptiveRoutine(); if(k==='memory')v=context().memory; if(k==='plan')v=window.FitMindCloud?.getPlan?.()||{plan:'free'};
  out.textContent=JSON.stringify(v,null,2);
 });
}
function bind(){
 ensureControls();
 const form=$('chatForm'),input=$('chatInput');if(!form||!input)return;
 form.onsubmit=e=>{e.preventDefault();const q=input.value.trim();if(!q)return;input.value='';send(q);};
 const ai=[...($('mainNav')?.querySelectorAll('button')||[])].find(b=>b.textContent.includes('AI'));
 if(ai&&!ai.dataset.v77){ai.dataset.v77='1';ai.addEventListener('click',()=>setTimeout(()=>scrollLatest(true),0));}
 render();
}
function style(){if($('v77Style'))return;const st=document.createElement('style');st.id='v77Style';st.textContent=`
.v77-controls{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px}.v77-controls button,.v77-tool-grid button{border:1px solid #dfe4ee;background:#fff;color:#172033;border-radius:14px;padding:10px 14px;font-weight:800}.v77-controls button:first-child{background:#111827;color:#fff;border-color:#111827}.v77-history,.v77-tools{background:#fff;border:1px solid #e5e9f1;border-radius:18px;padding:12px;margin:0 0 14px;box-shadow:0 12px 30px rgba(15,23,42,.08)}.v77-history-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.v77-history-head button{border:0;background:transparent}.v77-history button{display:flex;width:100%;justify-content:space-between;gap:8px;border:0;border-top:1px solid #eef1f5;background:transparent;padding:12px 4px;text-align:left}.v77-history small{color:#7b8494}.v77-tool-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.v77-tools pre{white-space:pre-wrap;background:#f7f8fb;border-radius:12px;padding:10px;margin:10px 0 0;max-height:260px;overflow:auto}.chatlog{scroll-behavior:smooth;overscroll-behavior:contain}@media(max-width:600px){.v77-tool-grid{grid-template-columns:1fr}}
`;
 document.head.appendChild(st);}
function guardLegacyControls(){
 const page=$('chat'); if(!page||page.dataset.v77Guard==='1')return;
 page.dataset.v77Guard='1';
 const clean=()=>document.querySelectorAll('#v61ChatControls,#v603ChatControls,#v6ChatActions').forEach(x=>x.remove());
 clean();
 new MutationObserver(clean).observe(page,{childList:true,subtree:true});
}
function init(){style();guardLegacyControls();bind();setTimeout(bind,500);setTimeout(bind,1200);setTimeout(()=>{guardLegacyControls();bind();},1800);}
window.FitMindV77=Object.assign(window.FitMindV77||{},{version:VERSION,newChat,history,send,render,context,remember,workoutProgram,nutritionCoach,report,adaptiveRoutine,ask});
document.addEventListener('DOMContentLoaded',init);window.addEventListener('load',()=>setTimeout(init,200));
})();
