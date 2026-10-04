/* GARANG Today Direct Workout Loop v1
   Connects existing Daily Plan -> Workout Intelligence -> saved workout -> next prescription
   into the existing Today surface. No second workout/planner state owner.
*/
(() => {
'use strict';
if (window.GarangTodayDirectWorkoutLoopV1) return;
const VERSION='garang-today-direct-workout-loop-v1.0.0';
const PLAN_KEY='garang_daily_workout_plan_v1',FINGERPRINT_KEY='garang_today_direct_workout_fingerprint_v1';
const main=()=>document.getElementById('main'),list=v=>Array.isArray(v)?v:[],num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f,pad=v=>String(v).padStart(2,'0');
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const sameDate=(row,date)=>String(row?.date||row?.day||row?.performedAt||row?.createdAt||'').slice(0,10)===date;
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const state=()=>{try{return window.GarangAgentStateBridge?.ready?.()?window.GarangAgentStateBridge.getState():null;}catch{return null;}};
const readJSON=key=>{try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch{return null;}};
const writeJSON=(key,value)=>{try{value==null?sessionStorage.removeItem(key):sessionStorage.setItem(key,JSON.stringify(value));}catch{}};
let scheduled=false,generating='',originalActionHtml=null,originalCopy=null;

function todayWorkouts(snapshot,date=localDate()){return list(snapshot?.workouts).filter(row=>sameDate(row,date));}
function dailyTraining(snapshot,date=localDate()){
  let draft=null;try{draft=window.GarangDailyPlanV1?.readDraft?.(snapshot,date)||null;}catch{}
  if(!draft)try{draft=window.GarangDailyPlanV1?.ensureDailyDraft?.(snapshot,{date})?.group||null;}catch{}
  const items=list(draft?.items),training=items.find(row=>String(row?.domain||'')==='training')||items[0]||null;
  return training&&String(training?.type||'')==='workout'?training:null;
}
function currentPlan(){const payload=readJSON(PLAN_KEY);return payload?.plan&&Array.isArray(payload.plan.exercises)?payload:null;}
function isRest(training){return !!training&&(num(training.duration)<=0||String(training.focus||'')==='rest'||num(training.intensityScale)===0);}
function owns(snapshot=state()){
  if(!snapshot||(snapshot?.onboarding?.complete!==true&&snapshot?.onboarding?.skipped!==true))return false;
  return todayWorkouts(snapshot).length>0||!!dailyTraining(snapshot);
}
function intensityFromScale(scale){const x=num(scale,.9);return x<=.45?'recovery':x<=.78?'light':x>1?'hard':'moderate';}
function trainingFingerprint(training,snapshot){
  const last=list(snapshot?.workouts).at(-1);
  return [localDate(),training?.title||'',training?.duration||'',training?.intensityScale??'',last?.id||'',last?.date||''].join('|');
}
function reasonForTraining(training){
  const raw=String(training?.reason||'').trim();if(raw)return raw.split(' · ').slice(0,2).join(' · ');
  return /recovery|easy_move/.test(String(training?.focus||''))?'최근 회복과 훈련량을 반영해 오늘 강도를 낮췄습니다.':'최근 기록과 회복 상태를 반영해 오늘 수행량을 정했습니다.';
}
function sessionSummary(snapshot){
  const rows=todayWorkouts(snapshot);if(!rows.length)return null;
  const last=rows.at(-1),sessionId=last?.sessionId,session=sessionId?rows.filter(row=>String(row?.sessionId||'')===String(sessionId)):rows;
  const sets=session.reduce((sum,row)=>sum+(list(row?.setDetails).length||Math.max(1,num(row?.sets,1))),0);
  const volume=Math.round(session.reduce((sum,row)=>{const details=list(row?.setDetails);return sum+(details.length?details.reduce((v,set)=>v+Math.max(0,num(set?.weight))*Math.max(0,num(set?.reps??set?.r)),0):Math.max(0,num(row?.weight))*Math.max(0,num(row?.reps))*Math.max(1,num(row?.sets,1)));},0));
  return {rows:session,sets,volume,names:[...new Set(session.map(row=>String(row?.name||row?.exercise||'').trim()).filter(Boolean))]};
}
function nextChange(snapshot,summary=sessionSummary(snapshot)){
  if(!summary)return'다음 운동도 오늘 기록을 기준으로 자동 준비합니다.';
  let shadow=null;try{shadow=window.GarangWorkoutPrescriptionShadowV1?.build?.(snapshot,{asOf:localDate()})||null;}catch{}
  const wanted=new Set(summary.names.map(name=>name.toLowerCase()));
  const rows=list(shadow?.exercises).filter(row=>wanted.has(String(row?.exercise||'').toLowerCase()));
  const chosen=rows.find(row=>row?.prescription?.action==='reduce')||rows.find(row=>row?.prescription?.action==='review_progression')||rows.find(row=>row?.prescription?.action==='hold')||rows[0]||null;
  const p=chosen?.prescription,r=p?.recommended,name=String(chosen?.exercise||summary.names[0]||'다음 운동');
  if(!p||!r)return'다음 운동은 오늘 중량과 반복을 기준으로 다시 계산합니다.';
  const dose=`${r.sets||1}세트 × ${r.reps||1}회${num(r.weight)>0?` · ${r.weight}kg`:''}`;
  if(p.action==='reduce')return`다음 ${name}: ${dose}로 낮춰 회복을 지킵니다.`;
  if(p.action==='review_progression')return`다음 ${name}: ${dose} 증량을 검토합니다.`;
  if(p.action==='hold')return`다음 ${name}: ${dose}를 유지합니다.`;
  return`다음 ${name}: 오늘 용량을 한 번 더 유지해 결과를 확인합니다.`;
}
function resultReason(summary){return summary?.volume>0?`${summary.sets}세트 · 총 볼륨 ${summary.volume.toLocaleString()}kg 기록을 다음 판단에 반영했습니다.`:`${summary?.sets||0}세트 수행 기록을 다음 판단에 반영했습니다.`;}
function configureGenerator(card,training,snapshot){
  if(!card||!training)return null;
  if(card.dataset.expanded!=='1')card.querySelector('[data-daily-toggle]')?.click();
  const set=(selector,value)=>{const el=card.querySelector(selector);if(!el)return;el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};
  set('[data-daily-target]','auto');set('[data-daily-minutes]',Math.max(15,num(training.duration,45)));set('[data-daily-intensity]',intensityFromScale(training.intensityScale));set('[data-daily-equipment]',snapshot?.onboarding?.equipmentProfile||'full_gym');
  return card.querySelector('[data-daily-generate]');
}
function ensurePlan(training,snapshot){
  if(!training||isRest(training))return null;
  const fingerprint=trainingFingerprint(training,snapshot),storedFingerprint=String(readJSON(FINGERPRINT_KEY)?.fingerprint||''),payload=currentPlan();
  if(payload?.plan?.exercises?.length&&storedFingerprint===fingerprint){generating='';return payload;}
  const spec={target:'auto',minutes:Math.max(15,num(training.duration,45)),intensity:intensityFromScale(training.intensityScale),equipmentProfile:snapshot?.onboarding?.equipmentProfile||'full_gym'};
  const api=window.GarangWorkoutIntelligenceUI;
  if(generating!==fingerprint&&typeof api?.generateDailyWorkout==='function'){
    generating=fingerprint;
    Promise.resolve(api.generateDailyWorkout(spec)).then(()=>schedule()).catch(()=>{generating='';schedule();});
  }else if(generating!==fingerprint){
    const card=main()?.querySelector('.garang-daily-workout'),generate=configureGenerator(card,training,snapshot);
    if(generate){generating=fingerprint;generate.click();for(const ms of [120,450,1000])setTimeout(schedule,ms);}
  }
  const next=currentPlan();
  if(next?.plan?.exercises?.length){writeJSON(FINGERPRINT_KEY,{fingerprint,at:Date.now()});generating='';return next;}
  return null;
}
function compactPlanMarkup(payload){
  const plan=payload?.plan;
  if(!plan?.exercises?.length)return '<div class="gtdw-loading"><strong>오늘 루틴을 준비하고 있습니다.</strong><span>최근 중량 · 반복 · 회복 상태를 읽는 중</span></div>';
  const rows=plan.exercises.slice(0,5).map(x=>`<div class="gtdw-row"><strong>${esc(x.name)}</strong><span>${Math.max(1,num(x.sets,1))} × ${Math.max(1,num(x.reps,1))} · ${num(x.suggestedWeight)>0?`${x.suggestedWeight}kg`:'중량 선택'}</span></div>`).join('');
  return `<div class="gtdw-plan"><div class="gtdw-plan-head"><span>TODAY WORKOUT</span><b>${esc(plan.minutes||'')}분 · RPE ${esc(plan.targetRPE||'—')}</b></div>${rows}</div>`;
}
function remember(flow){
  const action=flow?.querySelector('.gtf-action');if(action&&originalActionHtml===null)originalActionHtml=action.innerHTML;
  if(!originalCopy){originalCopy={};for(const [selector,key] of [['.gtf-context span','contextSpan'],['.gtf-context strong','contextStrong'],['.gtf-decision h2','title'],['.gtf-decision p','reason']])originalCopy[key]=flow?.querySelector(selector)?.textContent||'';}
}
function restore(flow){
  if(!flow)return;
  const action=flow.querySelector('.gtf-action');if(action&&originalActionHtml!==null&&action.dataset.gtdwOwner==='1'){action.innerHTML=originalActionHtml;delete action.dataset.gtdwOwner;delete action.dataset.gtdwRenderKey;action.style.removeProperty('display');}
  if(originalCopy)for(const [selector,key] of [['.gtf-context span','contextSpan'],['.gtf-context strong','contextStrong'],['.gtf-decision h2','title'],['.gtf-decision p','reason']]){const node=flow.querySelector(selector);if(node)node.textContent=originalCopy[key]||'';}
  for(const node of flow.querySelectorAll('.gpc-coach-explain,.gpc-today-plan'))if(node.dataset.gtdwHidden==='1'){delete node.dataset.gtdwHidden;node.style.removeProperty('display');}
  const card=main()?.querySelector('.garang-daily-workout');if(card?.dataset?.gtdwHidden==='1'){delete card.dataset.gtdwHidden;card.style.removeProperty('display');}
}
function setCopy(flow,title,reason,context,strong){
  const values=[['.gtf-decision h2',title],['.gtf-decision p',reason],['.gtf-context span',context],['.gtf-context strong',strong]];
  for(const [selector,value] of values){const node=flow.querySelector(selector),next=String(value??'');if(node&&node.textContent!==next)node.textContent=next;}
}
function setActionMarkup(action,key,html){
  if(!action)return false;
  const nextKey=String(key||'');
  if(action.dataset.gtdwRenderKey===nextKey)return false;
  action.dataset.gtdwRenderKey=nextKey;
  action.innerHTML=html;
  return true;
}
function planSignature(payload){
  const plan=payload?.plan;if(!plan?.exercises?.length)return'loading';
  return [plan.minutes||'',plan.targetRPE||'',...plan.exercises.slice(0,5).map(x=>[x.name,x.sets,x.reps,x.suggestedWeight].join(':'))].join('|');
}
function hideSourceCard(flow){
  for(const node of flow?.querySelectorAll?.('.gpc-coach-explain,.gpc-today-plan')||[]){node.dataset.gtdwHidden='1';node.style.setProperty('display','none','important');}
  const card=main()?.querySelector('.garang-daily-workout');if(card){card.dataset.gtdwHidden='1';card.style.setProperty('display','none','important');}
}
function render({snapshot=state(),flow=null}={}){
  const m=main();if(!m||m.dataset.garangScreen!=='today'||!snapshot)return false;
  const target=flow||m.querySelector('#garangTodayFlow');if(!target)return false;remember(target);
  const action=target.querySelector('.gtf-action');if(!action)return false;action.dataset.gtdwOwner='1';
  const summary=sessionSummary(snapshot);
  if(summary){
    const next=nextChange(snapshot,summary);setCopy(target,'오늘 운동을 완료했습니다.',next,resultReason(summary),'GARANG이 다음 운동을 다시 계산했습니다.');
    action.style.setProperty('display','block','important');setActionMarkup(action,`result|${summary.sets}|${summary.volume}|${next}`,`<div class="gtdw-result" data-garang-today-workout-result="1"><span>SESSION INTERPRETATION</span><strong>${esc(next)}</strong><small>Coach나 Progress를 열지 않아도 다음 방문의 운동 추천에 반영됩니다.</small></div>`);hideSourceCard(target);m.dataset.gsnAction='workout-result';return true;
  }
  const training=dailyTraining(snapshot);if(!training){restore(target);return false;}
  if(isRest(training)){
    setCopy(target,'오늘은 고강도 운동을 쉬세요.',reasonForTraining(training),'쉬는 것도 다음 운동을 위한 계획입니다.','RECOVERY DAY');
    action.style.setProperty('display','none','important');setActionMarkup(action,`rest|${trainingFingerprint(training,snapshot)}|${reasonForTraining(training)}`,'');hideSourceCard(target);m.dataset.gsnAction='today-rest';return true;
  }
  const payload=ensurePlan(training,snapshot);
  setCopy(target,`오늘은 ${String(training.title||'이 운동')} 하세요.`,reasonForTraining(training),'종목 · 세트 · 중량 · 반복을 GARANG이 준비했습니다.',payload?.plan?.adjusted?'오늘 컨디션 반영 · 강도 조정됨':'오늘 기록 기준 · 실행 준비');
  action.style.setProperty('display','block','important');setActionMarkup(action,`workout|${trainingFingerprint(training,snapshot)}|${planSignature(payload)}`,`${compactPlanMarkup(payload)}<button type="button" class="gtf-next gtdw-start" data-garang-direct-workout-start="1" ${payload?.plan?.exercises?.length?'':'disabled'}>오늘 운동 시작<span aria-hidden="true">→</span></button>`);hideSourceCard(target);m.dataset.gsnAction='today-workout';return true;
}
function startWorkout(){
  const snapshot=state(),training=dailyTraining(snapshot);if(!snapshot||!training)return false;
  const payload=ensurePlan(training,snapshot),card=main()?.querySelector('.garang-daily-workout'),button=card?.querySelector('[data-daily-import]:not([disabled])');
  if(payload?.plan?.exercises?.length&&button){button.click();return true;}schedule();return false;
}
function decorateWorkoutResult(){
  const m=main();if(!m||m.dataset.garangScreen!=='workout')return;
  const card=m.querySelector('.workout-result-card');if(!card||card.querySelector('[data-garang-next-workout-change]'))return;
  const snapshot=state(),summary=sessionSummary(snapshot);if(!summary)return;
  const next=nextChange(snapshot,summary),node=document.createElement('div');node.dataset.garangNextWorkoutChange='1';node.className='gtdw-workout-next';
  node.innerHTML=`<span>NEXT / GARANG DECIDES</span><strong>${esc(next)}</strong><small>오늘 수행 결과가 다음 운동 추천에 반영됩니다.</small>`;card.appendChild(node);
}
function ensureStyle(){
  if(document.getElementById('garangTodayDirectWorkoutLoopStyle'))return;
  const style=document.createElement('style');style.id='garangTodayDirectWorkoutLoopStyle';style.textContent=`
  .gtdw-plan{display:grid;gap:0;margin:0 0 12px;border:1px solid rgba(244,239,229,.10);border-radius:14px;padding:12px 14px;background:rgba(255,255,255,.015)}
  .gtdw-plan-head{display:flex;justify-content:space-between;gap:10px;padding-bottom:8px;border-bottom:1px solid rgba(244,239,229,.08)}.gtdw-plan-head span{font-size:8px;letter-spacing:.15em;opacity:.55}.gtdw-plan-head b{font-size:9px;font-weight:600}
  .gtdw-row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(244,239,229,.055)}.gtdw-row:last-child{border-bottom:0}.gtdw-row strong{font-size:11px}.gtdw-row span{font-size:9px;opacity:.62;text-align:right}
  .gtdw-loading{display:grid;gap:3px;padding:12px 0}.gtdw-loading strong{font-size:12px}.gtdw-loading span{font-size:9px;opacity:.55}.gtdw-start{width:100%;min-height:48px}
  .gtdw-result{display:grid;gap:6px;padding:13px 14px;border:1px solid rgba(244,239,229,.10);border-radius:14px;background:rgba(255,255,255,.015)}.gtdw-result>span,.gtdw-workout-next>span{font-size:8px;letter-spacing:.14em;opacity:.5}.gtdw-result>strong,.gtdw-workout-next>strong{font-size:12px;line-height:1.55}.gtdw-result>small,.gtdw-workout-next>small{font-size:9px;line-height:1.5;opacity:.55}
  .gtdw-workout-next{display:grid;gap:6px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(244,239,229,.10)}
  #main[data-garang-screen="today"][data-garang-next-owner="today-direct-workout"] #garangTodayFlow .gpc-coach-explain,#main[data-garang-screen="today"][data-garang-next-owner="today-direct-workout"] #garangTodayFlow .gpc-today-plan{display:none!important}
  `;document.head.appendChild(style);
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{scheduled=false;window.GarangTodaySingleNextActionV1?.refresh?.();decorateWorkoutResult();}));}
document.addEventListener('click',event=>{const button=event.target.closest?.('[data-garang-direct-workout-start="1"]');if(!button)return;event.preventDefault();event.stopImmediatePropagation();startWorkout();},true);
for(const name of ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:route-completed','garang:workout-intelligence-rendered','garang:daily-workout-plan-ready'])window.addEventListener(name,schedule);
ensureStyle();window.GarangTodayDirectWorkoutLoopV1=Object.freeze({version:VERSION,owns,render,restore,start:startWorkout,nextChange,sessionSummary,schedule});schedule();
})();