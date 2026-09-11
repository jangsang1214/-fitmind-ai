/* GARANG Today Action Flow v1.3
   Brand-first quiet Today: accumulation signal, three compact coaching tracks, one decision, one next action.
   C direction stays no-body hero + conditional body evidence.
   Read-only progressive-disclosure layer; existing writes remain owned by app.js / canonical bridges.
*/
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangTodayActionFlow=api;
  if(root&&root.document)api.mount(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const TRACK_DOMAINS=Object.freeze(['training','recovery','nutrition']);
const list=value=>Array.isArray(value)?value:[];
const finite=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[ch]));
function todayLocal(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function sameDate(row,date){return String(row?.date||row?.day||row?.performedAt||row?.createdAt||'').slice(0,10)===date;}
function latestCheckin(state,date){return [...list(state?.dailyCheckins),...list(state?.checkins)].filter(row=>sameDate(row,date)).at(-1)||null;}
function mealTotals(state,date){return list(state?.meals).filter(row=>sameDate(row,date)).reduce((sum,row)=>({count:sum.count+1,kcal:sum.kcal+(finite(row?.kcal)||0),protein:sum.protein+(finite(row?.protein)||0)}),{count:0,kcal:0,protein:0});}
function fallbackDaily(state,date){
  const plans=list(state?.planner).filter(row=>sameDate(row,date));
  const items=plans.map(row=>({id:String(row?.id||''),title:String(row?.title||row?.name||'Plan'),domain:String(row?.domain||''),type:String(row?.type||''),executed:row?.completed===true||row?.done===true||String(row?.status||'').toLowerCase()==='completed'}));
  const executed=items.filter(row=>row.executed).length,meals=mealTotals(state,date),checkin=latestCheckin(state,date),domains={};
  for(const domain of TRACK_DOMAINS){const rows=items.filter((row,index)=>trackDomain(row,index)===domain),done=rows.filter(row=>row.executed).length;domains[domain]={planned:rows.length,executed:done,rate:rows.length?Math.round(done/rows.length*100):null};}
  return {date,plan:{planned:items.length,executed,rate:items.length?Math.round(executed/items.length*100):null,items,domains},evidence:{workout:{sessions:list(state?.workouts).filter(row=>sameDate(row,date)).length},running:{sessions:list(state?.runs).filter(row=>sameDate(row,date)).length},checkin:{row:checkin,count:checkin?1:0}},nutrition:{meals:meals.count,kcal:meals.kcal,protein:{actual:Math.round(meals.protein),target:null,percent:null,status:meals.count?'unknown':'not_logged'}},targets:{goalLabel:''}};
}
function sleepValue(checkin){const value=finite(checkin?.sleepHours??checkin?.sleep);return value===null?null:Math.round(value*10)/10;}
function formatInt(value){return Math.round(finite(value)||0).toLocaleString('en-US');}
function readIntelligence(safe,date,options){
  const now=options.now||new Date(`${date}T12:00:00`);let userState=null,decision=null,performance=null;
  try{userState=options.StateIntelligence?.estimateState?.(safe,{now})||null;}catch{}
  try{decision=userState?options.DecisionIntelligence?.decide?.(userState,{memoryContext:safe?.memory||null})||null:null;}catch{}
  try{performance=options.PerformanceScore?.compute?.(safe,{now,userState,includeHistory:false})||null;}catch{}
  return {userState,decision,performance};
}
function trackDomain(item,index=0){
  const explicit=String(item?.domain||'').toLowerCase();if(TRACK_DOMAINS.includes(explicit))return explicit;
  const type=String(item?.type||item?.category||'').toLowerCase();if(/nutrition|meal|식단|영양/.test(type))return'nutrition';if(/recover|sleep|회복|수면/.test(type))return'recovery';return TRACK_DOMAINS[index]||'training';
}
function trackLabel(domain,lang){const table={ko:{training:'운동',recovery:'회복',nutrition:'식단'},en:{training:'Training',recovery:'Recovery',nutrition:'Nutrition'}};return table[lang]?.[domain]||domain;}
function trackIcon(domain){
  if(domain==='training')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17V7M18 17V7M6 12h12"/><path d="M9 7l3-3 3 3"/></svg>';
  if(domain==='recovery')return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9c2.2-2 4.5-3 7-3s4.8 1 7 3"/><path d="M7 13c1.5-1.2 3.2-1.8 5-1.8s3.5.6 5 1.8"/><path d="M9.5 17c.8-.5 1.7-.8 2.5-.8s1.7.3 2.5.8"/></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7.5h12M7.5 12h9M9.5 16.5h5"/><path d="M12 5V3.5"/></svg>';
}
function deriveTracks(day,safe,date,lang){
  const domains=day?.plan?.domains&&typeof day.plan.domains==='object'?day.plan.domains:{},draft=safe?.meta?.dailyPlanDrafts?.[date],draftItems=list(draft?.items);
  return TRACK_DOMAINS.map(domain=>{
    const row=domains?.[domain]||{},planned=Math.max(0,Number(row?.planned)||0),executed=Math.max(0,Number(row?.executed)||0),rawRate=finite(row?.rate),draftItem=draftItems.find((item,index)=>trackDomain(item,index)===domain);
    let rate=rawRate,state='empty',value='—';
    if(planned>0){if(rate===null)rate=Math.round(executed/planned*100);rate=clamp(Math.round(rate||0),0,100);state=rate>=80?'done':rate>0?'partial':'planned';value=`${rate}%`;}
    else if(draft?.status==='draft'&&draftItem){rate=0;state='draft';value=lang==='en'?'READY':'준비';}
    else{rate=0;state='empty';}
    return {domain,label:trackLabel(domain,lang),planned,executed,rate,state,value};
  });
}
const MODE_COPY={
  ko:{collect_data:'오늘의 방향부터 정리하세요.',caution:'오늘은 몸의 신호를 먼저 확인하세요.',recover:'오늘은 회복을 우선하세요.',reduce:'오늘은 강도를 조금 낮추세요.',maintain:'오늘은 계획한 강도를 유지하세요.',progress:'오늘은 조금 더 나아가도 좋습니다.',goal_focus:'오늘은 목표에 맞는 한 가지에 집중하세요.'},
  en:{collect_data:'Set today’s direction first.',caution:'Check your body signals first today.',recover:'Prioritize recovery today.',reduce:'Ease the intensity a little today.',maintain:'Keep the planned intensity today.',progress:'You can progress a little today.',goal_focus:'Focus on one action aligned with your goal.'}
};
const REASON_COPY={
  ko:{SHORT_SLEEP:'수면이 평소보다 짧습니다.',LOW_ENERGY:'에너지 신호가 낮습니다.',HIGH_SORENESS:'근육 피로가 높게 남아 있습니다.',HIGH_STRESS:'스트레스 신호가 높습니다.',LOAD_SPIKE:'최근 훈련 부하가 빠르게 올랐습니다.',FATIGUE_ELEVATED:'최근 피로 신호가 높습니다.',CHECKIN_STABLE:'회복 체크인이 안정적입니다.',LOAD_DROP:'최근 훈련 부하가 낮아졌습니다.',GOAL_LOW:'최근 행동과 목표의 정렬이 낮습니다.',GOAL_MIXED:'최근 행동과 목표의 정렬이 고르지 않습니다.'},
  en:{SHORT_SLEEP:'Sleep is shorter than usual.',LOW_ENERGY:'Energy is running low.',HIGH_SORENESS:'Muscle fatigue remains elevated.',HIGH_STRESS:'Stress is elevated.',LOAD_SPIKE:'Recent training load rose quickly.',FATIGUE_ELEVATED:'Recent fatigue signals are elevated.',CHECKIN_STABLE:'Recovery check-in looks stable.',LOAD_DROP:'Recent training load has eased.',GOAL_LOW:'Recent actions are weakly aligned with your goal.',GOAL_MIXED:'Recent actions are inconsistently aligned with your goal.'}
};
function humanReasons(decision,lang){const table=REASON_COPY[lang],codes=list(decision?.reasonCodes).filter(code=>!String(code).startsWith('MODE_'));return [...new Set(codes.map(code=>table?.[code]).filter(Boolean))].slice(0,3);}
function deriveModel(state,options={}){
  const safe=state&&typeof state==='object'?state:{},lang=options.lang==='en'?'en':'ko',date=String(options.date||todayLocal()).slice(0,10),engine=options.PlanExecution||null;
  let day;try{day=engine?.daily?engine.daily(safe,date):fallbackDaily(safe,date);}catch{day=fallbackDaily(safe,date);}
  const planned=Math.max(0,Number(day?.plan?.planned)||0),executed=clamp(Math.max(0,Number(day?.plan?.executed)||0),0,planned||Number.MAX_SAFE_INTEGER),remaining=Math.max(0,planned-executed);
  const incomplete=list(day?.plan?.items).find(item=>!item?.executed)||null,workouts=Math.max(0,Number(day?.evidence?.workout?.sessions)||0),runs=Math.max(0,Number(day?.evidence?.running?.sessions)||0),meals=Math.max(0,Number(day?.nutrition?.meals)||0),kcal=Math.max(0,finite(day?.nutrition?.kcal)||0),protein=Math.max(0,finite(day?.nutrition?.protein?.actual)||0),proteinTarget=finite(day?.nutrition?.protein?.target),checkin=day?.evidence?.checkin?.row||latestCheckin(safe,date),sleep=sleepValue(checkin),energy=finite(checkin?.energy),soreness=finite(checkin?.soreness??checkin?.muscleSoreness??checkin?.sorenessLevel);
  let route='progress',action=null,cta=lang==='en'?'View accumulation':'누적 보기',headline=lang==='en'?'Today is accumulating.':'오늘의 흐름이 쌓이고 있습니다.',support=lang==='en'?'Keep the day simple and continue from the next useful action.':'필요한 다음 행동만 이어가면 됩니다.';
  if(planned===0){route='planner';cta=lang==='en'?'Review today plan':'오늘 계획 보기';headline=lang==='en'?'Set today’s direction first.':'오늘의 방향부터 정리하세요.';support=lang==='en'?'A plan connects your records to the next decision.':'계획이 있어야 기록이 다음 판단으로 연결됩니다.';}
  else if(remaining>0){route='planner';cta=lang==='en'?'Continue plan':'계획 이어가기';headline=lang==='en'?`${remaining} plan${remaining===1?'':'s'} remaining.`:`계획 ${remaining}개가 남았습니다.`;support=incomplete?.title?(lang==='en'?`Next · ${String(incomplete.title)}`:`다음 · ${String(incomplete.title)}`):(lang==='en'?'Continue from the next unfinished item.':'완료하지 않은 다음 계획부터 이어가세요.');}
  else if(meals===0){route='nutrition';cta=lang==='en'?'Log nutrition':'식단 기록하기';headline=lang==='en'?'The plan is done. Add nutrition.':'계획은 지켰습니다. 식단을 남겨주세요.';support=lang==='en'?'Nutrition completes today’s performance record.':'영양 기록까지 있어야 오늘의 수행이 완성됩니다.';}
  else if(!checkin){route=null;action='open-checkin';cta=lang==='en'?'Check in':'체크인';headline=lang==='en'?'Finish with a recovery check-in.':'회복 체크인으로 오늘을 마무리하세요.';support=lang==='en'?'Recovery context improves tomorrow’s decision.':'회복 상태가 있어야 내일의 판단이 더 정확해집니다.';}
  else if(planned>0&&remaining===0){headline=lang==='en'?'You kept today’s flow.':'오늘 계획한 흐름을 지켰습니다.';support=lang==='en'?'Your records are now part of the accumulation.':'오늘의 기록이 누적에 반영되고 있습니다.';}
  const progress=planned?Math.round(executed/planned*100):null,goalLabel=String(day?.targets?.goalLabel||'').trim();
  const intel=readIntelligence(safe,date,options),mode=String(intel.decision?.mode||'collect_data'),reasonCodes=list(intel.decision?.reasonCodes).map(String),reasons=humanReasons(intel.decision,lang);
  const recoveryScore=finite(intel.performance?.components?.recovery?.score),overallScore=finite(intel.performance?.score),memoryCount=list(safe?.memory?.entries).filter(row=>row?.status!=='superseded'&&row?.status!=='expired'&&row?.userConfirmed!==false).length;
  const decisionLine=intel.decision&&MODE_COPY[lang]?.[mode]?MODE_COPY[lang][mode]:headline,decisionReason=reasons[0]||String(intel.decision?.summary?.[lang]||support);
  const stateLabel=recoveryScore!==null?(lang==='en'?'RECOVERY':'회복'):overallScore!==null?'GARANG':(lang==='en'?'PLAN':'계획'),stateValue=recoveryScore!==null?Math.round(recoveryScore):overallScore!==null?Math.round(overallScore):(progress===null?'—':progress),stateUnit=(recoveryScore!==null||overallScore!==null||progress!==null)?'/100':'',detailReasons=reasons.length?reasons:[support];
  const signalBase=recoveryScore!==null?recoveryScore:(overallScore!==null?overallScore:progress),signalScore=signalBase===null?0:clamp(Math.round(signalBase),0,100),bodyEvidence=reasonCodes.includes('HIGH_SORENESS')||(soreness!==null&&soreness>=4),tracks=deriveTracks(day,safe,date,lang);
  return {version:'garang-today-action-flow-v1.3',date,lang,planned,executed,remaining,progress,headline,support,cta,route,action,nextTitle:String(incomplete?.title||''),decisionLine,decisionReason,stateLabel,stateValue,stateUnit,mode,recoveryScore,overallScore,memoryCount,detailReasons,signalScore,bodyEvidence,soreness,tracks,rows:[
    {key:'plan',label:lang==='en'?'Plan':'계획',value:planned?`${executed} / ${planned}`:(lang==='en'?'Not set':'미설정'),state:planned?(remaining?'pending':'done'):'neutral'},
    {key:'activity',label:lang==='en'?'Activity':'운동',value:workouts+runs?`${workouts+runs} session${workouts+runs===1?'':'s'}`:(lang==='en'?'No record':'기록 없음'),state:workouts+runs?'done':'neutral'},
    {key:'nutrition',label:lang==='en'?'Nutrition':'영양',value:meals?`${formatInt(kcal)} kcal · ${Math.round(protein)}g`:(lang==='en'?'No record':'기록 없음'),state:meals?'done':'neutral'},
    {key:'recovery',label:lang==='en'?'Recovery':'회복',value:sleep!==null?(lang==='en'?`Sleep ${sleep}h`:`수면 ${sleep}h`):(energy!==null?(lang==='en'?`Energy ${energy}/5`:`에너지 ${energy}/5`):(lang==='en'?'Check-in needed':'체크인 필요')),state:checkin?'done':'neutral'},
    {key:'score',label:'GARANG',value:overallScore!==null?`${Math.round(overallScore)} / 100`:(lang==='en'?'Building signal':'신호 누적 중'),state:overallScore!==null?'done':'neutral'},
    {key:'memory',label:lang==='en'?'Memory':'기억',value:memoryCount?(lang==='en'?`${memoryCount} active signals`:`활성 신호 ${memoryCount}개`):(lang==='en'?'Building context':'맥락 누적 중'),state:memoryCount?'done':'neutral'}
  ],goalLabel,proteinTarget:proteinTarget===null?null:Math.round(proteinTarget)};
}
function markup(model,expanded=false){
  const detailId='garangTodayFlowDetail',progress=model.progress===null?'—':`${model.progress}%`,summary=model.planned?`${model.executed} / ${model.planned}`:'—';
  const actionAttrs=model.route?`data-gtf-route="${esc(model.route)}"${model.route==='planner'?' data-golden-path="planner-entry"':''}`:`data-gtf-action="${esc(model.action||'')}"`,dateLabel=String(model.date||'').slice(5).replace('-','.');
  const bodyHint=model.bodyEvidence?`<div class="gtf-body-hint"><span>${model.lang==='en'?'BODY EVIDENCE':'신체 근거'}</span><p>${model.lang==='en'?'Muscle fatigue is part of this decision. The body map appears only here as supporting evidence.':'근육 피로가 이번 판단의 근거에 포함되어 있습니다. 신체 맵은 판단을 보조하는 근거로만 아래에 표시됩니다.'}</p></div>`:'';
  const tracks=list(model.tracks).map(track=>`<div class="gtf-track" data-domain="${esc(track.domain)}" data-state="${esc(track.state)}" style="--gtf-track:${clamp(Number(track.rate)||0,0,100)}"><span class="gtf-track-icon">${trackIcon(track.domain)}</span><div class="gtf-track-copy"><span>${esc(track.label)}</span><strong>${esc(track.value)}</strong></div><em class="gtf-track-badge" aria-live="polite"></em><i class="gtf-track-line" aria-hidden="true"><b></b></i></div>`).join('');
  const statePrefix=model.lang==='en'?'STATE':'오늘';
  const decisionLabel=model.lang==='en'?'GARANG DECISION':'GARANG의 판단';
  return `<section id="garangTodayFlow" class="gtf gtf-luxury" data-version="${model.version}" data-decision-mode="${esc(model.mode)}" data-body-evidence="${model.bodyEvidence?'1':'0'}" style="--gtf-signal:${model.signalScore}" aria-label="${model.lang==='en'?'Today decision':'오늘의 판단'}">
    <div class="gtf-state" aria-label="${model.lang==='en'?'Current state':'현재 상태'}"><div class="gtf-state-primary"><div class="gtf-state-copy"><span>${statePrefix} · ${esc(dateLabel)}</span><strong>${esc(model.stateLabel)}</strong></div><div class="gtf-state-visual" aria-label="${esc(model.stateLabel)} ${esc(model.stateValue)}${esc(model.stateUnit)}"><span class="gtf-signal" data-garang-accumulation-symbol="1" aria-hidden="true"><i></i><em><b>${esc(model.stateValue)}</b><small>${esc(model.stateUnit)}</small></em></span></div></div><div class="gtf-track-visual" aria-label="${model.lang==='en'?'Today training recovery nutrition':'오늘 운동 회복 식단'}">${tracks}</div></div>
    <div class="gtf-context"><span>${esc(model.support)}</span><strong>${model.lang==='en'?'PLAN':'계획'} ${esc(progress)} · ${esc(summary)}</strong></div>
    <div class="gtf-decision"><span>${decisionLabel}</span><h2>${esc(model.decisionLine)}</h2><p>${esc(model.decisionReason)}</p></div>
    <div class="gtf-action"><button type="button" class="gtf-next" ${actionAttrs}>${esc(model.cta)}<span aria-hidden="true">→</span></button></div>
    <button type="button" class="gtf-disclosure" data-gtf-details aria-expanded="${expanded?'true':'false'}" aria-controls="${detailId}"><span>${model.lang==='en'?'Why this decision?':'왜 이런 판단인가?'}</span><b aria-hidden="true">${expanded?'−':'+'}</b></button>
    <div id="${detailId}" class="gtf-detail" data-gtf-detail ${expanded?'':'hidden'}><div class="gtf-detail-head"><span>${model.lang==='en'?'EVIDENCE':'판단 근거'}</span><p>${model.detailReasons.map(reason=>`<i>${esc(reason)}</i>`).join('')}</p></div>${bodyHint}${model.rows.map(row=>`<div class="gtf-row" data-state="${row.state}" data-key="${row.key}"><span>${esc(row.label)}</span><strong>${esc(row.value)}</strong><i aria-hidden="true"></i></div>`).join('')}<div class="gtf-insight"><span>GARANG</span><p>${esc(model.goalLabel?(model.lang==='en'?`${model.goalLabel} context is reflected in today’s decision.`:`${model.goalLabel} 목표 맥락을 오늘의 판단에 반영하고 있습니다.`):(model.lang==='en'?'Plans, records, recovery and memory are read together before the next action.':'계획 · 기록 · 회복 · 기억을 함께 읽고 다음 행동을 정리합니다.'))}</p></div></div>
  </section>`;
}
function mount(root){
  const doc=root.document,main=doc?.getElementById?.('main');if(!main||root.__garangTodayActionFlowV1)return false;root.__garangTodayActionFlowV1=true;let scheduled=false,expanded=false;
  function state(){try{const bridge=root.GarangAgentStateBridge;return bridge?.ready?.()?bridge.getState():null;}catch{return null;}}
  function isToday(){return main.dataset.garangScreen==='today'||/TODAY|오늘/i.test(main.querySelector('.page-head')?.textContent||'');}
  function clearCMode(){delete main.dataset.gtfC;delete main.dataset.gtfBodyEvidence;delete main.dataset.gtfBodyOpen;}
  function syncCMode(model){main.dataset.gtfC='1';main.dataset.gtfBodyEvidence=model.bodyEvidence?'1':'0';if(expanded&&model.bodyEvidence)main.dataset.gtfBodyOpen='1';else delete main.dataset.gtfBodyOpen;}
  function bindGoldenPath(next){const cta=next?.querySelector?.('[data-golden-path="planner-entry"]');if(!cta)return;main.querySelectorAll('[data-golden-path="planner-entry"]').forEach(node=>{if(node!==cta)node.removeAttribute('data-golden-path');});}
  function carryOrchestratedState(current,next){
    if(!current||!next)return;
    if(current.dataset.gtoPhase)next.dataset.gtoPhase=current.dataset.gtoPhase;
    if(current.dataset.gtoChecked)next.dataset.gtoChecked=current.dataset.gtoChecked;
    const access=current.querySelector('[data-garang-checkin-access="1"]'),context=next.querySelector('.gtf-context');
    if(access&&context)context.insertAdjacentElement('afterend',access);
  }
  function render(){scheduled=false;const current=main.querySelector('#garangTodayFlow');if(!isToday()){if(current)current.remove();expanded=false;clearCMode();return;}const snapshot=state();if(!snapshot)return;const model=deriveModel(snapshot,{lang:doc.documentElement.lang==='en'?'en':'ko',PlanExecution:root.GarangPlanExecution,StateIntelligence:root.GarangStateIntelligence,DecisionIntelligence:root.GarangDecisionIntelligence,PerformanceScore:root.GarangPerformanceScore,date:todayLocal()});const host=doc.createElement('div');host.innerHTML=markup(model,expanded);const next=host.firstElementChild;if(!next)return;if(current){carryOrchestratedState(current,next);current.replaceWith(next);}else{const head=main.querySelector(':scope > .page-head');if(head)head.insertAdjacentElement('afterend',next);else main.prepend(next);}syncCMode(model);bindGoldenPath(next);}
  function schedule(){if(scheduled)return;scheduled=true;root.requestAnimationFrame(()=>root.requestAnimationFrame(render));}
  doc.addEventListener('click',event=>{const drop=event.target.closest?.('[data-gtf-details]');if(drop&&main.contains(drop)){event.preventDefault();expanded=!expanded;const detail=main.querySelector('[data-gtf-detail]');if(detail)detail.hidden=!expanded;drop.setAttribute('aria-expanded',expanded?'true':'false');const symbol=drop.querySelector('b');if(symbol)symbol.textContent=expanded?'−':'+';const hasBody=drop.closest('#garangTodayFlow')?.dataset.bodyEvidence==='1';if(expanded&&hasBody)main.dataset.gtfBodyOpen='1';else delete main.dataset.gtfBodyOpen;return;}const routeButton=event.target.closest?.('[data-gtf-route]');if(routeButton&&main.contains(routeButton)){event.preventDefault();root.GarangRouter?.navigate?.(routeButton.dataset.gtfRoute,{source:'today-action-flow'});return;}const actionButton=event.target.closest?.('[data-gtf-action="open-checkin"]');if(actionButton&&main.contains(actionButton)){event.preventDefault();main.querySelector('[data-action="open-checkin"]')?.click();}},true);
  for(const name of ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:route-completed'])root.addEventListener(name,schedule);doc.documentElement.addEventListener('garang:language-changed',schedule);root.addEventListener('pageshow',schedule);schedule();return true;
}
return Object.freeze({version:'garang-today-action-flow-v1.3.0',deriveModel,markup,mount,todayLocal});
});