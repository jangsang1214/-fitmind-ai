/* GARANG Core Loop v1
   Product-facing layer that completes Today -> Record -> Coach -> Accumulation without owning writes.
   All mutations stay with the existing app CRUD or Coach proposal/approval contracts.
*/
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangCoreLoopV1=api;
  if(root&&root.document)api.mount(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const list=value=>Array.isArray(value)?value:[];
const finite=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function localDate(offset=0){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function rowDate(row){return String(row?.date||row?.day||row?.performedAt||row?.createdAt||'').slice(0,10);}
function daysBetween(a,b){const x=new Date(`${a}T12:00:00`),y=new Date(`${b}T12:00:00`);return Math.round((y-x)/86400000);}
function inRange(row,end,days){const date=rowDate(row);if(!date)return false;const diff=daysBetween(date,end);return diff>=0&&diff<days;}
function checkins(state){return list(state?.dailyCheckins).length?list(state.dailyCheckins):list(state?.checkins);}
function completedPlan(row){return row?.completed===true||row?.done===true||String(row?.status||'').toLowerCase()==='completed';}
function activityDates(state){return new Set([...list(state?.workouts),...list(state?.runs)].map(rowDate).filter(Boolean));}
function recordDates(state){return new Set([...list(state?.workouts),...list(state?.runs),...list(state?.meals),...list(state?.body),...checkins(state)].map(rowDate).filter(Boolean));}
function currentStreak(state,end=localDate()){
  const dates=recordDates(state);let streak=0;
  for(let i=0;i<365;i++){const date=(()=>{const d=new Date(`${end}T12:00:00`);d.setDate(d.getDate()-i);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})();if(dates.has(date))streak++;else if(i===0)continue;else break;}
  return streak;
}
function sevenDayRhythm(state,end=localDate()){
  const dates=recordDates(state);return Array.from({length:7},(_,index)=>{const offset=index-6;const d=new Date(`${end}T12:00:00`);d.setDate(d.getDate()+offset);const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;return {date,active:dates.has(date),today:offset===0};});
}
function deriveToday(state,options={}){
  const safe=state&&typeof state==='object'?state:{},date=String(options.date||localDate()).slice(0,10),lang=options.lang==='en'?'en':'ko';
  const plans=list(safe.planner).filter(r=>rowDate(r)===date),done=plans.filter(completedPlan).length;
  const workouts=list(safe.workouts).filter(r=>rowDate(r)===date).length,runs=list(safe.runs).filter(r=>rowDate(r)===date).length,meals=list(safe.meals).filter(r=>rowDate(r)===date).length,body=list(safe.body).filter(r=>rowDate(r)===date).length,check=checkins(safe).some(r=>rowDate(r)===date);
  const evidence=[workouts+runs>0,meals>0,body>0,check].filter(Boolean).length;
  const completion=plans.length?Math.round(done/plans.length*100):null;
  const streak=currentStreak(safe,date),rhythm=sevenDayRhythm(safe,date);
  let headline=lang==='en'?'Keep today simple.':'오늘은 필요한 것만 이어가면 됩니다.',support=lang==='en'?`${evidence} of 4 daily signals recorded.`:`오늘 신호 4개 중 ${evidence}개가 기록됐습니다.`;
  if(plans.length&&done===plans.length&&meals&&check){headline=lang==='en'?'Today is fully connected.':'오늘의 흐름이 완성됐습니다.';support=lang==='en'?'Plan, nutrition and recovery are all part of your accumulation.':'계획·영양·회복이 모두 누적에 연결됐습니다.';}
  else if(plans.length&&done<plans.length){headline=lang==='en'?'Continue the plan first.':'남은 계획부터 이어가세요.';support=lang==='en'?`${plans.length-done} item(s) remain.`:`계획 ${plans.length-done}개가 남았습니다.`;}
  else if(!plans.length){headline=lang==='en'?'Give today one direction.':'오늘의 방향 하나만 정하세요.';support=lang==='en'?'A small plan makes later records more meaningful.':'작은 계획 하나가 이후 기록을 더 의미 있게 만듭니다.';}
  return {date,lang,plans:plans.length,done,completion,workouts,runs,meals,body,check,evidence,streak,rhythm,headline,support};
}
function latest(listValue){return list(listValue).filter(Boolean).slice().sort((a,b)=>String(rowDate(a)).localeCompare(String(rowDate(b)))).at(-1)||null;}
function firstMealItem(meal){return list(meal?.items)[0]||meal||null;}
function deriveRecent(state,options={}){
  const safe=state&&typeof state==='object'?state:{},lang=options.lang==='en'?'en':'ko',workout=latest(safe.workouts),meal=latest(safe.meals),body=latest(safe.body),run=latest(safe.runs),food=firstMealItem(meal);
  return [
    workout&&{route:'workout',kind:'reuse-workout',label:lang==='en'?'Repeat workout':'최근 운동 다시 쓰기',title:String(workout.name||'Workout'),meta:`${finite(workout.weight)??'—'}kg · ${finite(workout.sets)??'—'}×${finite(workout.reps)??'—'}`,payload:{name:workout.name||'',sets:workout.sets,reps:workout.reps,weight:workout.weight,rpe:workout.rpe,duration:workout.duration}},
    meal&&food&&{route:'nutrition',kind:'reuse-meal',label:lang==='en'?'Repeat meal':'최근 식단 다시 쓰기',title:String(meal.name||food.name||'Meal'),meta:`${Math.round(finite(meal.kcal??food.kcal)||0)} kcal`,payload:{name:food.name||meal.name||'',grams:food.grams,kcal:food.kcal,protein:food.protein,carbs:food.carbs??food.carbohydrate,fat:food.fat}},
    run&&{route:'running',kind:'start-running',label:lang==='en'?'Start another run':'러닝 다시 시작',title:lang==='en'?'Running':'러닝',meta:`${Number(finite(run.distance)||0).toFixed(2)} km · ${finite(run.duration)??'—'} min`,payload:{}},
    body&&{route:'body',kind:'reuse-body',label:lang==='en'?'Use last body values':'최근 체성분 불러오기',title:`${finite(body.weight)??'—'} kg`,meta:`${lang==='en'?'Body fat':'체지방'} ${finite(body.fatPercent)??'—'}%`,payload:{weight:body.weight,muscle:body.muscle,fatPercent:body.fatPercent}}
  ].filter(Boolean);
}
function deriveCoachActions(state,options={}){
  const today=deriveToday(state,options),lang=today.lang,items=[];
  if(!today.plans)items.push({id:'plan',label:lang==='en'?'Build today plan':'오늘 계획 만들기',prompt:lang==='en'?'Create a practical plan for today from my saved records and explain what you would change before asking for approval.':'내 저장 기록을 기준으로 오늘 실행할 계획을 만들어주고, 승인받기 전에 무엇을 바꿀지 설명해줘'});
  else if(today.done<today.plans)items.push({id:'adjust',label:lang==='en'?'Adjust remaining plan':'남은 계획 조정',prompt:lang==='en'?'Review my remaining plan for today and propose only the changes that are useful based on recovery and recent training.':'오늘 남은 계획을 내 회복 상태와 최근 운동 기록에 맞춰 검토하고 필요한 변경만 제안해줘'});
  if(!today.meals)items.push({id:'nutrition',label:lang==='en'?'Fill nutrition gap':'식단 보완',prompt:lang==='en'?'Review today and suggest a simple nutrition action based only on my saved data.':'오늘 상태를 보고 저장된 데이터만 기준으로 가장 간단한 식단 보완 행동을 제안해줘'});
  if(!today.check)items.push({id:'recovery',label:lang==='en'?'Check recovery':'회복 기준 판단',prompt:lang==='en'?'Tell me what recovery information is missing today and how it should change my training decision.':'오늘 회복 정보에서 부족한 것이 무엇인지 알려주고 그게 운동 판단을 어떻게 바꾸는지 설명해줘'});
  items.push({id:'review',label:lang==='en'?'Review accumulation':'누적 변화 해석',prompt:lang==='en'?'Summarize the most meaningful change in my recent accumulated workout, nutrition, running and body records.':'최근 누적된 운동·식단·러닝·체성분에서 가장 의미 있는 변화 하나를 요약해줘'});
  return items.slice(0,4);
}
function bodyDelta(state,end,days){const rows=list(state?.body).filter(r=>inRange(r,end,days)&&finite(r?.weight)!==null).sort((a,b)=>rowDate(a).localeCompare(rowDate(b)));if(rows.length<2)return null;return Math.round((Number(rows.at(-1).weight)-Number(rows[0].weight))*10)/10;}
function deriveAccumulation(state,options={}){
  const safe=state&&typeof state==='object'?state:{},end=String(options.date||localDate()).slice(0,10),days=Math.max(7,Number(options.days)||30),lang=options.lang==='en'?'en':'ko';
  const workouts=list(safe.workouts).filter(r=>inRange(r,end,days)),runs=list(safe.runs).filter(r=>inRange(r,end,days)),meals=list(safe.meals).filter(r=>inRange(r,end,days)),plans=list(safe.planner).filter(r=>inRange(r,end,days));
  const completed=plans.filter(completedPlan).length,planRate=plans.length?Math.round(completed/plans.length*100):null,activeDays=new Set([...workouts,...runs].map(rowDate).filter(Boolean)).size,recordDays=[...recordDates(safe)].filter(date=>{const diff=daysBetween(date,end);return diff>=0&&diff<days;}).length,delta=bodyDelta(safe,end,days),streak=currentStreak(safe,end),rhythm=sevenDayRhythm(safe,end);
  const totalDistance=Math.round(runs.reduce((sum,r)=>sum+(finite(r?.distance)||0),0)*10)/10;
  const proteinRows=meals.map(m=>finite(m?.protein)).filter(v=>v!==null),avgProtein=proteinRows.length?Math.round(proteinRows.reduce((a,b)=>a+b,0)/proteinRows.length):null;
  let headline=lang==='en'?`${recordDays} recorded days in the last ${days}.`:`최근 ${days}일 중 ${recordDays}일이 기록됐습니다.`,support=lang==='en'?'Consistency matters more than isolated best numbers.':'최고 기록 하나보다 이어진 기록의 밀도를 먼저 봅니다.';
  if(streak>=3){headline=lang==='en'?`${streak}-day accumulation is continuing.`:`${streak}일 연속 누적이 이어지고 있습니다.`;support=lang==='en'?'Keep the next action small enough to continue.':'다음 행동도 이어갈 수 있을 만큼 작게 유지하세요.';}
  return {days,end,lang,workouts:workouts.length,runs:runs.length,meals:meals.length,activeDays,recordDays,planRate,totalDistance,avgProtein,bodyDelta:delta,streak,rhythm,headline,support};
}
function setInput(doc,id,value){const el=doc.getElementById(id);if(!el||value===null||value===undefined||value==='')return false;el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;}
function prefill(root,kind,payload){const doc=root.document,p=payload||{};if(kind==='reuse-workout'){setInput(doc,'wName',p.name);setInput(doc,'wSets',p.sets);setInput(doc,'wReps',p.reps);setInput(doc,'wWeight',p.weight);setInput(doc,'wRpe',p.rpe);setInput(doc,'wDuration',p.duration);return true;}if(kind==='reuse-meal'){doc.querySelector('.manual-entry')?.setAttribute('open','');setInput(doc,'foodSearch',p.name);setInput(doc,'foodGram',p.grams);setInput(doc,'foodKcal',p.kcal);setInput(doc,'foodProtein',p.protein);setInput(doc,'foodCarb',p.carbs);setInput(doc,'foodFat',p.fat);return true;}if(kind==='reuse-body'){doc.querySelector('.body-entry-drawer')?.setAttribute('open','');setInput(doc,'bDate',localDate());setInput(doc,'bWeight',p.weight);setInput(doc,'bMuscle',p.muscle);setInput(doc,'bFatPct',p.fatPercent);return true;}return kind==='start-running';}
function mount(root){
  const doc=root.document,main=doc?.getElementById?.('main');if(!main||root.__garangCoreLoopV1)return false;root.__garangCoreLoopV1=true;let scheduled=false,pendingPrefill=null;
  const state=()=>{try{const b=root.GarangAgentStateBridge;return b?.ready?.()?b.getState():null;}catch{return null;}};
  const lang=()=>doc.documentElement.lang==='en'?'en':'ko';
  function rhythmMarkup(rows){return `<div class="gcl-rhythm" aria-label="7 day rhythm">${rows.map(row=>`<i class="${row.active?'active':''} ${row.today?'today':''}" title="${row.date}"></i>`).join('')}</div>`;}
  function enhanceToday(snapshot){if(main.dataset.garangScreen!=='today')return;const model=deriveToday(snapshot,{lang:lang()});let el=main.querySelector('#garangCoreToday');const html=`<section id="garangCoreToday" class="gcl-today"><div><span>${model.lang==='en'?'NOW':'NOW / 지금'}</span><strong>${esc(model.headline)}</strong><p>${esc(model.support)}</p></div><aside><b>${model.streak}</b><small>${model.lang==='en'?'day streak':'일 연속'}</small>${rhythmMarkup(model.rhythm)}</aside></section>`;if(el)el.outerHTML=html;else{const flow=main.querySelector('#garangTodayFlow');if(flow)flow.insertAdjacentHTML('afterend',html);else main.querySelector('.page-head')?.insertAdjacentHTML('afterend',html);}}
  function enhanceRecord(snapshot){const sheet=doc.querySelector('.garang-record-sheet');if(!sheet)return;const rows=deriveRecent(snapshot,{lang:lang()});sheet.querySelector('[data-gcl-recent]')?.remove();if(!rows.length)return;const host=doc.createElement('section');host.className='gcl-record-recent';host.dataset.gclRecent='1';host.innerHTML=`<div class="gcl-mini-head"><span>${lang()==='en'?'RECENT':'RECENT / 최근'}</span><small>${lang()==='en'?'Reuse without saving automatically':'자동 저장 없이 값만 불러옵니다'}</small></div>${rows.map((row,index)=>`<button type="button" data-gcl-reuse="${index}"><span><small>${esc(row.label)}</small><strong>${esc(row.title)}</strong><em>${esc(row.meta)}</em></span><b>↗</b></button>`).join('')}`;host._gclRows=rows;sheet.querySelector('.garang-record-routes')?.insertAdjacentElement('afterend',host);}
  function enhanceCoach(snapshot){if(main.dataset.garangScreen!=='coach')return;const rootEl=main.querySelector('.garang-coach-v2');if(!rootEl)return;const actions=deriveCoachActions(snapshot,{lang:lang()});let host=rootEl.querySelector('[data-gcl-coach-actions]');if(!host){host=doc.createElement('section');host.className='gcl-coach-actions';host.dataset.gclCoachActions='1';const decision=rootEl.querySelector('.garang-decision-card');if(decision)decision.insertAdjacentElement('afterend',host);else rootEl.querySelector('.g2-composer-wrap')?.insertAdjacentElement('beforebegin',host);}host.innerHTML=`<div class="gcl-mini-head"><span>${lang()==='en'?'ACT':'ACT / 행동'}</span><small>${lang()==='en'?'GARANG asks before changing data':'데이터 변경은 기존 승인 절차를 따릅니다'}</small></div><div>${actions.map((a,i)=>`<button type="button" data-gcl-coach="${i}">${esc(a.label)}</button>`).join('')}</div>`;host._gclActions=actions;}
  function enhanceAccumulation(snapshot){if(main.dataset.garangScreen!=='progress')return;const model=deriveAccumulation(snapshot,{lang:lang(),days:30});let host=main.querySelector('#garangAccumulationOverview');const delta=model.bodyDelta===null?'—':`${model.bodyDelta>0?'+':''}${model.bodyDelta} kg`,plan=model.planRate===null?'—':`${model.planRate}%`;const html=`<section id="garangAccumulationOverview" class="gcl-accum"><div class="gcl-accum-copy"><span>${model.lang==='en'?'30 DAY ACCUMULATION':'30 DAY / 누적.'}</span><h2>${esc(model.headline)}</h2><p>${esc(model.support)}</p>${rhythmMarkup(model.rhythm)}</div><div class="gcl-accum-metrics"><div><strong>${model.activeDays}</strong><span>${model.lang==='en'?'active days':'운동 일수'}</span></div><div><strong>${plan}</strong><span>${model.lang==='en'?'plan rate':'계획 수행'}</span></div><div><strong>${model.totalDistance}</strong><span>${model.lang==='en'?'run km':'러닝 km'}</span></div><div><strong>${delta}</strong><span>${model.lang==='en'?'body change':'체중 변화'}</span></div></div></section>`;if(host)host.outerHTML=html;else main.querySelector('.progress-tabs')?.insertAdjacentHTML('afterend',html);}
  function render(){scheduled=false;const snapshot=state();if(!snapshot)return;enhanceToday(snapshot);enhanceCoach(snapshot);enhanceAccumulation(snapshot);enhanceRecord(snapshot);if(pendingPrefill&&main.dataset.garangScreen===pendingPrefill.route){const p=pendingPrefill;pendingPrefill=null;root.requestAnimationFrame(()=>prefill(root,p.kind,p.payload));}}
  function schedule(){if(scheduled)return;scheduled=true;root.requestAnimationFrame(()=>root.requestAnimationFrame(render));}
  doc.addEventListener('click',event=>{
    const reuse=event.target.closest?.('[data-gcl-reuse]');if(reuse){const host=reuse.closest('[data-gcl-recent]'),row=host?._gclRows?.[Number(reuse.dataset.gclReuse)];if(!row)return;event.preventDefault();pendingPrefill=row;root.GarangRouter?.navigate?.(row.route,{source:'core-loop-reuse',force:true});schedule();return;}
    const coach=event.target.closest?.('[data-gcl-coach]');if(coach){const host=coach.closest('[data-gcl-coach-actions]'),action=host?._gclActions?.[Number(coach.dataset.gclCoach)];if(!action)return;event.preventDefault();const input=main.querySelector('.g2-composer textarea'),send=main.querySelector('.g2-send');if(input&&send){input.value=action.prompt;input.dispatchEvent(new Event('input',{bubbles:true}));send.click();}return;}
  },true);
  for(const name of ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:route-completed','garang:agent-proposal-resolved'])root.addEventListener(name,schedule);
  doc.documentElement.addEventListener('garang:language-changed',schedule);root.addEventListener('pageshow',schedule);
  const recordButton=doc.querySelector('#bottomNav [data-page="log"]');recordButton?.addEventListener('click',()=>setTimeout(schedule,0));
  schedule();return true;
}
return Object.freeze({version:'garang-core-loop-v1.0.0',localDate,deriveToday,deriveRecent,deriveCoachActions,deriveAccumulation,prefill,mount});
});
