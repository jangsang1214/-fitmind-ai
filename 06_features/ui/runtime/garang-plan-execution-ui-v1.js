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
    eyebrow:'ACCUMULATION',week:'This week',flow:'You are maintaining the planned rhythm.',today:'Today',complete:'complete',workout:'Workout',nutrition:'Nutrition',protein:'Protein',recovery:'Recovery',insight:'GARANG INSIGHT',inside:'Your execution is inside the current goal flow.',needsEnergy:'Energy intake is a little below the current goal flow.',needsProtein:'Protein is a little below the current goal flow.',needsExecution:'Execution is below your recent plan rhythm.',details:'Open details',close:'Close details',actual:'Actual',target:'Target',planEvidence:'Plan evidence',goalAlignment:'Goal alignment',confidence:'Confidence',weeks:'4-week accumulation',estimate:'Estimated target · not a medical prescription',targetUnknown:'Calorie target needs age, height and sex in Profile.',noPlan:'No plan for this day',actualMatch:'Matched from actual record',explicit:'Completed in Planner',notDone:'Not completed',noWorkout:'No workout logged',noCheckin:'No recovery check-in',checkin:'Check-in saved',sleep:'Sleep',sessions:'session',calories:'Calories'
  };
  return {
    eyebrow:'누적.',week:'이번 주',flow:'계획한 흐름을 유지하고 있습니다.',today:'오늘',complete:'완료',workout:'운동',nutrition:'영양',protein:'단백질',recovery:'회복',insight:'GARANG INSIGHT',inside:'현재 목표 흐름 안에 있습니다.',needsEnergy:'현재 목표 기준으로 에너지를 조금 더 채우는 편이 좋습니다.',needsProtein:'현재 목표 기준으로 단백질을 조금 더 채우는 편이 좋습니다.',needsExecution:'최근 계획 흐름보다 실행이 조금 부족합니다.',details:'상세보기',close:'상세보기 닫기',actual:'실제',target:'목표',planEvidence:'계획 수행 근거',goalAlignment:'목표 적합도',confidence:'판단 신뢰도',weeks:'4주 누적',estimate:'추정 목표 · 의료 처방이 아닙니다',targetUnknown:'프로필에 나이·키·성별을 입력하면 목표 칼로리를 추정할 수 있습니다.',noPlan:'이 날의 계획이 없습니다',actualMatch:'실제 기록으로 수행 확인',explicit:'Planner에서 완료',notDone:'미수행',noWorkout:'운동 기록 없음',noCheckin:'회복 체크인 없음',checkin:'체크인 완료',sleep:'수면',sessions:'세션',calories:'칼로리'
  };
}
function dayLabel(date,lang){
  const [y,m,d]=date.split('-').map(Number),x=new Date(y,m-1,d);
  return new Intl.DateTimeFormat(lang==='en'?'en-US':'ko-KR',{weekday:'short',month:'numeric',day:'numeric'}).format(x);
}
function weekdayLabel(date,lang){
  const [y,m,d]=date.split('-').map(Number),x=new Date(y,m-1,d);
  return new Intl.DateTimeFormat(lang==='en'?'en-US':'ko-KR',{weekday:'narrow'}).format(x);
}
function defaultSelected(state){
  const today=localToday(),yesterday=Core.dateAdd(today,-1);
  if(yesterday&&hasActivity(state,yesterday))return yesterday;
  return today;
}
function mondayOf(date){
  const [y,m,d]=date.split('-').map(Number),x=new Date(y,m-1,d);
  const offset=(x.getDay()+6)%7;
  x.setDate(x.getDate()-offset);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
}
function calendarWeekRows(state,endDate){
  const monday=mondayOf(endDate);
  return Array.from({length:7},(_,index)=>Core.daily(state,Core.dateAdd(monday,index)));
}
function sleepValue(day,lang){
  const row=day.evidence.checkin.row||{},sleep=Number(row.sleep??row.sleepHours??row.sleep_hours);
  if(!Number.isFinite(sleep)||sleep<=0)return day.evidence.checkin.count?(lang==='en'?'Recorded':'기록됨'):'—';
  return `${sleep.toFixed(sleep%1?1:0)}h`;
}
function summaryRows(day,c,lang){
  const workoutValue=day.evidence.workout.sessions?`${day.evidence.workout.names[0]||c.workout}${day.evidence.workout.duration?` · ${Math.round(day.evidence.workout.duration)}${lang==='en'?'m':'분'}`:''}`:'—';
  const kcal=Math.round(day.nutrition.kcal||0),protein=Math.round(day.nutrition.protein.actual||0);
  const rows=[
    {label:c.workout,value:workoutValue,ok:day.evidence.workout.sessions>0||day.evidence.running.sessions>0,neutral:false},
    {label:c.nutrition,value:kcal?`${kcal.toLocaleString()} kcal`:'—',ok:day.nutrition.calories.status==='on_target',neutral:!day.nutrition.meals},
    {label:c.protein,value:protein?`${protein}g`:'—',ok:day.nutrition.protein.status==='on_target',neutral:!day.nutrition.meals||!day.nutrition.protein.target},
    {label:c.recovery,value:day.evidence.checkin.count?`${c.sleep} ${sleepValue(day,lang)}`:'—',ok:day.evidence.checkin.count>0,neutral:!day.evidence.checkin.count}
  ];
  return rows;
}
function completedCount(rows){return rows.filter(row=>row.ok).length;}
function insight(day,c){
  if(day.plan.rate!==null&&day.plan.rate<60)return c.needsExecution;
  if(day.nutrition.calories.status==='insufficient'||day.nutrition.calories.status==='too_low')return c.needsEnergy;
  if(day.nutrition.protein.status==='insufficient')return c.needsProtein;
  return c.inside;
}
function dropletIcon(symbol='+'){
  return `<svg viewBox="0 0 32 40" aria-hidden="true" focusable="false"><path d="M16 2.5C12.8 8.1 5 16.5 5 25.1 5 32.5 9.9 37.2 16 37.2s11-4.7 11-12.1C27 16.5 19.2 8.1 16 2.5Z"></path><text x="16" y="28" text-anchor="middle">${esc(symbol)}</text></svg>`;
}
function weekStrip(summary,lang){
  return `<div class="gx-timeline" role="tablist" aria-label="${lang==='en'?'Execution days':'계획 수행 날짜'}">${summary.rows.map(day=>{
    const rate=day.plan.rate,level=rate===null?'none':(rate>=80?'good':(rate>0?'partial':'none'));
    return `<button type="button" role="tab" aria-selected="${day.date===selectedDate?'true':'false'}" aria-label="${esc(dayLabel(day.date,lang))} ${pct(rate)}" class="gx-timeline-day ${level} ${day.date===selectedDate?'active':''}" data-gx-date="${day.date}"><span class="gx-timeline-dot"></span><small>${esc(weekdayLabel(day.date,lang))}</small></button>`;
  }).join('')}</div>`;
}
function summaryView(state,date,lang){
  const c=copy(lang),day=Core.daily(state,date),rows=summaryRows(day,c,lang),done=completedCount(rows);
  return `<div class="gx-day-summary" data-gx-summary>
    <div class="gx-day-head"><div><span>${esc(dayLabel(date,lang))}</span><strong>${esc(c.today)} ${done} / ${rows.length} ${esc(c.complete)}</strong></div></div>
    <div class="gx-summary-rows">${rows.map(row=>`<div class="gx-summary-row"><span>${esc(row.label)}</span><strong>${esc(row.value)}</strong><i class="${row.ok?'done':(row.neutral?'neutral':'pending')}" aria-hidden="true">${row.ok?'✓':'●'}</i></div>`).join('')}</div>
    <div class="gx-insight"><span>${esc(c.insight)}</span><p>${esc(insight(day,c))}</p></div>
  </div>`;
}
function planItems(day,c){
  if(!day.plan.items.length)return `<div class="gx-detail-empty">${esc(c.noPlan)}</div>`;
  return `<div class="gx-detail-plan-list">${day.plan.items.map(item=>`<div class="gx-detail-plan-row"><span>${item.executed?'✓':'○'}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.explicitCompleted?c.explicit:(item.derivedCompleted?c.actualMatch:c.notDone))}</small></div></div>`).join('')}</div>`;
}
function accumulationRows(acc,lang){
  return `<div class="gx-detail-weeks">${acc.series.map((week,index)=>`<div><span>${lang==='en'?`W${index+1}`:`${index+1}주`}</span><i><b style="width:${Math.max(0,Math.min(100,week.executionRate??0))}%"></b></i><strong>${pct(week.executionRate)}</strong></div>`).join('')}</div>`;
}
function detailSheet(state,date,lang){
  const c=copy(lang),day=Core.daily(state,date),acc=Core.accumulation(state,{endDate:localToday(),weeks:4}),goal=window.GarangGoalAlignment?.summarize?.(state,{days:30,endDate:localToday()}),goalRows=goal?.domains?.map(domain=>`<div><span>${esc(domain.label)}</span><strong>${domain.score===null?'—':`${domain.score}%`}</strong></div>`).join('')||'',hasAnyRecord=['workouts','meals','runs','body','checkins','dailyCheckins'].some(key=>Array.isArray(state?.[key])&&state[key].length>0);
  const calorieActual=Math.round(day.nutrition.kcal||0),calorieTarget=day.targets.calorieTarget?Math.round(day.targets.calorieTarget):null;
  const proteinActual=Math.round(day.nutrition.protein.actual||0),proteinTarget=day.nutrition.protein.target;
  return `<div class="gx-sheet-backdrop" data-gx-close hidden></div><section class="gx-detail-sheet" data-gx-sheet hidden role="dialog" aria-modal="true" aria-labelledby="gxDetailTitle">
    <div class="gx-sheet-handle" aria-hidden="true"></div>
    <div class="gx-sheet-head"><div><span>${esc(dayLabel(date,lang))}</span><h3 id="gxDetailTitle">${esc(c.planEvidence)}</h3></div><button type="button" class="gx-drop-button gx-drop-close" data-gx-close aria-label="${esc(c.close)}">${dropletIcon('−')}</button></div>
    <div class="gx-detail-pairs">
    ${goal?`<div class="gx-detail-goal-fit"><div class="gx-detail-subhead">${esc(c.goalAlignment)}</div><strong>${goal.overall===null?'—':`${goal.overall}%`}</strong><small>${esc(goal.goalLabel||'목표 기준')} · 최근 30일</small><div>${goalRows}</div></div>`:''}
      <div><span>${esc(c.calories)}</span><strong>${calorieActual.toLocaleString()} kcal</strong><small>${esc(c.target)} ${calorieTarget?`${calorieTarget.toLocaleString()} kcal`:'—'}</small></div>
      <div><span>${esc(c.protein)}</span><strong>${proteinActual}g</strong><small>${esc(c.target)} ${proteinTarget?`${proteinTarget}g`:'—'}</small></div>
      <div><span>${esc(c.goalAlignment)}</span><strong>${pct(day.goalAlignment)}</strong><small>${esc(c.confidence)} ${Math.round(day.confidence*100)}%</small></div>
    </div>
    ${!calorieTarget?`<p class="gx-detail-note">${esc(c.targetUnknown)}</p>`:`<p class="gx-detail-note">${esc(c.estimate)}</p>`}
    ${!hasAnyRecord?`<button type="button" class="gx-first-record" data-gcl-first-record="1">${lang==='en'?'Add your first record':'첫 기록 남기기'}</button>`:''}
    ${planItems(day,c)}
    <div class="gx-detail-subhead">${esc(c.weeks)}</div>${accumulationRows(acc,lang)}
  </section>`;
}
function openSheet(section){
  const sheet=section.querySelector('[data-gx-sheet]'),backdrop=section.querySelector('.gx-sheet-backdrop'),button=section.querySelector('[data-gx-details]');
  if(!sheet||!backdrop||!button)return;
  sheet.hidden=false;backdrop.hidden=false;button.setAttribute('aria-expanded','true');document.body.classList.add('gx-sheet-open');
  requestAnimationFrame(()=>sheet.classList.add('open'));
  sheet.querySelector('[data-gx-close]')?.focus();
}
function closeSheet(section,restoreFocus=true){
  const sheet=section.querySelector('[data-gx-sheet]'),backdrop=section.querySelector('.gx-sheet-backdrop'),button=section.querySelector('[data-gx-details]');
  if(!sheet||!backdrop||!button)return;
  sheet.classList.remove('open');sheet.hidden=true;backdrop.hidden=true;button.setAttribute('aria-expanded','false');document.body.classList.remove('gx-sheet-open');
  if(restoreFocus)button.focus();
}
function buildPlanner(state){
  const lang=state?.preferences?.language==='en'?'en':'ko',c=copy(lang),today=localToday();
  if(!selectedDate)selectedDate=defaultSelected(state);
  const week={...Core.range(state,{endDate:today,days:7}),rows:calendarWeekRows(state,today)};
  const section=document.createElement('section');section.id='garangPlanExecution';section.className='gx-panel gx-minimal';
  section.innerHTML=`<div class="gx-hero"><div><span class="eyebrow">${esc(c.eyebrow)}</span><strong>${pct(week.executionRate)}</strong><p>${esc(c.flow)}</p></div><button type="button" class="gx-drop-button" data-gx-details aria-label="${esc(c.details)}" aria-expanded="false">${dropletIcon('+')}</button></div>${weekStrip(week,lang)}${summaryView(state,selectedDate,lang)}${detailSheet(state,selectedDate,lang)}`;
  section.addEventListener('click',event=>{
    const dayButton=event.target.closest('[data-gx-date]');
    if(dayButton){
      selectedDate=dayButton.dataset.gxDate;
      const fresh=buildPlanner(state);section.replaceWith(fresh);return;
    }
    if(event.target.closest('[data-gx-details]')){openSheet(section);return;}
    if(event.target.closest('[data-gx-close]')){closeSheet(section);}
  });
  return section;
}
function buildProgress(state){
  const lang=state?.preferences?.language==='en'?'en':'ko',c=copy(lang),today=localToday(),week=Core.range(state,{endDate:today,days:7}),acc=Core.accumulation(state,{endDate:today,weeks:4});
  const section=document.createElement('section');section.id='garangAccumulationSummary';section.className='gx-panel gx-progress-minimal';
  section.innerHTML=`<div class="gx-progress-line"><div><span class="eyebrow">${esc(c.eyebrow)}</span><strong>${pct(week.executionRate)}</strong></div><p>${esc(c.weeks)}</p></div>${accumulationRows(acc,lang)}`;
  return section;
}
function state(){try{return Bridge.ready()?Bridge.getState():null;}catch{return null;}}
function inject(screen){
  currentScreen=screen||currentScreen;const s=state(),main=document.getElementById('main');if(!s||!main)return;
  document.body.classList.remove('gx-sheet-open');
  document.getElementById('garangPlanExecution')?.remove();document.getElementById('garangAccumulationSummary')?.remove();
  if(currentScreen==='planner'){
    const panel=buildPlanner(s),anchor=main.querySelector('.grid.grid-2');if(anchor)main.insertBefore(panel,anchor);else main.appendChild(panel);
  }else if(currentScreen==='progress'){
    const panel=buildPlanner(s);panel.id='garangAccumulationOverview';panel.dataset.gxPlannerShell='1';main.querySelectorAll(':scope > *').forEach(node=>{node.hidden=true;});main.appendChild(panel);
  }
}
window.addEventListener('garang:screen-rendered',event=>inject(event?.detail?.screen));
window.addEventListener('garang:state-updated',()=>inject(currentScreen));
window.addEventListener('garang:state-hydrated',()=>inject(currentScreen));
window.addEventListener('garang:agent-write',()=>inject(currentScreen));
window.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const section=document.getElementById('garangPlanExecution');if(section?.querySelector('[data-gx-sheet]:not([hidden])'))closeSheet(section);});
})();
