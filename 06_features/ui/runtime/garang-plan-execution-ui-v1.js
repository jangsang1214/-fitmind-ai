(() => {
'use strict';

const Core=window.GarangPlanExecution;
const Bridge=window.GarangAgentStateBridge;
if(!Core||!Bridge)return;

let selectedDate=null;
let currentScreen=null;
const esc=value=>String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const pct=value=>value===null||value===undefined?'—':`${Math.round(Number(value)||0)}%`;
const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const hasActivity=(state,date)=>['planner','workouts','meals','runs','checkins','dailyCheckins'].some(key=>(Array.isArray(state?.[key])?state[key]:[]).some(row=>String(row?.date||'').slice(0,10)===date));

function copy(lang){
  if(lang==='en')return {
    eyebrow:'EXECUTION / ACCUMULATION',title:'Plan execution',sub:'See what you planned, what you actually did, and whether it matched your goal.',week:'This week',done:'executed',workout:'Workout',nutrition:'Nutrition',recovery:'Recovery',plan:'Plan',goal:'Goal alignment',calories:'Calories',protein:'Protein',meals:'meals',sessions:'sessions',noPlan:'No plan for this day',actualMatch:'Matched from actual record',explicit:'Completed in Planner',notDone:'Not completed',targetUnknown:'Add age, height and sex in Profile to estimate a calorie target.',estimate:'Estimated target · not a medical prescription',streak:'80%+ streak',weeks:'4-week accumulation',targetDays:'calorie target days',proteinDays:'protein target days',empty:'No accumulated plan data yet.',goalPrefix:'Goal'
  };
  return {
    eyebrow:'EXECUTION / 누적',title:'계획 수행',sub:'계획한 것과 실제로 한 것을 비교하고, 목표에 맞게 충분했는지 누적합니다.',week:'이번 주',done:'수행',workout:'운동',nutrition:'식단',recovery:'회복',plan:'계획',goal:'목표 적합도',calories:'칼로리',protein:'단백질',meals:'끼',sessions:'세션',noPlan:'이 날의 계획이 없습니다',actualMatch:'실제 기록으로 수행 확인',explicit:'Planner에서 완료',notDone:'미수행',targetUnknown:'프로필에 나이·키·성별을 입력하면 목표 칼로리를 추정할 수 있습니다.',estimate:'추정 목표 · 의료 처방이 아닙니다',streak:'80%+ 연속 수행',weeks:'4주 누적',targetDays:'칼로리 충족일',proteinDays:'단백질 충족일',empty:'아직 누적된 계획 데이터가 없습니다.',goalPrefix:'목표'
  };
}
function dayLabel(date,lang){
  const [y,m,d]=date.split('-').map(Number),x=new Date(y,m-1,d);
  return new Intl.DateTimeFormat(lang==='en'?'en-US':'ko-KR',{weekday:'short',month:'numeric',day:'numeric'}).format(x);
}
function statusLabel(status,lang){
  const ko={on_target:'충분',insufficient:'부족',too_low:'너무 낮음',above_target:'목표 초과',not_logged:'미기록',unknown:'판단 대기'};
  const en={on_target:'On target',insufficient:'Low',too_low:'Too low',above_target:'Above target',not_logged:'Not logged',unknown:'Unknown'};
  return (lang==='en'?en:ko)[status]||status;
}
function statusClass(status){return status==='on_target'?'good':(status==='insufficient'||status==='too_low'?'low':(status==='above_target'?'high':'neutral'));}
function defaultSelected(state){
  const today=localToday(),yesterday=Core.dateAdd(today,-1);
  if(yesterday&&hasActivity(state,yesterday))return yesterday;
  return today;
}
function ring(value,label){
  const n=value===null?0:Math.max(0,Math.min(100,Number(value)||0));
  return `<div class="gx-ring" style="--gx-value:${n}"><div><strong>${pct(value)}</strong><span>${esc(label)}</span></div></div>`;
}
function metric(label,value,meta=''){return `<div class="gx-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong>${meta?`<small>${esc(meta)}</small>`:''}</div>`;}
function planItems(day,c){
  if(!day.plan.items.length)return `<div class="gx-empty">${esc(c.noPlan)}</div>`;
  return `<div class="gx-plan-list">${day.plan.items.map(item=>`<div class="gx-plan-item ${item.executed?'done':'pending'}"><span class="gx-check">${item.executed?'✓':'○'}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.time||item.type)} · ${item.explicitCompleted?c.explicit:(item.derivedCompleted?c.actualMatch:c.notDone)}</small></div></div>`).join('')}</div>`;
}
function dayDetail(state,date,lang){
  const c=copy(lang),day=Core.daily(state,date),cal=day.nutrition.calories,protein=day.nutrition.protein;
  const workoutNames=day.evidence.workout.names.length?day.evidence.workout.names.slice(0,3).join(' · '):(lang==='en'?'No workout logged':'운동 기록 없음');
  const calorieValue=day.targets.calorieTarget?`${Math.round(day.nutrition.kcal).toLocaleString()} / ${Math.round(day.targets.calorieTarget).toLocaleString()} kcal`:`${Math.round(day.nutrition.kcal).toLocaleString()} kcal`;
  const proteinValue=protein.target?`${protein.actual} / ${protein.target} g`:`${protein.actual} g`;
  return `<div class="gx-detail-head"><div><span>${esc(dayLabel(date,lang))}</span><h3>${esc(c.goalPrefix)} · ${esc(Core.goalLabel(day.goal,lang))}</h3></div><span class="gx-confidence">${Math.round(day.confidence*100)}% confidence</span></div>
  <div class="gx-score-pair">${ring(day.plan.rate,c.plan)}${ring(day.goalAlignment,c.goal)}</div>
  <div class="gx-actual-grid">
    ${metric(c.workout,day.evidence.workout.sessions?`${day.evidence.workout.sessions} ${c.sessions}`:'—',workoutNames)}
    ${metric(c.calories,calorieValue,statusLabel(cal.status,lang))}
    ${metric(c.protein,proteinValue,statusLabel(protein.status,lang))}
    ${metric(c.recovery,day.evidence.checkin.count?(lang==='en'?'Check-in saved':'체크인 완료'):'—',day.evidence.checkin.count?(lang==='en'?'State recorded':'상태 기록됨'):(lang==='en'?'No check-in':'체크인 없음'))}
  </div>
  <div class="gx-status-row"><span class="gx-status ${statusClass(cal.status)}">${esc(c.calories)} · ${esc(statusLabel(cal.status,lang))}${cal.percent!==null?` ${cal.percent}%`:''}</span><span class="gx-status ${statusClass(protein.status)}">${esc(c.protein)} · ${esc(statusLabel(protein.status,lang))}${protein.percent!==null?` ${protein.percent}%`:''}</span></div>
  ${!day.targets.calorieTarget?`<div class="gx-note">${esc(c.targetUnknown)}</div>`:`<div class="gx-note subtle">${esc(c.estimate)}</div>`}
  ${planItems(day,c)}`;
}
function weekStrip(summary,lang){
  return `<div class="gx-days" role="tablist" aria-label="${lang==='en'?'Execution days':'계획 수행 날짜'}">${summary.rows.map(day=>`<button type="button" role="tab" aria-selected="${day.date===selectedDate?'true':'false'}" class="gx-day ${day.date===selectedDate?'active':''}" data-gx-date="${day.date}"><span>${esc(dayLabel(day.date,lang).split(' ')[0])}</span><strong>${day.plan.rate===null?'—':day.plan.rate}</strong><small>${day.plan.rate===null?'':`%`}</small><i style="--gx-day:${day.plan.rate??0}"></i></button>`).join('')}</div>`;
}
function weeklyCards(summary,c){
  return `<div class="gx-week-grid">${metric(c.week,pct(summary.executionRate),`${summary.executed}/${summary.planned} ${c.done}`)}${metric(c.workout,`${summary.workoutDays}`,c.week)}${metric(c.calories,`${summary.calorieOnTargetDays}/${summary.calorieLoggedDays}`,c.targetDays)}${metric(c.protein,`${summary.proteinOnTargetDays}/${summary.proteinLoggedDays}`,c.proteinDays)}${metric(c.streak,`${summary.currentExecutionStreak}`,c.done)}</div>`;
}
function accumulationBars(acc,lang){
  const c=copy(lang);
  if(!acc.series.some(x=>x.planned))return `<div class="gx-empty">${esc(c.empty)}</div>`;
  return `<div class="gx-accumulation">${acc.series.map((w,index)=>`<div class="gx-week-bar"><span>${lang==='en'?`W${index+1}`:`${index+1}주`}</span><div><i style="width:${Math.max(0,Math.min(100,w.executionRate??0))}%"></i></div><strong>${pct(w.executionRate)}</strong></div>`).join('')}</div>${acc.trend!==null?`<div class="gx-trend ${acc.trend>=0?'up':'down'}">${lang==='en'?'4-week change':'4주 변화'} ${acc.trend>=0?'+':''}${acc.trend}%p</div>`:''}`;
}
function buildPlanner(state){
  const lang=state?.preferences?.language==='en'?'en':'ko',c=copy(lang),today=localToday();
  if(!selectedDate)selectedDate=defaultSelected(state);
  const week=Core.range(state,{endDate:today,days:7}),acc=Core.accumulation(state,{endDate:today,weeks:4});
  const section=document.createElement('section');section.id='garangPlanExecution';section.className='gx-panel';
  section.innerHTML=`<div class="gx-section-head"><div><span class="eyebrow">${esc(c.eyebrow)}</span><h2>${esc(c.title)}</h2><p>${esc(c.sub)}</p></div><div class="gx-week-rate"><strong>${pct(week.executionRate)}</strong><span>${esc(c.week)}</span></div></div>${weekStrip(week,lang)}<div class="gx-detail" data-gx-detail>${dayDetail(state,selectedDate,lang)}</div>${weeklyCards(week,c)}<div class="gx-subhead"><span>${esc(c.weeks)}</span></div>${accumulationBars(acc,lang)}`;
  section.addEventListener('click',event=>{
    const button=event.target.closest('[data-gx-date]');if(!button)return;
    selectedDate=button.dataset.gxDate;
    section.querySelectorAll('[data-gx-date]').forEach(x=>{x.classList.toggle('active',x.dataset.gxDate===selectedDate);x.setAttribute('aria-selected',String(x.dataset.gxDate===selectedDate));});
    const detail=section.querySelector('[data-gx-detail]');if(detail)detail.innerHTML=dayDetail(state,selectedDate,lang);
  });
  return section;
}
function buildProgress(state){
  const lang=state?.preferences?.language==='en'?'en':'ko',c=copy(lang),today=localToday(),week=Core.range(state,{endDate:today,days:7}),acc=Core.accumulation(state,{endDate:today,weeks:4});
  const section=document.createElement('section');section.id='garangAccumulationSummary';section.className='gx-panel gx-progress-panel';
  section.innerHTML=`<div class="gx-section-head compact"><div><span class="eyebrow">${esc(c.eyebrow)}</span><h2>${esc(c.weeks)}</h2></div><div class="gx-week-rate"><strong>${pct(week.executionRate)}</strong><span>${esc(c.week)}</span></div></div>${accumulationBars(acc,lang)}${weeklyCards(week,c)}`;
  return section;
}
function state(){try{return Bridge.ready()?Bridge.getState():null;}catch{return null;}}
function inject(screen){
  currentScreen=screen||currentScreen;const s=state(),main=document.getElementById('main');if(!s||!main)return;
  document.getElementById('garangPlanExecution')?.remove();document.getElementById('garangAccumulationSummary')?.remove();
  if(currentScreen==='planner'){
    const panel=buildPlanner(s),anchor=main.querySelector('.grid.grid-2');if(anchor)main.insertBefore(panel,anchor);else main.appendChild(panel);
  }else if(currentScreen==='progress'){
    const panel=buildProgress(s),anchor=main.querySelector('.progress-tabs');if(anchor)anchor.insertAdjacentElement('afterend',panel);else main.appendChild(panel);
  }
}
window.addEventListener('garang:screen-rendered',event=>inject(event?.detail?.screen));
window.addEventListener('garang:state-updated',()=>inject(currentScreen));
window.addEventListener('garang:state-hydrated',()=>inject(currentScreen));
window.addEventListener('garang:agent-write',()=>inject(currentScreen));
})();
