/* GARANG Golden Master Board v1
   Visible presentation owner for the Founder-approved Home / Recovery / Training / Nutrition / Coach board.
   Canonical state, routing, persistence, workout execution, Meal Scan and Coach writes stay owned by existing runtimes.
   Presentation truth rule: never fabricate user metrics, nutrition targets, workout prescriptions or Coach evidence.
*/
(() => {
'use strict';
if(window.GarangGoldenMasterBoardV1)return;
const VERSION='garang-golden-master-board-v1.0.0';
const SURFACES=['home','recovery','training','nutrition','coach'];
const ROUTES={home:'today',training:'workout',nutrition:'nutrition',coach:'coach'};
const doc=document;
let active='home',scheduled=false;
const app=()=>doc.getElementById('appView');
const main=()=>doc.getElementById('main');
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]));
const finite=(v,f=null)=>v===null||v===undefined||v===''?f:(Number.isFinite(Number(v))?Number(v):f);
const list=v=>Array.isArray(v)?v:[];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const sameDay=(row,date=today())=>String(row?.date||row?.day||row?.performedAt||row?.createdAt||'').slice(0,10)===date;
function state(){try{return window.GarangAgentStateBridge?.ready?.()?window.GarangAgentStateBridge.getState():null;}catch{return null;}}
function readJson(key){try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch{return null;}}
function firstNumber(...values){for(const value of values){const n=finite(value);if(n!==null)return n;}return null;}
function positiveTarget(...values){const n=firstNumber(...values);return n!==null&&n>0?Math.round(n):null;}
function latestCheckin(s){return [...list(s?.dailyCheckins),...list(s?.checkins)].filter(row=>sameDay(row)).at(-1)||list(s?.checkins).at(-1)||null;}
function intelligence(s){
  let userState=null,performance=null,decision=null;
  try{userState=window.GarangStateIntelligence?.estimateState?.(s,{now:new Date()})||null;}catch{}
  try{performance=window.GarangPerformanceScore?.compute?.(s,{now:new Date(),userState,includeHistory:false})||null;}catch{}
  try{decision=userState?window.GarangDecisionIntelligence?.decide?.(userState,{memoryContext:s?.memory||null})||null:null;}catch{}
  const recovery=firstNumber(performance?.components?.recovery?.score,performance?.components?.Recovery?.score,userState?.recoveryScore,userState?.recovery?.score,userState?.readinessScore,userState?.readiness?.score);
  return {userState,performance,decision,recovery:recovery===null?null:clamp(Math.round(recovery),0,100)};
}
function latestMetric(s,names){
  const wanted=names.map(x=>String(x).toLowerCase());
  return list(s?.physiologicalSignals).filter(row=>wanted.includes(String(row?.metric||row?.type||row?.name||'').toLowerCase())).sort((a,b)=>String(a?.at||a?.date||a?.createdAt||'').localeCompare(String(b?.at||b?.date||b?.createdAt||''))).at(-1)||null;
}
function signalValue(row){return firstNumber(row?.value,row?.amount,row?.score,row?.hours,row?.bpm,row?.ms);}
function mealTotals(s){
  const rows=list(s?.meals).filter(row=>sameDay(row));
  return rows.reduce((sum,row)=>({kcal:sum.kcal+(finite(row?.kcal,0)||0),protein:sum.protein+(finite(row?.protein,0)||0),carbs:sum.carbs+(finite(row?.carbs,0)||0),fat:sum.fat+(finite(row?.fat,0)||0),mealsCount:sum.mealsCount+1}),{kcal:0,protein:0,carbs:0,fat:0,mealsCount:0});
}
function dailyTraining(s){
  let draft=null;
  try{draft=window.GarangDailyPlanV1?.readDraft?.(s,today())||null;}catch{}
  const items=list(draft?.items),draftTraining=items.find(row=>String(row?.domain||'')==='training')||items.find(row=>String(row?.type||'')==='workout');
  if(draftTraining)return draftTraining;
  return list(s?.planner).find(row=>sameDay(row)&&String(row?.type||'').toLowerCase()==='workout'&&row?.completed!==true&&row?.done!==true)||null;
}
function workoutPayload(){const p=readJson('garang_daily_workout_plan_v1');return p?.plan&&Array.isArray(p.plan.exercises)?p:null;}
function workoutModel(s){
  const payload=workoutPayload(),training=dailyTraining(s),draft=list(window.GarangWorkoutExecutionBridge?.sessionDraft?.());
  const plan=payload?.plan||null,template=list(training?.templateExercises),rows=plan?.exercises?.length?plan.exercises:(draft.length?draft:template);
  const draftMinutes=draft.length?draft.reduce((sum,row)=>sum+(finite(row?.duration,0)||0),0):null;
  const minutes=firstNumber(plan?.minutes,training?.duration,draftMinutes);
  const title=String(training?.title||plan?.title||'오늘 운동 준비');
  return {payload,training,draft,rows,title,minutes:minutes===null?null:Math.max(0,Math.round(minutes)),count:rows.length};
}
function recoveryModel(s,intel){
  const checkin=latestCheckin(s),sleepSignal=latestMetric(s,['sleep_hours','sleephours','sleep']),hrv=latestMetric(s,['hrv_ms','hrv','heart_rate_variability']),rhr=latestMetric(s,['resting_heart_rate_bpm','restingheartrate','resting_heart_rate']);
  const sleep=firstNumber(checkin?.sleepHours,checkin?.sleep,signalValue(sleepSignal));
  const score=intel.recovery;
  const status=score===null?'Building signal':score>=80?'Ready to perform':score>=65?'Balanced':score>=50?'Moderate':'Recover first';
  const copy=score===null?'기록이 쌓일수록 오늘의 회복 판단이 더 정확해집니다.':score>=75?'오늘은 계획된 강도를 수행하기 좋은 상태예요.':score>=55?'수행은 가능하지만 강도는 조금 보수적으로 가져가세요.':'회복을 우선하고 불필요한 강도는 줄이세요.';
  return {score,status,copy,sleep,hrv:signalValue(hrv),rhr:signalValue(rhr)};
}
function nutritionModel(s){
  const totals=mealTotals(s),profile=s?.profile||{};
  return {...totals,target:positiveTarget(profile?.calorieTarget,profile?.targetCalories,profile?.dailyCalories),proteinTarget:positiveTarget(profile?.proteinTarget,profile?.targetProtein),carbTarget:positiveTarget(profile?.carbTarget,profile?.targetCarbs),fatTarget:positiveTarget(profile?.fatTarget,profile?.targetFat)};
}
function recentMeals(s){return list(s?.meals).filter(row=>sameDay(row)).slice().reverse().slice(0,4);}
function icon(name){
  const paths={home:'<path d="M3.5 11.2 12 4l8.5 7.2v8.3h-6v-5h-5v5h-6z"/>',recovery:'<path d="M19 5.5A8 8 0 1 0 20 17"/><path d="M19 5.5v5h-5"/>',training:'<path d="M6 8v8M18 8v8M6 12h12M3.5 9.5v5M20.5 9.5v5"/>',nutrition:'<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>',coach:'<path d="M7 4h10a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4h-5l-4.5 3v-3H7a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z"/>',bell:'<path d="M6 17h12l-1.3-2V10a4.7 4.7 0 0 0-9.4 0v5z"/><path d="M10 20h4"/>',send:'<path d="m4 12 16-8-6 16-2.5-6.5z"/>',calendar:'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>',chev:'<path d="m9 6 6 6-6 6"/>',plus:'<path d="M12 5v14M5 12h14"/>'};
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.home}</svg>`;
}
function bottomNav(surface){
  const labels={home:'Home',recovery:'Recovery',training:'Training',nutrition:'Nutrition',coach:'Coach'};
  return `<nav class="gmb-nav" aria-label="Primary">${SURFACES.map(key=>`<button type="button" data-gmb-nav="${key}" class="${surface===key?'active':''}">${icon(key)}<span>${labels[key]}</span></button>`).join('')}</nav>`;
}
function topbar(surface,s){
  if(surface==='home'){
    const initial=String(s?.profile?.name||s?.profile?.displayName||'G').trim().charAt(0).toUpperCase()||'G';
    return `<header class="gmb-top gmb-top-home"><div></div><div class="gmb-home-actions"><button type="button" data-gmb-top="notifications" aria-label="Notifications">${icon('bell')}</button><button type="button" class="gmb-avatar" data-gmb-top="profile" aria-label="Profile">${esc(initial)}</button></div></header>`;
  }
  return `<header class="gmb-top"><h1>${surface[0].toUpperCase()+surface.slice(1)}</h1><button type="button" data-gmb-top="settings" aria-label="Settings">•••</button></header>`;
}
function progressRing(value,label){const pct=clamp(finite(value,0)||0,0,100);return `<div class="gmb-recovery-arc" style="--score:${pct}"><div><strong>${value===null?'—':Math.round(value)}</strong><span>${esc(label||'')}</span></div></div>`;}
function spark(color='green'){return `<svg class="gmb-spark ${color}" viewBox="0 0 120 34" preserveAspectRatio="none"><path d="M2 27 C16 25 20 16 31 18 S48 31 62 19 S81 10 94 15 S108 9 118 7"/></svg>`;}
function trainingMeta(w){const minute=w.minutes===null?'시간 미정':`${w.minutes} min`,count=w.count?`${w.count} exercises`:'루틴 생성 필요';return `${minute} · ${count}`;}
function homeMarkup(s,intel){
  const r=recoveryModel(s,intel),n=nutritionModel(s),w=workoutModel(s),hour=new Date().getHours(),greeting=hour<12?'Good Morning':hour<18?'Good Afternoon':'Good Evening';
  const sleep=r.sleep===null?'—':`${Math.floor(r.sleep)}h ${Math.round((r.sleep%1)*60)}m`;
  const nutritionValue=n.mealsCount?`${Math.round(n.kcal).toLocaleString()} kcal`:'기록 없음';
  const nutritionTarget=n.target===null?'칼로리 목표 미설정':`${n.target.toLocaleString()} kcal target`;
  return `<section class="gmb-home"><div class="gmb-home-copy"><h2>${greeting}</h2><p>오늘의 몸 상태를 확인하고, 해야 할 일만 바로 시작하세요.</p></div><button class="gmb-recovery-hero" data-gmb-open="recovery"><div><span>Recovery Score</span><strong>${r.score===null?'—':r.score}</strong><p>${esc(r.status)}</p></div>${progressRing(r.score,'')}</button><div class="gmb-home-cards"><button class="gmb-home-card sleep" data-gmb-open="recovery"><span class="gmb-card-icon">☾</span><div><small>Sleep</small><strong>${sleep}</strong><em>지난밤 회복 신호</em></div>${icon('chev')}</button><button class="gmb-home-card training" data-gmb-open="training"><span class="gmb-card-icon">↗</span><div><small>Training</small><strong>${esc(w.title)}</strong><em>${esc(trainingMeta(w))}</em></div>${icon('chev')}</button><button class="gmb-home-card nutrition" data-gmb-open="nutrition"><span class="gmb-card-icon">◎</span><div><small>Nutrition</small><strong>${nutritionValue}</strong><em>${nutritionTarget}</em></div>${icon('chev')}</button></div></section>`;
}
function recoveryMarkup(s,intel){
  const r=recoveryModel(s,intel),sleep=r.sleep===null?'—':`${Math.floor(r.sleep)}h ${Math.round((r.sleep%1)*60)}m`;
  return `<section class="gmb-recovery"><div class="gmb-segments"><button class="active">Today</button><button>Trends</button><button>Insights</button></div><div class="gmb-recovery-main">${progressRing(r.score,r.status)}<p>${esc(r.copy)}</p></div><div class="gmb-metric-grid"><article><div><small>HRV</small><strong>${r.hrv===null?'—':`${Math.round(r.hrv)} ms`}</strong><em>7-day baseline</em></div>${spark('green')}</article><article><div><small>Resting HR</small><strong>${r.rhr===null?'—':`${Math.round(r.rhr)} bpm`}</strong><em>morning average</em></div>${spark('blue')}</article><article><div><small>Sleep</small><strong>${sleep}</strong><em>last night</em></div>${spark('purple')}</article></div></section>`;
}
function trainingRows(w){
  const rows=w.rows.slice(0,6);
  if(!rows.length)return `<div class="gmb-meal-empty gmb-exercise-empty"><span>아직 확정된 운동 루틴이 없어요.</span><strong>START WORKOUT에서 오늘 루틴을 준비하세요.</strong></div>`;
  return rows.map((row,i)=>{
    const load=firstNumber(row?.suggestedWeight,row?.weight),loadText=load!==null&&load>0?`${Number(load.toFixed(1))} kg`:'중량 미정';
    return `<article class="gmb-exercise-row"><div class="gmb-exercise-thumb t${i%3}"><img src="./05_assets/body-model-v6/male-front.svg" alt=""></div><div><strong>${esc(row.name||row.exercise||'운동')}</strong><span>${Math.max(1,Math.round(finite(row.sets,1)||1))} sets · ${Math.max(1,Math.round(finite(row.reps,1)||1))} reps</span></div><em>${loadText}</em></article>`;
  }).join('');
}
function trainingMarkup(s){
  const w=workoutModel(s),d=new Date(),weekday=d.toLocaleDateString('en-US',{weekday:'short'}),month=d.toLocaleDateString('en-US',{month:'short'}),day=d.getDate();
  return `<section class="gmb-training"><div class="gmb-training-date"><button type="button" aria-label="Previous day">‹</button><div><strong>Today</strong><span>${weekday}, ${month} ${day}</span></div><button type="button" aria-label="Calendar">${icon('calendar')}</button></div><div class="gmb-workout-hero"><img src="./05_assets/body-model-v6/male-front.svg" alt="Workout athlete"><div class="gmb-workout-overlay"></div><div class="gmb-workout-copy"><small>Today’s Workout</small><h2>${esc(w.title)}</h2><p>${esc(trainingMeta(w))}</p><button type="button" data-gmb-start>START WORKOUT</button></div></div><div class="gmb-exercise-list">${trainingRows(w)}</div></section>`;
}
function macroCard(label,value,target,kind){
  const hasTarget=target!==null&&target>0,pct=hasTarget?clamp(Math.round(value/target*100),0,100):0,targetText=hasTarget?`${Math.round(target)}g target`:'목표 미설정';
  return `<article class="gmb-macro-card ${kind}"><div><small>${label}</small><strong>${Math.round(value)}g</strong><span>${targetText}</span></div><i><b style="width:${pct}%"></b></i></article>`;
}
function mealRows(s){
  const rows=recentMeals(s);
  if(!rows.length)return `<div class="gmb-meal-empty"><span>아직 기록된 식사가 없어요.</span><button type="button" data-gmb-meal-scan>Meal Scan</button></div>`;
  return rows.map((row,i)=>{const time=String(row?.time||row?.createdAt||'').slice(11,16)||'—',name=row?.name||list(row?.items).map(x=>x?.name).filter(Boolean).slice(0,2).join(' + ')||'Meal';return `<article class="gmb-meal-row"><div class="gmb-meal-thumb m${i%3}">◌</div><div><small>${i===0?'Latest meal':'Meal'}</small><strong>${esc(name)}</strong><span>${time}</span></div><em>${Math.round(finite(row?.kcal,0)||0)} kcal</em></article>`;}).join('');
}
function nutritionMarkup(s){
  const n=nutritionModel(s),pct=n.target?clamp(Math.round(n.kcal/n.target*100),0,100):0,targetText=n.target?`target ${n.target.toLocaleString()}`:'목표 미설정';
  return `<section class="gmb-nutrition"><div class="gmb-segments"><button class="active">Today</button><button>Analysis</button><button>History</button></div><div class="gmb-calorie-ring" style="--cal:${pct}"><div><strong>${Math.round(n.kcal).toLocaleString()}</strong><span>kcal logged</span><small>${targetText}</small></div></div><div class="gmb-macro-grid">${macroCard('Protein',n.protein,n.proteinTarget,'protein')}${macroCard('Carbs',n.carbs,n.carbTarget,'carbs')}${macroCard('Fat',n.fat,n.fatTarget,'fat')}</div><div class="gmb-meals-head"><h2>Today’s Meals</h2><button type="button" data-gmb-meal-scan aria-label="Add meal">${icon('plus')}</button></div><div class="gmb-meal-list">${mealRows(s)}</div></section>`;
}
function latestCoachText(s,intel){
  const chat=list(s?.aiChat).slice().reverse().find(row=>String(row?.role||'').toLowerCase()!=='user'),d=intel?.decision||{},summary=d?.summary||{};
  return String(chat?.content||chat?.text||summary?.text||summary?.headline||d?.message||d?.reason||'오늘 기록을 남기면 회복·운동·식단을 함께 보고 다음 행동을 정리해드릴게요.');
}
function coachMarkup(s,intel){
  const text=latestCoachText(s,intel),prompts=['오늘 운동 추천해줘','식단 피드백 해줘','회복 상태 분석해줘','궁금한 게 있어요'];
  return `<section class="gmb-coach"><div class="gmb-coach-thread"><article class="gmb-coach-message"><div class="gmb-coach-avatar">G</div><div><strong>GARANG Coach</strong><p>${esc(text)}</p></div></article><div class="gmb-prompt-grid">${prompts.map(p=>`<button type="button" data-gmb-prompt="${esc(p)}">${esc(p)}</button>`).join('')}</div></div><form class="gmb-composer" data-gmb-coach-form><input aria-label="Message GARANG" placeholder="GARANG에게 물어보세요" autocomplete="off"><button type="submit" aria-label="Send">${icon('send')}</button></form></section>`;
}
function bodyFor(surface,s,intel){if(surface==='recovery')return recoveryMarkup(s,intel);if(surface==='training')return trainingMarkup(s);if(surface==='nutrition')return nutritionMarkup(s);if(surface==='coach')return coachMarkup(s,intel);return homeMarkup(s,intel);}
function ensureShell(surface,s){
  const view=app();if(!view||view.hidden)return false;
  doc.documentElement.dataset.garangGoldenBoard='1';doc.body.classList.add('garang-golden-board');
  doc.querySelector('.topbar')?.setAttribute('data-gmb-canonical','hidden');doc.getElementById('bottomNav')?.setAttribute('data-gmb-canonical','hidden');
  let top=doc.getElementById('garangGoldenBoardTop');if(!top){top=doc.createElement('div');top.id='garangGoldenBoardTop';view.prepend(top);}top.innerHTML=topbar(surface,s);
  let nav=doc.getElementById('garangGoldenBoardNav');if(!nav){nav=doc.createElement('div');nav.id='garangGoldenBoardNav';view.appendChild(nav);}nav.innerHTML=bottomNav(surface);
  return true;
}
function render(){
  scheduled=false;const m=main(),s=state();if(!m||!s||!ensureShell(active,s))return false;
  let host=doc.getElementById('garangGoldenBoard');if(!host){host=doc.createElement('section');host.id='garangGoldenBoard';m.appendChild(host);}
  m.classList.add('gmb-shell-active');m.dataset.goldenBoardSurface=active;host.innerHTML=bodyFor(active,s,intelligence(s));return true;
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(render);}
function setSurface(next,{navigate=true}={}){
  if(!SURFACES.includes(next))return false;active=next;
  if(navigate&&ROUTES[next]){try{window.GarangRouter?.navigate?.(ROUTES[next],{source:'golden-board',force:true});}catch{}}
  schedule();return true;
}
function startWorkout(){
  const payload=workoutPayload(),rows=payload?.plan?.exercises||[];
  window.GarangGoldenBoardContinuationV1?.enter?.('workout');
  if(rows.length&&typeof window.GarangWorkoutIntelligenceUI?.queueImport==='function'){
    window.GarangWorkoutIntelligenceUI.queueImport(rows,'golden_board');
    try{window.GarangRouter?.navigate?.('workout',{source:'golden-board-start',force:true});}catch{}
    setTimeout(()=>{window.GarangWorkoutIntelligenceUI?.processImportQueue?.();requestAnimationFrame(()=>{window.GarangWorkoutExecutionBridge?.activateImportedRoutineStart?.();window.GarangWorkoutExecutionV2?.startWorkoutSession?.();});},90);return true;
  }
  try{window.GarangRouter?.navigate?.('workout',{source:'golden-board-start',force:true});setTimeout(()=>window.GarangWorkoutExecutionV2?.startWorkoutSession?.(),100);return true;}catch{return false;}
}
function openMealScan(){window.GarangGoldenBoardContinuationV1?.enter?.('nutrition');try{window.GarangRouter?.navigate?.('nutrition',{source:'golden-board-meal',force:true});}catch{}setTimeout(()=>doc.getElementById('pickMealScan')?.click(),120);}
function sendCoach(value){
  const text=String(value||'').trim();if(!text)return false;
  window.GarangGoldenBoardContinuationV1?.enter?.('coach');try{window.GarangRouter?.navigate?.('coach',{source:'golden-board-coach',force:true});}catch{}
  setTimeout(()=>window.GarangGoldenBoardContinuationV1?.dispatchCoach?.(text),160);return true;
}
doc.addEventListener('click',event=>{
  const nav=event.target.closest?.('[data-gmb-nav]');if(nav){event.preventDefault();setSurface(nav.dataset.gmbNav);return;}
  const open=event.target.closest?.('[data-gmb-open]');if(open){event.preventDefault();setSurface(open.dataset.gmbOpen);return;}
  if(event.target.closest?.('[data-gmb-start]')){event.preventDefault();startWorkout();return;}
  if(event.target.closest?.('[data-gmb-meal-scan]')){event.preventDefault();openMealScan();return;}
  const prompt=event.target.closest?.('[data-gmb-prompt]');if(prompt){event.preventDefault();const input=doc.querySelector('[data-gmb-coach-form] input');if(input){input.value=prompt.dataset.gmbPrompt||'';input.focus();}return;}
  const top=event.target.closest?.('[data-gmb-top]');if(!top)return;
  if(top.dataset.gmbTop==='profile'){event.preventDefault();doc.getElementById('profileTopBtn')?.click();return;}
  if(top.dataset.gmbTop==='settings'||top.dataset.gmbTop==='notifications'){event.preventDefault();doc.getElementById('settingsTopBtn')?.click();}
},true);
doc.addEventListener('submit',event=>{const form=event.target.closest?.('[data-gmb-coach-form]');if(!form)return;event.preventDefault();const input=form.querySelector('input'),value=input?.value||'';if(sendCoach(value)&&input)input.value='';},true);
for(const name of ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:route-completed'])window.addEventListener(name,event=>{
  if(window.GarangGoldenBoardContinuationV1?.activeRoute)return;
  const screen=String(event?.detail?.screen||main()?.dataset?.garangScreen||'');
  if(screen==='today'&&active!=='recovery')active='home';else if(screen==='workout')active='training';else if(screen==='nutrition')active='nutrition';else if(screen==='coach')active='coach';schedule();
},{passive:true});
window.addEventListener('pageshow',schedule,{passive:true});
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.GarangGoldenMasterBoardV1=Object.freeze({version:VERSION,render,schedule,setSurface,get active(){return active;}});
})();