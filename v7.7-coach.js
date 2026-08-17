/* FitMind AI V7.7 — single chat controller + coach engine
   V7.0~V7.7 integrated client layer.
   - One canonical new-chat/history UI (removes V6 duplicate controls)
   - Conversation sessions + long-term memory
   - Personal-data tools: nutrition/workout/body/trends
   - AI workout planner / nutrition coach / weekly report / recovery adjustment
   - Cost-controlled server LLM routing (API key stays server-side in production)
*/
(function(){
'use strict';
const VERSION='7.7.0', KEY='fitmind_v2';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today=()=>new Date().toISOString().slice(0,10);
function db(){return window.__FitMindV6DB?window.__FitMindV6DB():JSON.parse(localStorage.getItem(KEY)||'{}');}
function save(){if(window.__FitMindV6Save)window.__FitMindV6Save();else localStorage.setItem(KEY,JSON.stringify(db()));}
function ensure(){const d=db();
 d.chat=Array.isArray(d.chat)?d.chat:[];
 d.chatSessions=Array.isArray(d.chatSessions)?d.chatSessions:[];
 d.coachMemory=d.coachMemory&&typeof d.coachMemory==='object'?d.coachMemory:{};
 d.coachMemory.facts=Array.isArray(d.coachMemory.facts)?d.coachMemory.facts:[];
 d.coachMemory.preferences=Array.isArray(d.coachMemory.preferences)?d.coachMemory.preferences:[];
 d.coachMemory.goals=Array.isArray(d.coachMemory.goals)?d.coachMemory.goals:[];
 return d;
}
function remember(text,type='topic'){const d=ensure();const m=d.coachMemory;const item={text:String(text),type,date:today()};const arr=type==='fact'?m.facts:type==='preference'?m.preferences:m.goals; if(!arr.some(x=>x.text===item.text))arr.push(item);if(arr.length>80)arr.splice(0,arr.length-80);m.updatedAt=new Date().toISOString();save();}
function compactContext(){const d=ensure();return {profile:d.profile||{},workouts:(d.workouts||[]).slice(-30),meals:(d.meals||[]).slice(-30),body:(d.body||[]).slice(-12),memory:{facts:d.coachMemory.facts.slice(-20),preferences:d.coachMemory.preferences.slice(-15),goals:d.coachMemory.goals.slice(-15)},recentChat:d.chat.slice(-20)};}
function totals(){const d=ensure(),t=today();const meals=d.meals.filter(x=>String(x.date||'').slice(0,10)===t), workouts=d.workouts.filter(x=>String(x.date||'').slice(0,10)===t);return {kcal:meals.reduce((a,x)=>a+Number(x.kcal??x.calories??0),0),protein:meals.reduce((a,x)=>a+Number(x.protein??0),0),carbs:meals.reduce((a,x)=>a+Number(x.carbs??x.carbohydrate??0),0),fat:meals.reduce((a,x)=>a+Number(x.fat??0),0),workoutKcal:workouts.reduce((a,x)=>a+Number(x.kcal??x.calories??x.calorieBurn??0),0),workouts};}
function bodyTrend(){const d=ensure();const h=d.body.filter(x=>Number(x.weight)>0).sort((a,b)=>String(a.date).localeCompare(String(b.date)));const a=h.slice(-7),b=h.slice(-14,-7);const avg=x=>x.length?x.reduce((s,r)=>s+Number(r.weight),0)/x.length:null;const aa=avg(a),bb=avg(b);return {current:aa,previous:bb,delta:aa!=null&&bb!=null?aa-bb:null,count:h.length};}
function strengthSummary(){const d=ensure();const rows=d.workouts.slice(-60);const map={};rows.forEach(w=>{const name=w.exercise||w.name||w.exercise_name;if(!name)return;const weight=Number(w.weight??w.load??w.kg??0),reps=Number(w.reps??w.repeat??0);if(!map[name]||weight>map[name].weight)map[name]={weight,reps,date:w.date};});return map;}
function plan(){const d=ensure(),p=d.profile||{};const g=(window.FitMindDataEngineV65?.goal?.()||{});return {goal:g.type||p.goal||'maintain',targetWeight:g.targetWeight??p.targetWeight??null,targetCalories:g.targetCalories??p.recommendedCalories??p.tdee??null,targetProtein:g.targetProtein??(Number(p.weight||70)*1.8),daysPerWeek:p.daysPerWeek||p.trainingDays||5};}
function localCoach(q){
 const d=ensure(),q0=String(q).trim(),t=totals(),p=plan(),tr=bodyTrend();
 const low=/오늘.*(먹|칼로리|단백질)|섭취|영양/.test(q0); const wk=/운동|벤치|스쿼트|데드|루틴|세트|중량|RPE|RIR/i.test(q0); const body=/체중|몸무게|체지방|추세|정체/.test(q0);
 if(/안녕|ㅎㅇ|하이|반가/.test(q0))return 'ㅋㅋ 왔네. 오늘은 운동 얘기할까, 식단 얘기할까? 아니면 그냥 아무 얘기나 해도 돼.';
 if(/고마워|감사/.test(q0))return 'ㅋㅋ 별말을. 도움 됐으면 됐지. 이어서 필요한 거 있으면 말해줘.';
 if(/잘자|자러|잠/.test(q0))return 'ㅇㅋ 오늘은 여기까지 하자. 푹 자고 내일 이어서 보면 돼.';
 if(low)return `오늘 기록 기준 ${Math.round(t.kcal).toLocaleString()}kcal, 단백질 ${t.protein.toFixed(1)}g이야.${p.targetCalories?` 목표는 약 ${Math.round(p.targetCalories)}kcal, 단백질 ${Math.round(p.targetProtein)}g.`:''} ${t.protein<p.targetProtein*.7?'다음 식사는 단백질을 우선 채우는 게 좋아.':''}`.trim();
 if(body)return tr.delta==null?'체중 비교 데이터가 아직 부족해. 여러 번 기록하면 최근 7일 평균과 이전 7일을 비교해줄게.':`최근 7일 평균 체중은 ${tr.current.toFixed(1)}kg, 이전 7일은 ${tr.previous.toFixed(1)}kg으로 ${tr.delta>=0?'+':''}${tr.delta.toFixed(1)}kg 변했어.`;
 if(wk){const s=strengthSummary();const bench=Object.entries(s).find(([n])=>/벤치/i.test(n));return bench?`최근 벤치 최고 기록 기준 ${bench[1].weight}kg × ${bench[1].reps||'?'}회가 잡혀 있어. 다음 세션은 최근 수행 난이도와 RIR을 같이 보고 2.5~5% 범위에서 조정하자.`:'최근 운동 기록을 기준으로 보자. 중량·반복·세트·RIR을 같이 기록하면 다음 루틴을 더 정확하게 조정할 수 있어.';}
 if(/힘들|피곤|졸려|지쳐|스트레스/.test(q0))return '오늘 좀 지쳤구나. 지금은 무조건 밀어붙이기보다 회복 상태부터 보는 게 좋아. 운동 얘기면 오늘 강도를 같이 낮춰볼 수도 있어.';
 return '응, 듣고 있어 ㅋㅋ 운동이나 식단 얘기 아니어도 괜찮아. 편하게 이어서 말해봐.';
}
function serverEndpoint(){const d=ensure();return d.api?.url||localStorage.getItem('fitmind_server_endpoint')||'/api/coach';}
async function serverAsk(text){const d=ensure();const url=serverEndpoint();if(!url)return null;try{const h={'Content-Type':'application/json'};const key=d.api?.key;if(key)h.Authorization='Bearer '+key;const r=await fetch(url,{method:'POST',headers:h,body:JSON.stringify({version:VERSION,query:text,context:compactContext(),plan:localStorage.getItem('fitmind_plan_state')||'free'})});if(!r.ok)return null;const j=await r.json();return j.text||j.reply||j.message||null;}catch(e){return null;}}
async function ask(text){const cloud=localStorage.getItem('fitmind_plan_state');let planState={};try{planState=JSON.parse(cloud||'{}')}catch{};const useServer=planState.plan==='pro'||planState.plan==='pro_plus'||!!ensure().api?.url;return useServer?(await serverAsk(text))||localCoach(text):localCoach(text);}
function render(){const log=$('chatLog');if(!log)return;const d=ensure();const rows=d.chat.slice(-80);log.innerHTML=rows.length?rows.map(x=>`<div class="msg ${x.role==='user'?'user':'ai'}">${esc(x.text)}</div>`).join(''):'<div class="card">안녕하세요. 운동·식단·체중 데이터도 보고, 그냥 일상 대화도 편하게 할 수 있어요.</div>';scrollLatest(false);}
function scrollLatest(smooth=true){const log=$('chatLog');if(!log)return;requestAnimationFrame(()=>{log.scrollTo({top:log.scrollHeight,behavior:smooth?'smooth':'instant'});const bar=$('chatForm');if(bar)bar.scrollIntoView({block:'end',behavior:smooth?'smooth':'instant'});});}
function archiveAndNew(){const d=ensure();if(d.chat.length){const first=d.chat.find(x=>x.role==='user');d.chatSessions.push({id:'s_'+Date.now(),title:first?.text||'새 대화',createdAt:new Date().toISOString(),messages:d.chat.slice()});if(d.chatSessions.length>50)d.chatSessions=d.chatSessions.slice(-50);}d.chat=[];save();render();const input=$('chatInput');if(input){input.value='';input.focus();}scrollLatest(false);}
function showHistory(){const d=ensure();let panel=$('v77History');if(!panel){panel=document.createElement('div');panel.id='v77History';panel.className='v77-history';$('chat').querySelector('h2').after(panel);}const sessions=d.chatSessions.slice().reverse();panel.innerHTML=`<div class="v77-history-head"><b>대화 기록</b><button type="button" id="v77Close">닫기</button></div>`+(sessions.length?sessions.map((s,i)=>`<button type="button" class="v77-history-item" data-i="${d.chatSessions.length-1-i}"><span>${esc(String(s.title||'새 대화').slice(0,42))}</span><small>${new Date(s.createdAt).toLocaleString('ko-KR')}</small></button>`).join(''):'<p>저장된 이전 대화가 없습니다.</p>');$('v77Close').onclick=()=>panel.remove();panel.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const s=ensure().chatSessions[Number(b.dataset.i)];if(!s)return;const x=ensure();x.chat=s.messages.slice();save();render();panel.remove();scrollLatest(false);});}
function memoryPanel(){const d=ensure();return `<div class="v77-memory-mini"><b>장기기억</b> ${d.coachMemory.facts.length+d.coachMemory.preferences.length+d.coachMemory.goals.length}개 저장</div>`;}
function planner(){const p=plan(),s=strengthSummary();const names=Object.keys(s).slice(0,6);return {title:'AI 주간 운동 플랜',goal:p.goal,days:p.daysPerWeek,daysPlan:Array.from({length:Math.min(p.daysPerWeek,5)},(_,i)=>({day:i+1,focus:['가슴/삼두','등/이두','하체','어깨/팔','전신'][i],note:'최근 기록과 RIR에 따라 중량을 2.5~5% 범위에서 조정'})),basedOn:names};}
function nutritionPlan(){const t=totals(),p=plan();return {today:t,targets:{kcal:p.targetCalories,protein:p.targetProtein},advice:t.protein<p.targetProtein?'단백질을 다음 식사에서 우선 보충':'현재 단백질 흐름은 목표에 가깝다'};}
function weeklyReport(){const d=ensure(),now=Date.now(),week=d.workouts.filter(x=>now-new Date(x.date||now).getTime()<7*86400000),meals=d.meals.filter(x=>now-new Date(x.date||now).getTime()<7*86400000),tr=bodyTrend();return {workoutSessions:week.length,mealRecords:meals.length,avgCalories:meals.length?Math.round(meals.reduce((a,x)=>a+Number(x.kcal??x.calories??0),0)/Math.max(1,new Set(meals.map(x=>String(x.date).slice(0,10))).size)):0,weightDelta:tr.delta};}
function recovery(){const d=ensure(),recent=d.workouts.slice(-7),volume=recent.reduce((a,x)=>a+Number(x.volume??x.totalVolume??0),0);return {recentSessions:recent.length,volume,recommendation:recent.length>=6?'회복을 우선하고 다음 세션 강도를 5~10% 낮추는 선택지를 검토':'현재 기록상 과도한 빈도 신호는 약하다'};}
function inject(){const page=$('chat');if(!page)return;
 // Remove ALL legacy chat control variants. V7.7 owns this UI.
 ['v61ChatControls','v603ChatControls','v6ChatActions'].forEach(id=>$(id)?.remove());
 page.querySelectorAll('.v6-actions,.v603-chat-controls,.v61-chat-controls').forEach(x=>x.remove());
 let actions=$('v77ChatActions');if(!actions){actions=document.createElement('div');actions.id='v77ChatActions';actions.innerHTML='<button type="button" id="v77New">＋ 새 채팅</button><button type="button" id="v77HistoryBtn">대화 기록</button><button type="button" id="v77Plan">운동 플랜</button><button type="button" id="v77Report">주간 리포트</button>';page.querySelector('h2').after(actions);}
 if(!actions.dataset.bound){actions.dataset.bound='1';$('v77New').onclick=archiveAndNew;$('v77HistoryBtn').onclick=showHistory;$('v77Plan').onclick=()=>alert(JSON.stringify(planner(),null,2));$('v77Report').onclick=()=>alert(JSON.stringify(weeklyReport(),null,2));}
 let badge=$('v77Status');if(!badge){badge=document.createElement('div');badge.id='v77Status';page.querySelector('h2').insertAdjacentElement('afterend',badge);}badge.innerHTML=`${memoryPanel()} <span>V7.7 코치 엔진</span>`;
 const form=$('chatForm'),input=$('chatInput');if(form&&!form.dataset.v77){form.dataset.v77='1';form.onsubmit=async e=>{e.preventDefault();const text=input.value.trim();if(!text)return;input.value='';const d=ensure();d.chat.push({role:'user',text,date:today(),ts:Date.now()});save();render();remember(text,/나는|내가|나는.*좋아|싫어/.test(text)?'preference':'topic');const answer=await ask(text);const d2=ensure();d2.chat.push({role:'ai',text:answer,date:today(),ts:Date.now()});d2.coachMemory.lastAdvice=answer;save();render();};input.addEventListener('focus',()=>scrollLatest(true));}
 render();
}
function styles(){if($('v77Style'))return;const st=document.createElement('style');st.id='v77Style';st.textContent=`#v77ChatActions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}#v77ChatActions button{border:1px solid #dfe4ee;border-radius:14px;padding:10px 14px;background:#fff;color:#172033;font-weight:800}#v77ChatActions #v77New{background:#111827;color:#fff}#v77Status{display:flex;justify-content:space-between;align-items:center;margin:0 0 10px;color:#64748b;font-size:13px}.v77-memory-mini{color:#475569}.v77-history{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:12px;margin:0 0 14px;box-shadow:0 12px 30px rgba(15,23,42,.08)}.v77-history-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.v77-history-item{display:flex;width:100%;justify-content:space-between;gap:8px;text-align:left;background:#fff;border:0;border-top:1px solid #eef1f5;padding:12px 4px}.v77-history-item small{color:#94a3b8}.chatlog{scroll-behavior:smooth;overscroll-behavior:contain}`;document.head.appendChild(st);}
function openPageHook(){const old=window.openPage;if(typeof old!=='function')return;if(window.__v77OpenHook)return;window.__v77OpenHook=true;window.openPage=function(id){old(id);if(id==='chat')setTimeout(()=>{inject();scrollLatest(false)},20);};}
function init(){styles();inject();openPageHook();setTimeout(inject,300);setTimeout(inject,1000);}
window.FitMindV77=Object.assign(window.FitMindV77||{},{version:VERSION,db,save,render,newChat:archiveAndNew,showHistory,planner,nutritionPlan,weeklyReport,recovery,ask,compactContext});
window.chatRender=render;
document.addEventListener('DOMContentLoaded',init);window.addEventListener('load',()=>setTimeout(init,100));
})();
