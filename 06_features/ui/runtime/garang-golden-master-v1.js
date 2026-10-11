/* GARANG Golden Master v1
   Founder-approved visual source of truth: Home / Recovery / Training / Nutrition / Coach.
   One presentation owner only. Canonical state, mutations, routing and intelligence remain unchanged.
*/
(() => {
'use strict';
if (window.GarangGoldenMasterV1) return;
const VERSION='garang-golden-master-v1.0.0';
const SURFACES=['home','recovery','training','nutrition','coach'];
const ROUTES={home:'today',training:'workout',nutrition:'nutrition',coach:'coach'};
let active='home',scheduled=false;
const doc=document;
const main=()=>doc.getElementById('main');
const app=()=>doc.getElementById('appView');
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num=(v,f=null)=>{const n=Number(v);return Number.isFinite(n)?n:f;};
const list=v=>Array.isArray(v)?v:[];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const sameDay=(row,date=today())=>String(row?.date||row?.day||row?.performedAt||row?.createdAt||'').slice(0,10)===date;
function state(){try{return window.GarangAgentStateBridge?.ready?.()?window.GarangAgentStateBridge.getState():null;}catch{return null;}}
function readJson(key){try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch{return null;}}
function firstNumber(...values){for(const value of values){const n=num(value);if(n!==null)return n;}return null;}
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
function mealTotals(s){return list(s?.meals).filter(row=>sameDay(row)).reduce((sum,row)=>({kcal:sum.kcal+(num(row?.kcal,0)||0),protein:sum.protein+(num(row?.protein,0)||0),carbs:sum.carbs+(num(row?.carbs,0)||0),fat:sum.fat+(num(row?.fat,0)||0)}),{kcal:0,protein:0,carbs:0,fat:0});}
function dailyTraining(s){
  let draft=null;
  try{draft=window.GarangDailyPlanV1?.readDraft?.(s,today())||null;}catch{}
  if(!draft)try{draft=window.GarangDailyPlanV1?.ensureDailyDraft?.(s,{date:today()})?.group||null;}catch{}
  const items=list(draft?.items),training=items.find(row=>String(row?.domain||'')==='training')||items.find(row=>String(row?.type||'')==='workout')||null;
  return training;
}
function workoutPayload(){const p=readJson('garang_daily_workout_plan_v1');return p?.plan&&Array.isArray(p.plan.exercises)?p:null;}
function workoutModel(s){
  const payload=workoutPayload(),training=dailyTraining(s),draft=list(window.GarangWorkoutExecutionBridge?.sessionDraft?.());
  const plan=payload?.plan||null;
  const rows=plan?.exercises?.length?plan.exercises:draft;
  const title=String(training?.title||plan?.title||'Today’s Workout');
  const minutes=Math.max(0,Math.round(firstNumber(plan?.minutes,training?.duration,draft.reduce((sum,row)=>sum+(num(row?.duration,0)||0),0))||0));
  return {payload,training,draft,rows,title,minutes,count:rows.length};
}
function recoveryModel(s,intel){
  const checkin=latestCheckin(s),sleepSignal=latestMetric(s,['sleep_hours','sleephours','sleep']),hrv=latestMetric(s,['hrv_ms','hrv','heart_rate_variability']),rhr=latestMetric(s,['resting_heart_rate_bpm','restingheartrate','resting_heart_rate']),stressSignal=latestMetric(s,['stress_score','stress']);
  const sleep=firstNumber(checkin?.sleepHours,checkin?.sleep,signalValue(sleepSignal));
  const stress=firstNumber(checkin?.stress,signalValue(stressSignal));
  const score=intel.recovery;
  const status=score===null?'Building signal':score>=80?'Good':score>=65?'Balanced':score>=50?'Moderate':'Recover';
  const copy=score===null?'Keep logging recovery signals to sharpen today’s decision.':score>=75?'Your body is balanced and ready to perform.':score>=55?'You are ready, but keep today controlled.':'Protect recovery and reduce unnecessary intensity.';
  return {score,status,copy,sleep,hrv:signalValue(hrv),rhr:signalValue(rhr),stress};
}
function trendPoints(s){
  const rows=list(s?.checkins).slice(-7);if(rows.length<2)return [];
  return rows.map(row=>{const sleep=firstNumber(row?.sleepHours,row?.sleep,7)??7,energy=firstNumber(row?.energy,3)??3,stress=firstNumber(row?.stress,3)??3,soreness=firstNumber(row?.soreness,row?.muscleSoreness,2)??2;return clamp(Math.round(45+sleep*4+energy*6-stress*4-soreness*3),20,100);});
}
function nutritionModel(s){
  const t=mealTotals(s),profile=s?.profile||{},target=Math.max(0,Math.round(firstNumber(profile?.calorieTarget,profile?.targetCalories,profile?.dailyCalories,0)||0)),proteinTarget=Math.max(0,Math.round(firstNumber(profile?.proteinTarget,profile?.targetProtein,0)||0)),carbTarget=Math.max(0,Math.round(firstNumber(profile?.carbTarget,profile?.targetCarbs,0)||0)),fatTarget=Math.max(0,Math.round(firstNumber(profile?.fatTarget,profile?.targetFat,0)||0));
  return {...t,target,proteinTarget,carbTarget,fatTarget};
}
function coachModel(s,intel){
  const d=intel.decision||{},summary=d?.summary||{};
  const title=String(summary?.headline||summary?.title||d?.title||'Consistency is your superpower.');
  const body=String(summary?.en||summary?.text||d?.message||d?.reason||'Your recent signals are being combined into one next-action decision.');
  const focus=String(d?.nextAction?.title||d?.focus||d?.mode||'Quality over quantity.');
  return {title,body,focus};
}
function icon(name){const paths={home:'<path d="M3.5 11.2 12 4l8.5 7.2v8.3h-6v-5h-5v5h-6z"/>',recovery:'<path d="M19 5.5A8 8 0 1 0 20 17"/><path d="M19 5.5v5h-5"/>',training:'<path d="M6 8v8M18 8v8M6 12h12M3.5 9.5v5M20.5 9.5v5"/>',nutrition:'<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>',coach:'<circle cx="12" cy="8" r="4"/><path d="M5 20c1.4-4 4-6 7-6s5.6 2 7 6"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',bell:'<path d="M6 17h12l-1.3-2V10a4.7 4.7 0 0 0-9.4 0v5z"/><path d="M10 20h4"/>',back:'<path d="m15 5-7 7 7 7"/>',more:'<path d="M5 12h.01M12 12h.01M19 12h.01"/>',send:'<path d="m4 12 16-8-6 16-2.5-6.5z"/>',sleep:'<path d="M17.5 16.5A7.5 7.5 0 0 1 8 6a7.5 7.5 0 1 0 9.5 10.5Z"/>'};return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.home}</svg>`;}
function shellTop(surface){const home=surface==='home',title=home?'GARANG':surface.toUpperCase();return `<header class="gm-top"><button class="gm-icon" data-gm-top="${home?'menu':'back'}" aria-label="${home?'Menu':'Back'}">${icon(home?'menu':'back')}</button><strong class="gm-top-title ${home?'gm-brand':''}">${title}</strong><button class="gm-icon" data-gm-top="${home?'bell':'more'}" aria-label="More">${icon(home?'bell':'more')}</button></header>`;}
function bottomNav(surface){return `<nav class="gm-nav" aria-label="Primary">${SURFACES.map(key=>`<button type="button" data-gm-nav="${key}" class="${surface===key?'active':''}">${icon(key)}<span>${key[0].toUpperCase()+key.slice(1)}</span></button>`).join('')}</nav>`;}
function scoreRing(score,size='large'){const value=score===null?0:score;return `<div class="gm-ring ${size}" style="--gm-score:${value}" aria-label="Recovery ${score===null?'unknown':value}"><div><strong>${score===null?'—':value}</strong><small>/100</small></div></div>`;}
function homeMarkup(s,intel){
  const r=recoveryModel(s,intel),n=nutritionModel(s),w=workoutModel(s),hour=new Date().getHours(),greeting=hour<12?'Good morning,':hour<18?'Good afternoon,':'Good evening,',name=String(s?.profile?.name||s?.profile?.displayName||'').trim().split(/\s+/)[0]||'';
  const sleep=r.sleep===null?'—':`${Math.floor(r.sleep)}h ${Math.round((r.sleep%1)*60)}m`;
  return `<section class="gm-home"><h1>${greeting}<br>${esc(name||'')}</h1><section class="gm-recovery-card" data-gm-open="recovery"><span>RECOVERY SCORE</span><div class="gm-home-score"><div><strong>${r.score===null?'—':r.score}</strong><small>/100</small><em>${esc(r.status)}</em></div>${scoreRing(r.score,'small')}</div></section><div class="gm-home-list"><button data-gm-open="recovery"><span class="gm-row-icon">${icon('sleep')}</span><div><small>SLEEP</small><strong>${sleep}</strong></div><b>›</b></button><button data-gm-open="training"><span class="gm-row-icon">${icon('training')}</span><div><small>TRAINING</small><strong>${esc(w.title)}</strong></div><em>${w.minutes?`${w.minutes} min`:'—'}</em><b>›</b></button><button data-gm-open="nutrition"><span class="gm-row-icon">${icon('nutrition')}</span><div><small>NUTRITION</small><strong>${Math.round(n.kcal).toLocaleString()}${n.target?` / ${n.target.toLocaleString()} kcal`:' kcal'}</strong></div><b>›</b></button></div></section>`;
}
function recoveryMarkup(s,intel){const r=recoveryModel(s,intel),points=trendPoints(s),sleep=r.sleep===null?'—':`${Math.floor(r.sleep)}h ${Math.round((r.sleep%1)*60)}m`,stress=r.stress===null?'—':r.stress<=2?'Low':r.stress<=3?'Moderate':'High';const chart=points.length?`<svg viewBox="0 0 300 88" preserveAspectRatio="none">${points.map((v,i)=>`${i?'':'M'}${Math.round(i*(300/(points.length-1)))} ${Math.round(78-(v/100)*62)}`).join(' L ')} </svg>`:'';return `<section class="gm-recovery">${scoreRing(r.score)}<p>${esc(r.copy)}</p><div class="gm-metrics"><div><span>Sleep</span><strong>${sleep}</strong></div><div><span>HRV</span><strong>${r.hrv===null?'—':`${Math.round(r.hrv)} ms`}</strong></div><div><span>Resting HR</span><strong>${r.rhr===null?'—':`${Math.round(r.rhr)} bpm`}</strong></div><div><span>Stress</span><strong>${stress}</strong></div></div><div class="gm-trend"><span>7-DAY TREND</span>${chart||'<div class="gm-trend-empty">Recovery trend builds as check-ins accumulate.</div>'}<div class="gm-week"><i>M</i><i>T</i><i>W</i><i>T</i><i>F</i><i>S</i><i>S</i></div></div></section>`;}
function trainingMarkup(s){const w=workoutModel(s),rows=w.rows.slice(0,6);return `<section class="gm-training"><span class="gm-kicker">TODAY’S WORKOUT</span><h1>${esc(w.title)}</h1><div class="gm-workout-meta"><span>${w.minutes?`${w.minutes} min`:'—'}</span><i></i><span>${w.count} exercises</span></div><div class="gm-exercise-list">${rows.length?rows.map((row,i)=>`<div><b>${i+1}</b><span><strong>${esc(row.name||row.exercise||'Exercise')}</strong><small>${Math.max(1,Math.round(num(row.sets,1)||1))} × ${Math.max(1,Math.round(num(row.reps,1)||1))}</small></span><em>${firstNumber(row.suggestedWeight,row.weight)!==null&&firstNumber(row.suggestedWeight,row.weight)>0?`${firstNumber(row.suggestedWeight,row.weight)} kg`:String(row.load||'BW')}</em></div>`).join(''):'<div class="gm-empty">Today’s workout is being prepared.</div>'}</div><button class="gm-primary" data-gm-start ${rows.length?'':'disabled'}>START WORKOUT</button></section>`;}
function bar(label,value,target){const pct=target>0?clamp(Math.round(value/target*100),0,100):0;return `<div class="gm-macro"><div><span>${label}</span><strong>${Math.round(value)}${target?` / ${Math.round(target)} g`:' g'}</strong></div><i><b style="width:${pct}%"></b></i></div>`;}
function nutritionMarkup(s){const n=nutritionModel(s),pct=n.target>0?clamp(Math.round(n.kcal/n.target*100),0,100):0;return `<section class="gm-nutrition"><div class="gm-food-hero" role="img" aria-label="Nutrition"><div class="gm-food-plate"><i></i><i></i><i></i></div><button data-gm-meal-scan aria-label="Add meal">+</button></div><div class="gm-calories"><span>CALORIES</span><strong>${Math.round(n.kcal).toLocaleString()} <small>${n.target?`/ ${n.target.toLocaleString()} kcal`:'kcal'}</small></strong><i><b style="width:${pct}%"></b></i></div>${bar('PROTEIN',n.protein,n.proteinTarget)}${bar('CARBS',n.carbs,n.carbTarget)}${bar('FAT',n.fat,n.fatTarget)}</section>`;}
function coachMarkup(s,intel){const c=coachModel(s,intel);return `<section class="gm-coach"><div class="gm-coach-mark">△</div><article><h1>${esc(c.title)}</h1><p>${esc(c.body)}</p></article><article class="gm-focus"><span>TODAY’S FOCUS</span><p>${esc(c.focus)}</p></article><form class="gm-ask" data-gm-coach-form><input aria-label="Ask GARANG" placeholder="Ask GARANG..." autocomplete="off"><button type="submit">${icon('send')}</button></form></section>`;}
function bodyFor(surface,s,intel){if(surface==='recovery')return recoveryMarkup(s,intel);if(surface==='training')return trainingMarkup(s);if(surface==='nutrition')return nutritionMarkup(s);if(surface==='coach')return coachMarkup(s,intel);return homeMarkup(s,intel);}
function ensureChrome(surface){
  const view=app();if(!view||view.hidden)return;
  doc.body.classList.add('garang-golden-master');
  doc.querySelector('.topbar')?.setAttribute('data-gm-canonical','hidden');
  doc.getElementById('bottomNav')?.setAttribute('data-gm-canonical','hidden');
  let top=doc.getElementById('garangGoldenTop');if(!top){top=doc.createElement('div');top.id='garangGoldenTop';view.prepend(top);}top.innerHTML=shellTop(surface);
  let nav=doc.getElementById('garangGoldenNav');if(!nav){nav=doc.createElement('div');nav.id='garangGoldenNav';view.appendChild(nav);}nav.innerHTML=bottomNav(surface);
}
function render(){scheduled=false;const m=main(),s=state();if(!m||!app()||app().hidden||!s)return false;ensureChrome(active);let host=doc.getElementById('garangGoldenMaster');if(!host){host=doc.createElement('section');host.id='garangGoldenMaster';m.appendChild(host);}m.classList.add('gm-shell-active');m.dataset.goldenSurface=active;const intel=intelligence(s);host.innerHTML=bodyFor(active,s,intel);return true;}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(render);}
function setSurface(next,{navigate=true}={}){if(!SURFACES.includes(next))return false;active=next;if(navigate&&ROUTES[next]){try{window.GarangRouter?.navigate?.(ROUTES[next],{source:'golden-master',force:true});}catch{}}schedule();return true;}
function startWorkout(){
  const payload=workoutPayload(),rows=payload?.plan?.exercises||[];
  if(rows.length&&typeof window.GarangWorkoutIntelligenceUI?.queueImport==='function'){
    window.GarangWorkoutIntelligenceUI.queueImport(rows,'golden_master');
    try{window.GarangRouter?.navigate?.('workout',{source:'golden-master-start',force:true});}catch{}
    setTimeout(()=>{window.GarangWorkoutIntelligenceUI?.processImportQueue?.();requestAnimationFrame(()=>{window.GarangWorkoutExecutionBridge?.activateImportedRoutineStart?.();window.GarangWorkoutExecutionV2?.startWorkoutSession?.();});},80);
    return true;
  }
  try{window.GarangWorkoutExecutionV2?.startWorkoutSession?.();return true;}catch{return false;}
}
function sendCoach(form){const value=String(form.querySelector('input')?.value||'').trim();if(!value)return;try{window.GarangRouter?.navigate?.('coach',{source:'golden-master-coach',force:true});}catch{}setTimeout(()=>{const input=doc.querySelector('#coachInput,#aiQuestion,.g2-composer textarea,.g2-composer input,.coach-bottom-stack textarea,.coach-bottom-stack input');if(input){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));const send=input.closest('form')?.querySelector('button[type="submit"]')||doc.querySelector('[data-coach-send],#coachSend,#askCoach,.g2-composer button[type="submit"]');send?.click();}form.querySelector('input').value='';schedule();},120);}
function openMealScan(){try{window.GarangRouter?.navigate?.('nutrition',{source:'golden-master-meal',force:true});}catch{}setTimeout(()=>doc.getElementById('pickMealScan')?.click(),100);}
doc.addEventListener('click',event=>{
  const nav=event.target.closest?.('[data-gm-nav]');if(nav){event.preventDefault();setSurface(nav.dataset.gmNav);return;}
  const open=event.target.closest?.('[data-gm-open]');if(open){event.preventDefault();setSurface(open.dataset.gmOpen);return;}
  if(event.target.closest?.('[data-gm-start]')){event.preventDefault();startWorkout();return;}
  if(event.target.closest?.('[data-gm-meal-scan]')){event.preventDefault();openMealScan();return;}
  const top=event.target.closest?.('[data-gm-top]');if(top?.dataset.gmTop==='back'){event.preventDefault();setSurface('home');return;}
},true);
doc.addEventListener('submit',event=>{const form=event.target.closest?.('[data-gm-coach-form]');if(!form)return;event.preventDefault();sendCoach(form);},true);
for(const name of ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:route-completed'])window.addEventListener(name,event=>{
  const screen=String(event?.detail?.screen||main()?.dataset?.garangScreen||'');if(screen==='today')active='home';else if(screen==='workout'&&active!=='recovery')active='training';else if(screen==='nutrition')active='nutrition';else if(screen==='coach')active='coach';schedule();
},{passive:true});
window.addEventListener('pageshow',schedule,{passive:true});
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.GarangGoldenMasterV1=Object.freeze({version:VERSION,render,schedule,setSurface,get active(){return active;}});
})();