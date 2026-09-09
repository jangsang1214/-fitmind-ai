(() => {
  'use strict';

  const Core=window.GarangPlanExecution;
  const Bridge=window.GarangAgentStateBridge;
  const doc=window.document;
  if(!Core||!Bridge||!doc)return;

  let selectedDate=null;
  let currentScreen=null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const finite=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
  const pct=value=>value===null||value===undefined?'—':`${Math.round(Number(value)||0)}%`;
  const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const rowDate=row=>String(row?.date||row?.day||row?.performedAt||row?.createdAt||'').slice(0,10);
  const hasActivity=(state,date)=>['planner','workouts','meals','runs','body','checkins','dailyCheckins'].some(key=>(Array.isArray(state?.[key])?state[key]:[]).some(row=>rowDate(row)===date));
  const hasRecord=state=>['workouts','meals','runs','body','checkins','dailyCheckins'].some(key=>Array.isArray(state?.[key])&&state[key].length>0);

  function copy(lang){
    if(lang==='en')return {
      accumulation:'ACCUMULATION',planner:'PLAN EXECUTION',recordRhythm:'Recording rhythm',planRhythm:'Plan execution',
      accumulationFlow:'Goal fit becomes clearer as your actual records accumulate.',planFlow:'This is how much of the planned rhythm was executed this week.',
      today:'Today',signals:'signals recorded',planned:'planned',executed:'executed',workout:'Workout',nutrition:'Nutrition',protein:'Protein',recovery:'Recovery',
      insight:'GARANG INSIGHT',inside:'The saved signals are now part of your goal picture.',needsEnergy:'Energy intake is below the current target.',needsProtein:'Protein intake is below the current target.',needsExecution:'The remaining plan is the next useful step.',needsRecords:'More actual records are needed before GARANG judges goal fit.',
      details:'Open details',close:'Close details',actual:'Actual',target:'Target',planEvidence:'Execution evidence',goalAlignment:'Goal fit',confidence:'Judgement confidence',
      weeks:'4-week plan execution',estimate:'Estimated target · not a medical prescription',targetUnknown:'Calorie target needs age, height and sex in Profile.',
      noPlan:'No plan for this day',actualMatch:'Matched from actual record',explicit:'Completed in Planner',notDone:'Not completed',checkin:'Check-in saved',sleep:'Sleep',
      calories:'Calories',missing:'Not recorded',recorded:'Recorded',openPlanner:'Open Planner',goalBasis:'Only saved records are used. Unrecorded domains stay unknown.',
      noGoalJudgement:'At least two measured domains are needed to judge goal fit.',firstRecord:'Add your first record',closePlan:'Plan entry opens here after the droplet is opened.'
    };
    return {
      accumulation:'누적.',planner:'계획 실행',recordRhythm:'기록 리듬',planRhythm:'계획 실행',
      accumulationFlow:'실제 기록이 쌓이면 처음 세운 목표와의 흐름이 더 선명해집니다.',planFlow:'이번 주 계획 중 실제로 실행된 흐름입니다.',
      today:'오늘',signals:'신호 기록',planned:'계획',executed:'실행',workout:'운동',nutrition:'영양',protein:'단백질',recovery:'회복',
      insight:'GARANG INSIGHT',inside:'저장된 기록이 현재 목표의 흐름에 연결되어 있습니다.',needsEnergy:'현재 목표 기준으로 에너지가 조금 부족합니다.',needsProtein:'현재 목표 기준으로 단백질이 조금 부족합니다.',needsExecution:'남은 계획 중 다음 한 가지를 이어가면 됩니다.',needsRecords:'목표 적합도를 판단하려면 실제 기록이 더 필요합니다.',
      details:'상세 근거 열기',close:'상세 근거 닫기',actual:'실제',target:'목표',planEvidence:'수행 근거',goalAlignment:'목표 적합도',confidence:'판단 신뢰도',
      weeks:'4주 계획 실행',estimate:'추정 목표 · 의료 처방이 아닙니다',targetUnknown:'프로필에 나이·키·성별을 입력하면 목표 칼로리를 추정할 수 있습니다.',
      noPlan:'이 날의 계획이 없습니다',actualMatch:'실제 기록으로 수행 확인',explicit:'Planner에서 완료',notDone:'미수행',checkin:'체크인 완료',sleep:'수면',
      calories:'칼로리',missing:'미기록',recorded:'기록됨',openPlanner:'Planner 열기',goalBasis:'저장된 기록만 사용합니다. 기록이 없는 영역은 판단하지 않습니다.',
      noGoalJudgement:'판단 가능한 영역이 두 개 이상 쌓이면 목표 적합도를 계산합니다.',firstRecord:'첫 기록 남기기',closePlan:'물방울을 열면 이곳에서 계획을 추가할 수 있습니다.'
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
    const [y,m,d]=date.split('-').map(Number),x=new Date(y,m-1,d),offset=(x.getDay()+6)%7;
    x.setDate(x.getDate()-offset);
    return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  }
  function calendarWeekRows(state,endDate){
    const monday=mondayOf(endDate);
    return Array.from({length:7},(_,index)=>Core.daily(state,Core.dateAdd(monday,index)));
  }
  function weekSummary(state,endDate){
    const rows=calendarWeekRows(state,endDate),planned=rows.reduce((sum,day)=>sum+day.plan.planned,0),executed=rows.reduce((sum,day)=>sum+day.plan.executed,0),recorded=rows.filter(day=>day.coverage.recorded>0).length;
    return {rows,planned,executed,recorded,executionRate:planned?Math.round(executed/planned*100):null};
  }
  function sleepValue(day,lang){
    const row=day.evidence.checkin.row||{},sleep=finite(row.sleep??row.sleepHours??row.sleep_hours);
    if(sleep===null)return day.evidence.checkin.count?(lang==='en'?'Recorded':'기록됨'):'—';
    return `${sleep.toFixed(sleep%1?1:0)}h`;
  }
  function metricText(value,observed,unit,lang){
    const n=finite(value);
    if(!observed)return lang==='en'?'Not recorded':'미기록';
    return `${Math.round(n??0).toLocaleString()} ${unit}`;
  }
  function summaryRows(day,c,lang){
    const workoutRecorded=day.evidence.workout.sessions>0||day.evidence.running.sessions>0;
    const workoutValue=day.evidence.workout.sessions?`${day.evidence.workout.names[0]||c.workout}${day.evidence.workout.duration?` · ${Math.round(day.evidence.workout.duration)}${lang==='en'?'m':'분'}`:''}`:day.evidence.running.sessions?`${lang==='en'?'Run':'러닝'} · ${day.evidence.running.distance.toFixed(2)} km`:'—';
    const mealRecorded=day.nutrition.meals>0,calorieRecorded=Number(day.nutrition.kcalObserved)>0,proteinRecorded=Number(day.nutrition.proteinObserved)>0,checkinRecorded=day.evidence.checkin.count>0;
    return [
      {label:c.workout,value:workoutRecorded?workoutValue:'—',recorded:workoutRecorded},
      {label:c.nutrition,value:mealRecorded?(calorieRecorded?metricText(day.nutrition.kcal,true,'kcal',lang):c.recorded):'—',recorded:mealRecorded},
      {label:c.protein,value:proteinRecorded?metricText(day.nutrition.protein?.actual,true,'g',lang):(mealRecorded?c.missing:'—'),recorded:proteinRecorded},
      {label:c.recovery,value:checkinRecorded?`${c.sleep} ${sleepValue(day,lang)}`:'—',recorded:checkinRecorded}
    ];
  }
  function insight(day,c,mode){
    if(mode==='planner'&&day.plan.rate!==null&&day.plan.rate<60)return c.needsExecution;
    if(mode==='accumulation'){
      const goal=window.GarangGoalAlignment?.summarize?.(stateValue(),{days:30,endDate:localToday()});
      if(!goal||goal.overall===null)return c.needsRecords;
    }
    if(day.nutrition.calories.status==='insufficient'||day.nutrition.calories.status==='too_low')return c.needsEnergy;
    if(day.nutrition.protein.status==='insufficient')return c.needsProtein;
    return c.inside;
  }
  function dropletIcon(symbol='+'){
    return `<svg viewBox="0 0 32 40" aria-hidden="true" focusable="false"><path d="M16 2.5C12.8 8.1 5 16.5 5 25.1 5 32.5 9.9 37.2 16 37.2s11-4.7 11-12.1C27 16.5 19.2 8.1 16 2.5Z"></path><text x="16" y="28" text-anchor="middle">${esc(symbol)}</text></svg>`;
  }
  function weekStrip(summary,lang,kind){
    const recording=kind==='recording',c=copy(lang),label=recording?c.recordRhythm:c.planRhythm;
    return `<div class="gx-timeline" role="tablist" aria-label="${esc(label)}">${summary.rows.map(day=>{
      const recorded=day.coverage.recorded>0,rate=day.plan.rate,level=recording?(recorded?'good':'none'):(rate===null?'none':(rate>=80?'good':(rate>0?'partial':'none'))),status=recording?(recorded?c.recorded:c.missing):pct(rate);
      return `<button type="button" role="tab" aria-selected="${day.date===selectedDate?'true':'false'}" aria-label="${esc(dayLabel(day.date,lang))} ${esc(status)}" class="gx-timeline-day ${level} ${day.date===selectedDate?'active':''}" data-gx-date="${day.date}" data-gx-day-kind="${recording?'recording':'plan'}"><span class="gx-timeline-dot"></span><small>${esc(weekdayLabel(day.date,lang))}</small></button>`;
    }).join('')}</div>`;
  }
  function summaryView(state,date,lang,mode){
    const c=copy(lang),day=Core.daily(state,date),rows=summaryRows(day,c,lang),recorded=rows.filter(row=>row.recorded).length,planner=mode==='planner',headline=planner?(day.plan.planned?`${c.today} ${day.plan.executed} / ${day.plan.planned} ${c.executed}`:`${c.today} · ${c.noPlan}`):`${c.today} ${recorded} / 4 ${c.signals}`;
    return `<div class="gx-day-summary" data-gx-summary data-gx-summary-kind="${planner?'plan':'recording'}">
      <div class="gx-day-head"><div><span>${esc(dayLabel(date,lang))}</span><strong>${esc(headline)}</strong></div></div>
      <div class="gx-summary-rows">${rows.map(row=>`<div class="gx-summary-row"><span>${esc(row.label)}</span><strong>${esc(row.value)}</strong><i class="${row.recorded?'done':'neutral'}" aria-label="${esc(row.recorded?c.recorded:c.missing)}">${row.recorded?'✓':'—'}</i></div>`).join('')}</div>
      <div class="gx-insight"><span>${esc(c.insight)}</span><p>${esc(insight(day,c,mode))}</p></div>
    </div>`;
  }
  function planItems(day,c){
    if(!day.plan.items.length)return `<div class="gx-detail-empty">${esc(c.noPlan)}</div>`;
    return `<div class="gx-detail-plan-list">${day.plan.items.map(item=>`<div class="gx-detail-plan-row"><span>${item.executed?'✓':'○'}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.explicitCompleted?c.explicit:(item.derivedCompleted?c.actualMatch:c.notDone))}</small></div></div>`).join('')}</div>`;
  }
  function accumulationRows(acc,lang){
    const c=copy(lang);
    return `<div class="gx-detail-weeks" aria-label="${esc(c.weeks)}">${acc.series.map((week,index)=>`<div><span>${lang==='en'?`W${index+1}`:`${index+1}주`}</span><i><b style="width:${Math.max(0,Math.min(100,week.executionRate??0))}%"></b></i><strong>${pct(week.executionRate)}</strong></div>`).join('')}</div>`;
  }
  function goalDetails(goal,c,lang){
    if(!goal)return '';
    const domainRows=goal.domains.map(domain=>`<div class="gx-detail-domain"><span>${esc(domain.label)}</span><strong>${domain.score===null?'—':`${domain.score}%`}</strong><small>${esc(domain.score===null?c.missing:domain.evidence)}</small></div>`).join('');
    return `<section class="gx-detail-section gx-goal-section"><div class="gx-detail-subhead">${esc(c.goalAlignment)}</div><div class="gx-detail-goal"><div><strong>${goal.overall===null?'—':`${goal.overall}%`}</strong><small>${esc(goal.goalLabel||'목표 기준')} · 최근 30일</small></div><span>${esc(c.confidence)} ${Math.round((goal.confidence||0)*100)}%</span></div><div class="gx-detail-domains">${domainRows}</div><p class="gx-detail-note">${esc(goal.overall===null?c.noGoalJudgement:c.goalBasis)}</p></section>`;
  }
  function detailSheet(state,date,lang,mode){
    const c=copy(lang),day=Core.daily(state,date),acc=Core.accumulation(state,{endDate:localToday(),weeks:4}),goal=window.GarangGoalAlignment?.summarize?.(state,{days:30,endDate:localToday()}),calorieTarget=finite(day.targets.calorieTarget),proteinTarget=finite(day.targets.proteinTarget),calorieObserved=Number(day.nutrition.kcalObserved)>0,proteinObserved=Number(day.nutrition.proteinObserved)>0,hasAny=hasRecord(state),planSummary=day.plan.planned?`${day.plan.executed} / ${day.plan.planned} ${c.executed}`:c.noPlan;
    const planSlot=mode==='planner'?`<div class="gx-plan-slot" data-gx-plan-slot><p>${esc(c.closePlan)}</p></div>`:`<button type="button" class="gx-sheet-action" data-gx-open-planner>${esc(c.openPlanner)}</button>`;
    return `<div class="gx-sheet-backdrop" data-gx-close hidden></div><section class="gx-detail-sheet" data-gx-sheet hidden role="dialog" aria-modal="true" aria-labelledby="gxDetailTitle">
      <div class="gx-sheet-handle" aria-hidden="true"></div>
      <div class="gx-sheet-head"><div><span>${esc(dayLabel(date,lang))}</span><h3 id="gxDetailTitle">${esc(c.planEvidence)}</h3></div><button type="button" class="gx-drop-button gx-drop-close" data-gx-close aria-label="${esc(c.close)}">${dropletIcon('−')}</button></div>
      ${goalDetails(goal,c,lang)}
      <section class="gx-detail-section gx-record-section"><div class="gx-detail-subhead">${esc(c.actual)} · ${esc(c.signals)}</div><div class="gx-detail-pairs"><div><span>${esc(c.calories)}</span><strong>${esc(metricText(day.nutrition.kcal,calorieObserved,'kcal',lang))}</strong><small>${esc(c.target)} ${calorieTarget===null?'—':`${Math.round(calorieTarget).toLocaleString()} kcal`}</small></div><div><span>${esc(c.protein)}</span><strong>${esc(metricText(day.nutrition.protein?.actual,proteinObserved,'g',lang))}</strong><small>${esc(c.target)} ${proteinTarget===null?'—':`${Math.round(proteinTarget)}g`}</small></div><div><span>${esc(c.recovery)}</span><strong>${esc(day.evidence.checkin.count?sleepValue(day,lang):c.missing)}</strong><small>${esc(day.evidence.checkin.count?c.recorded:c.missing)}</small></div></div></section>
      ${!calorieTarget?`<p class="gx-detail-note">${esc(c.targetUnknown)}</p>`:`<p class="gx-detail-note">${esc(c.estimate)}</p>`}
      <section class="gx-detail-section gx-plan-section"><div class="gx-detail-subhead">${esc(c.planner)} · ${esc(planSummary)}</div>${planItems(day,c)}${planSlot}</section>
      ${!hasAny?`<button type="button" class="gx-first-record" data-gcl-first-record="1">${esc(c.firstRecord)}</button>`:''}
      <section class="gx-detail-section"><div class="gx-detail-subhead">${esc(c.weeks)}</div>${accumulationRows(acc,lang)}</section>
    </section>`;
  }
  function openSheet(section){
    const sheet=section.querySelector('[data-gx-sheet]'),backdrop=section.querySelector('.gx-sheet-backdrop'),button=section.querySelector('[data-gx-details]');
    if(!sheet||!backdrop||!button)return;
    sheet.hidden=false;backdrop.hidden=false;sheet.scrollTop=0;button.setAttribute('aria-expanded','true');doc.body.classList.add('gx-sheet-open');
    window.requestAnimationFrame(()=>sheet.classList.add('open'));
    sheet.querySelector('[data-gx-close]')?.focus({preventScroll:true});
  }
  function closeSheet(section,restoreFocus=true){
    const sheet=section.querySelector('[data-gx-sheet]'),backdrop=section.querySelector('.gx-sheet-backdrop'),button=section.querySelector('[data-gx-details]');
    if(!sheet||!backdrop||!button)return;
    sheet.classList.remove('open');sheet.hidden=true;backdrop.hidden=true;button.setAttribute('aria-expanded','false');doc.body.classList.remove('gx-sheet-open');
    if(restoreFocus)button.focus({preventScroll:true});
  }
  function buildPlanner(state){
    const lang=state?.preferences?.language==='en'?'en':'ko',c=copy(lang),today=localToday();
    if(!selectedDate)selectedDate=defaultSelected(state);
    const week=weekSummary(state,today);
    const section=doc.createElement('section');section.id='garangPlanExecution';section.className='gx-panel gx-minimal';section.dataset.gxSurface='plan-execution';
    section.innerHTML=`<div class="gx-hero"><div><span class="eyebrow">${esc(c.planner)}</span><strong>${pct(week.executionRate)}</strong><p>${esc(c.planFlow)}</p></div><button type="button" class="gx-drop-button" data-gx-details aria-label="${esc(c.details)}" aria-expanded="false">${dropletIcon('+')}</button></div>${weekStrip(week,lang,'plan')}${summaryView(state,selectedDate,lang,'planner')}${detailSheet(state,selectedDate,lang,'planner')}`;
    section.addEventListener('click',event=>{
      const dayButton=event.target.closest('[data-gx-date]');
      if(dayButton){selectedDate=dayButton.dataset.gxDate;restorePlannerComposer(section);const fresh=buildPlanner(state);section.replaceWith(fresh);movePlannerComposer(fresh,doc.getElementById('main'));return;}
      if(event.target.closest('[data-gx-details]')){openSheet(section);return;}
      if(event.target.closest('[data-gx-close]')){closeSheet(section);return;}
    });
    return section;
  }
  function buildAccumulation(state){
    const lang=state?.preferences?.language==='en'?'en':'ko',c=copy(lang),today=localToday(),week=weekSummary(state,today),goal=window.GarangGoalAlignment?.summarize?.(state,{days:30,endDate:today}),hero=goal?.overall===null||goal?.overall===undefined?'—':`${goal.overall}%`,heroCopy=goal?.overall===null||goal?.overall===undefined?c.accumulationFlow:`${goal.goalLabel||'목표 기준'} · 최근 30일`;
    if(!selectedDate)selectedDate=defaultSelected(state);
    const section=doc.createElement('section');section.id='garangAccumulationOverview';section.className='gx-panel gx-minimal gx-accumulation-surface';section.dataset.gxSurface='accumulation';section.dataset.gxStreakKind='recording';
    section.innerHTML=`<div class="gx-hero"><div><span class="eyebrow">${esc(c.accumulation)}</span><strong>${hero}</strong><p>${esc(heroCopy)}</p><small class="gx-hero-context">${esc(goal?.overall===null||goal?.overall===undefined?c.noGoalJudgement:c.inside)}</small></div><button type="button" class="gx-drop-button" data-gx-details aria-label="${esc(c.details)}" aria-expanded="false">${dropletIcon('+')}</button></div>${weekStrip(week,lang,'recording')}${summaryView(state,selectedDate,lang,'accumulation')}${detailSheet(state,selectedDate,lang,'accumulation')}`;
    section.addEventListener('click',event=>{
      const dayButton=event.target.closest('[data-gx-date]');
      if(dayButton){selectedDate=dayButton.dataset.gxDate;const fresh=buildAccumulation(state);section.replaceWith(fresh);return;}
      if(event.target.closest('[data-gx-details]')){openSheet(section);return;}
      if(event.target.closest('[data-gx-close]')){closeSheet(section);return;}
    });
    return section;
  }
  function stateValue(){try{return Bridge.ready()?Bridge.getState():null;}catch{return null;}}
  function restorePlannerComposer(panel){
    const card=panel?._gxPlannerComposer,grid=panel?._gxPlannerGrid;
    if(card&&grid&&grid.isConnected&&!grid.contains(card))grid.insertBefore(card,grid.firstElementChild||null);
    if(card)card.classList.remove('gx-embedded-plan-card');
  }
  function movePlannerComposer(panel,main){
    if(!panel||!main)return;
    const slot=panel.querySelector('[data-gx-plan-slot]'),card=main.querySelector('#addPlan')?.closest('.card'),grid=card?.parentElement;
    if(!slot||!card||!grid)return;
    panel._gxPlannerComposer=card;panel._gxPlannerGrid=grid;card.classList.add('gx-embedded-plan-card');slot.appendChild(card);
    const agent=[...grid.querySelectorAll(':scope > .card')].find(node=>/Agent Write/i.test(node.textContent||''));
    if(agent){agent.hidden=true;agent.dataset.gxInternalAgentWrite='1';}
  }
  function removeSurface(id){const panel=doc.getElementById(id);if(!panel)return;restorePlannerComposer(panel);panel.remove();}
  function inject(screen){
    currentScreen=screen||currentScreen;const s=stateValue(),main=doc.getElementById('main');if(!s||!main)return;
    doc.body.classList.remove('gx-sheet-open');
    removeSurface('garangPlanExecution');removeSurface('garangAccumulationOverview');removeSurface('garangAccumulationSummary');
    if(currentScreen==='planner'){
      const panel=buildPlanner(s),anchor=main.querySelector('.grid.grid-2');
      if(anchor)main.insertBefore(panel,anchor);else main.appendChild(panel);
      movePlannerComposer(panel,main);
    }else if(currentScreen==='progress'){
      const panel=buildAccumulation(s),anchor=main.querySelector('.progress-tabs')||main.querySelector('.page-head');
      if(anchor)anchor.insertAdjacentElement('afterend',panel);else main.prepend(panel);
    }
  }
  function afterRoute(route,callback){
    const listener=event=>{if(event?.detail?.route!==route)return;window.removeEventListener('garang:route-completed',listener);window.requestAnimationFrame(()=>window.requestAnimationFrame(callback));};
    window.addEventListener('garang:route-completed',listener);
    const ok=window.GarangRouter?.navigate?.(route,{source:`truth-surface-${route}`,force:true});
    if(ok!==true)window.removeEventListener('garang:route-completed',listener);
  }
  doc.addEventListener('click',event=>{
    const first=event.target.closest?.('[data-gcl-first-record]');
    if(first){event.preventDefault();event.stopImmediatePropagation();afterRoute('log',()=>window.GarangSimplifiedShell?.openRecordSheet?.(doc.querySelector('#bottomNav [data-garang-primary-nav="1"][data-page="log"]')));return;}
    const openPlanner=event.target.closest?.('[data-gx-open-planner]');
    if(openPlanner){event.preventDefault();event.stopImmediatePropagation();afterRoute('planner',()=>doc.querySelector('#garangPlanExecution [data-gx-details]')?.click());}
  },true);
  window.addEventListener('garang:screen-rendered',event=>inject(event?.detail?.screen));
  window.addEventListener('garang:state-updated',()=>inject(currentScreen));
  window.addEventListener('garang:state-hydrated',()=>inject(currentScreen));
  window.addEventListener('garang:agent-write',()=>inject(currentScreen));
  window.addEventListener('garang:goal-alignment-ready',()=>inject(currentScreen));
  window.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const panel=doc.querySelector('#garangPlanExecution,#garangAccumulationOverview');if(panel?.querySelector('[data-gx-sheet]:not([hidden])'))closeSheet(panel);});
})();
