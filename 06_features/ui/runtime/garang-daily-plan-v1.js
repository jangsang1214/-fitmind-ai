/* GARANG Daily Plan v1.0
   Every day starts with a GARANG-generated draft, not an empty planner.
   Drafts stay outside the confirmed planner until the user edits/confirms them.
   This keeps "no plan + no action" from ever becoming a kept-plan success.
*/
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangDailyPlanV1=api;
  if(root&&root.document)api.mount(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='garang-daily-plan-v1.0.0';
const DRAFT_VERSION='garang-daily-draft-v1';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const list=v=>Array.isArray(v)?v.filter(object):[];
const values=v=>Array.isArray(v)?v:[];
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const pad=n=>String(n).padStart(2,'0');
const dateKey=value=>String(value||'').slice(0,10);
function localDate(now=new Date()){const d=now instanceof Date?now:new Date(now);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function isoNow(){return new Date().toISOString();}
function dayOffset(date,offset){const d=new Date(`${date}T12:00:00`);d.setDate(d.getDate()+offset);return localDate(d);}
function weekDay(date){const d=new Date(`${date}T12:00:00`);return (d.getDay()+6)%7;}
function sameDate(row,date){return dateKey(row?.date||row?.day||row?.performedAt||row?.createdAt)===date;}
function goalText(state){return String(state?.profile?.goal||state?.userModel?.goal||state?.onboarding?.goal||'').trim();}
function goalClass(state){const g=goalText(state).toLowerCase();if(/run|marathon|5k|10k|러닝|달리기|마라톤|지구력/.test(g))return 'running';if(/fat|cut|lose|다이어트|감량|체지방/.test(g))return 'fat_loss';if(/muscle|gain|bulk|strength|근육|증량|벌크|근력/.test(g))return 'muscle_gain';return 'maintenance';}
function weeklyFrequency(state){return clamp(Math.round(finite(state?.userModel?.weeklyFrequency)??finite(state?.onboarding?.weeklyFrequency)??4),1,7);}
function availableMinutes(state,date){
  const checkins=[...list(state?.dailyCheckins),...list(state?.checkins)].filter(x=>sameDate(x,date));
  const latest=checkins.at(-1)||{};
  const n=finite(latest.availableMinutes)??finite(state?.userModel?.availableMinutes)??finite(state?.onboarding?.availableMinutes)??60;
  return clamp(Math.round(n),0,180);
}
function todayCheckin(state,date){return [...list(state?.dailyCheckins),...list(state?.checkins)].filter(x=>sameDate(x,date)).at(-1)||null;}
function trainingDays(freq){return ({1:[2],2:[1,4],3:[0,2,4],4:[0,1,3,5],5:[0,1,2,4,5],6:[0,1,2,3,4,5],7:[0,1,2,3,4,5,6]})[freq]||[0,2,4];}
function recentTrainingCount(state,date,days=7){
  const start=dayOffset(date,-(days-1));
  const dates=new Set([...list(state?.workouts),...list(state?.runs)].map(x=>dateKey(x.date)).filter(d=>d>=start&&d<=date));
  return dates.size;
}
function lastTrainingDate(state,date){return [...list(state?.workouts),...list(state?.runs)].map(x=>dateKey(x.date)).filter(d=>d&&d<date).sort().at(-1)||null;}
function recoveryScore(performance){const n=finite(performance?.components?.recovery?.score);return n===null?null:clamp(Math.round(n),0,100);}
function reasonText(goal,trainingDay,mode,recovery,frequency){
  const reasons=[];
  if(goal==='muscle_gain')reasons.push('근육 성장 목표');
  else if(goal==='fat_loss')reasons.push('체지방 감량 목표');
  else if(goal==='running')reasons.push('러닝·지구력 목표');
  else reasons.push('현재 목표');
  reasons.push(`주 ${frequency}회 리듬`);
  if(mode==='recover'||mode==='caution')reasons.push('회복 우선 신호');
  else if(mode==='reduce'||(recovery!==null&&recovery<60))reasons.push('강도 조절 신호');
  else if(trainingDay)reasons.push('오늘 훈련 차례');
  else reasons.push('오늘 회복 차례');
  return reasons.slice(0,3);
}
function trainingFocus(goal,position){
  if(goal==='running')return position%3===1?'quality_run':'easy_run';
  if(goal==='muscle_gain')return position%2===0?'upper':'lower';
  if(goal==='fat_loss')return position%2===0?'full_body':'cardio';
  return position%2===0?'full_body':'cardio';
}
function primaryPlan({goal,focus,minutes,mode,recovery,trainingDay,frequency,date}){
  const constrained=mode==='recover'||mode==='caution'||recovery!==null&&recovery<45;
  let chosen=constrained||!trainingDay?'recovery':focus;
  if(minutes===0)chosen='rest';
  const reduce=mode==='reduce'||recovery!==null&&recovery>=45&&recovery<60;
  const base={upper:55,lower:55,full_body:50,cardio:35,easy_run:40,quality_run:45,recovery:20,rest:0}[chosen]??45;
  const duration=minutes===0?0:Math.max(10,Math.min(minutes,Math.round(base*(reduce?.72:1))));
  const title={upper:'상체 근력',lower:'하체 근력',full_body:'전신 근력',cardio:'가벼운 유산소',easy_run:'이지 러닝',quality_run:'퀄리티 러닝',recovery:'회복 루틴',rest:'의도적 휴식'}[chosen]||'오늘 움직임';
  const type=['easy_run','quality_run','cardio'].includes(chosen)?'running':['recovery','rest'].includes(chosen)?'recovery':'workout';
  const intensity=chosen==='rest'?0:chosen==='recovery'?.4:reduce?.7:mode==='progress'?1.05:.9;
  const reasons=reasonText(goal,trainingDay,mode,recovery,frequency);
  return {id:`gdp-${date}-1`,order:1,type,focus:chosen,title:duration?`${title} ${duration}분`:title,time:type==='recovery'?'21:00':'18:30',duration,intensityScale:intensity,volumeScale:chosen==='recovery'?.55:chosen==='rest'?0:reduce?.72:1,reason:reasons.join(' · '),reasonCodes:reasons};
}
function nutritionPlan(goal,date){
  if(goal==='maintenance')return null;
  const copy={muscle_gain:['단백질 목표 채우기','근육 성장에 필요한 영양 기록'],fat_loss:['식사 기록 + 단백질 우선','감량 중 섭취량과 단백질을 함께 확인'],running:['훈련 전후 수분·탄수화물 체크','러닝 수행과 회복을 위한 연료 확인']}[goal];
  if(!copy)return null;
  return {id:`gdp-${date}-2`,order:2,type:'nutrition',focus:'nutrition',title:copy[0],time:'12:30',duration:5,intensityScale:null,volumeScale:null,reason:copy[1],reasonCodes:[goal.toUpperCase(),'NUTRITION_SUPPORT']};
}
function buildDailyDraft(stateInput,{date=localDate(),decision=null,performance=null}={}){
  const state=object(stateInput)?stateInput:{},goal=goalClass(state),frequency=weeklyFrequency(state),minutes=availableMinutes(state,date),weekday=weekDay(date),days=trainingDays(frequency),position=Math.max(0,days.indexOf(weekday)),scheduled=days.includes(weekday),recentCount=recentTrainingCount(state,date,7),lastDate=lastTrainingDate(state,date),yesterday=dayOffset(date,-1),trainedYesterday=lastDate===yesterday;
  const mode=String(decision?.mode||'maintain'),recovery=recoveryScore(performance),checkin=todayCheckin(state,date),soreness=finite(checkin?.soreness??checkin?.muscleSoreness??checkin?.sorenessLevel);
  const recoveryOverride=mode==='recover'||mode==='caution'||recovery!==null&&recovery<45||soreness!==null&&soreness>=4||recentCount>=frequency&&frequency<7||trainedYesterday&&frequency<=4;
  const trainingDay=scheduled&&!recoveryOverride,focus=trainingFocus(goal,position),primary=primaryPlan({goal,focus,minutes,mode,recovery,trainingDay,frequency,date}),nutrition=nutritionPlan(goal,date),items=[primary,...(nutrition?[nutrition]:[])].slice(0,3);
  return {id:`garang-daily-draft:${date}`,date,status:'draft',version:DRAFT_VERSION,source:'garang',generatedAt:isoNow(),updatedAt:isoNow(),goalClass:goal,goalLabel:goalText(state)||'현재 목표',weeklyFrequency:frequency,availableMinutes:minutes,recoveryScore:recovery,decisionMode:mode,trainingDay,modelSnapshot:{recentTrainingDays:recentCount,trainedYesterday,weekday,scheduled,recoveryOverride},items};
}
function draftsMeta(state){state.meta=object(state.meta)?state.meta:{};state.meta.dailyPlanDrafts=object(state.meta.dailyPlanDrafts)?state.meta.dailyPlanDrafts:{};return state.meta.dailyPlanDrafts;}
function confirmedPlans(state,date){return list(state?.planner).filter(row=>sameDate(row,date)&&String(row.status||'confirmed').toLowerCase()!=='draft');}
function meaningfulActions(state,date){return list(state?.workouts).filter(x=>sameDate(x,date)).length+list(state?.runs).filter(x=>sameDate(x,date)).length+list(state?.meals).filter(x=>sameDate(x,date)).length;}
function outcome(stateInput,date=localDate(),options={}){
  const state=object(stateInput)?stateInput:{},group=object(state?.meta?.dailyPlanDrafts?.[date])?state.meta.dailyPlanDrafts[date]:null;
  let planned=0,executed=0;
  try{const daily=options.PlanExecution?.daily?.(state,date);planned=Math.max(0,Number(daily?.plan?.planned)||0);executed=Math.max(0,Number(daily?.plan?.executed)||0);}catch{}
  if(!planned){const plans=confirmedPlans(state,date);planned=plans.length;executed=plans.filter(x=>x.completed===true||x.done===true||String(x.status).toLowerCase()==='completed').length;}
  const rate=planned?Math.round(executed/planned*100):null,actions=meaningfulActions(state,date);
  let status='no_plan_no_action';if(planned&&executed>=planned)status='executed_plan';else if(planned&&executed>0)status='partial_execution';else if(planned)status='confirmed_plan';else if(actions>0)status='unplanned_action';else if(group&&['draft','dismissed'].includes(group.status))status='draft_only';
  return {date,status,planned,executed,rate,actions,kept:planned>0&&rate>=80,success:planned>0&&rate>=80};
}
function finalizePastDrafts(state,today=localDate(),options={}){
  const store=draftsMeta(state),events=[];
  for(const [date,group] of Object.entries(store)){
    if(!object(group)||date>=today||group.status==='finalized')continue;
    const result=outcome(state,date,options);group.status='finalized';group.result=result.kept?'kept':result.status==='unplanned_action'?'unplanned_action':result.status==='partial_execution'?'partial':'missed';group.finalizedAt=isoNow();group.outcome=result;
    events.push({date,result:group.result,status:result.status});
  }
  return events;
}
function ensureDailyDraft(stateInput,options={}){
  const state=object(stateInput)?stateInput:{},date=options.date||localDate(),past=finalizePastDrafts(state,date,options),store=draftsMeta(state),existing=store[date];
  if(confirmedPlans(state,date).length)return {created:false,reason:'confirmed-plan',group:existing||null,past};
  if(object(existing))return {created:false,reason:existing.status||'existing',group:existing,past};
  const group=buildDailyDraft(state,{date,decision:options.decision,performance:options.performance});store[date]=group;return {created:true,reason:'created',group,past};
}
function readDraft(state,date=localDate()){const group=state?.meta?.dailyPlanDrafts?.[date];return object(group)?group:null;}
function updateDraft(state,date,items){const group=readDraft(state,date);if(!group||group.status!=='draft')return null;group.items=list(items).map((item,index)=>({...item,order:index+1,id:String(item.id||`gdp-${date}-${index+1}`)}));group.updatedAt=isoNow();if(!group.items.length){group.status='dismissed';group.dismissedAt=group.updatedAt;}return group;}
function dismissDraft(state,date=localDate()){const group=readDraft(state,date);if(!group)return null;group.status='dismissed';group.dismissedAt=isoNow();group.updatedAt=group.dismissedAt;return group;}
function regenerateDraft(state,date=localDate(),options={}){const store=draftsMeta(state);delete store[date];return ensureDailyDraft(state,{...options,date});}
function planId(prefix='plan'){return globalThis.crypto?.randomUUID?.()||`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;}
function confirmDraft(state,date=localDate()){
  const group=readDraft(state,date);if(!group||group.status!=='draft'||!list(group.items).length)return {confirmed:false,reason:'no-draft',rows:[]};
  const existing=confirmedPlans(state,date);if(existing.length){group.status='superseded';group.supersededAt=isoNow();return {confirmed:false,reason:'existing-plan',rows:[]};}
  state.planner=Array.isArray(state.planner)?state.planner:[];const stamp=isoNow(),rowsOut=group.items.map(item=>({id:planId(),date,time:String(item.time||''),type:String(item.type||'custom'),title:String(item.title||'').trim()||'GARANG 계획',source:'ai',origin:'garang-daily-plan',status:'confirmed',completed:false,goalClass:group.goalClass,goalLabel:group.goalLabel,duration:finite(item.duration),intensityScale:finite(item.intensityScale),volumeScale:finite(item.volumeScale),decisionMode:group.decisionMode,decisionReasonCodes:values(item.reasonCodes).map(String).slice(0,8),draftGroupId:group.id,generatedAt:group.generatedAt,confirmedAt:stamp,createdAt:stamp,updatedAt:stamp}));
  state.planner.push(...rowsOut);group.status='confirmed';group.confirmedAt=stamp;group.updatedAt=stamp;group.confirmedPlanIds=rowsOut.map(x=>x.id);return {confirmed:true,reason:'confirmed',rows:rowsOut};
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function injectStyle(doc){if(doc.getElementById('garangDailyPlanStyle'))return;const style=doc.createElement('style');style.id='garangDailyPlanStyle';style.textContent=`
.gdp-draft{margin:18px 0 24px;padding:24px;border:1px solid rgba(244,239,229,.13);border-radius:18px;background:linear-gradient(145deg,rgba(244,239,229,.035),rgba(255,255,255,.008));box-shadow:none}.gdp-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding-bottom:18px;border-bottom:1px solid rgba(244,239,229,.1)}.gdp-kicker{display:block;font-size:10px;letter-spacing:.18em;color:rgba(244,239,229,.5);margin-bottom:8px}.gdp-head h2{margin:0;font-family:"Cormorant Garamond","Noto Sans KR",serif;font-size:28px;font-weight:500;line-height:1.05;color:#f2ede3}.gdp-head p{margin:9px 0 0;max-width:520px;font-size:12px;line-height:1.7;color:rgba(244,239,229,.55)}.gdp-meta{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.gdp-meta span{padding:5px 8px;border:1px solid rgba(244,239,229,.1);border-radius:999px;font-size:9px;letter-spacing:.08em;color:rgba(244,239,229,.55);white-space:nowrap}.gdp-items{display:grid;gap:10px;margin-top:18px}.gdp-item{display:grid;grid-template-columns:32px minmax(0,1fr);gap:12px;padding:14px 0;border-bottom:1px solid rgba(244,239,229,.08)}.gdp-item:last-child{border-bottom:0}.gdp-num{font-family:"Cormorant Garamond",serif;font-size:21px;color:rgba(244,239,229,.36);padding-top:21px}.gdp-fields{display:grid;grid-template-columns:86px 92px minmax(0,1fr) 78px 86px 34px;gap:8px;align-items:end}.gdp-field{display:grid;gap:5px}.gdp-field span{font-size:9px;letter-spacing:.12em;color:rgba(244,239,229,.38)}.gdp-field input,.gdp-field select{width:100%;min-height:40px;padding:8px 9px;border:1px solid rgba(244,239,229,.12);border-radius:10px;background:#0b0c0b;color:#eee8dd;font:inherit;font-size:12px}.gdp-field.title input{font-weight:600}.gdp-remove{width:34px;height:40px;border:0;background:transparent;color:rgba(244,239,229,.4);font-size:18px}.gdp-reason{grid-column:1/-1;margin:0;font-size:10px;color:rgba(244,239,229,.4)}.gdp-actions{display:flex;gap:8px;margin-top:18px}.gdp-actions button{min-height:44px;border-radius:12px;padding:0 15px}.gdp-confirm{border:1px solid #eee8dd;background:#eee8dd;color:#111;font-weight:700}.gdp-save,.gdp-dismiss,.gdp-regenerate{border:1px solid rgba(244,239,229,.14);background:transparent;color:rgba(244,239,229,.75)}.gdp-dismissed{margin:18px 0;padding:18px;border-top:1px solid rgba(244,239,229,.1);border-bottom:1px solid rgba(244,239,229,.1)}.gdp-dismissed strong{display:block;color:#eee8dd;font-size:13px}.gdp-dismissed p{margin:6px 0 12px;font-size:11px;line-height:1.6;color:rgba(244,239,229,.5)}
@media(max-width:700px){.gdp-draft{padding:19px 15px;margin:12px 0 20px;border-radius:14px}.gdp-head{display:block}.gdp-meta{justify-content:flex-start;margin-top:12px}.gdp-head h2{font-size:25px}.gdp-fields{grid-template-columns:82px minmax(0,1fr) 34px}.gdp-field.type{grid-column:1/2}.gdp-field.time{grid-column:2/3}.gdp-field.title{grid-column:1/4;grid-row:2}.gdp-field.duration{grid-column:1/2;grid-row:3}.gdp-field.intensity{grid-column:2/3;grid-row:3}.gdp-remove{grid-column:3;grid-row:3}.gdp-actions{display:grid;grid-template-columns:1fr 1fr}.gdp-confirm{grid-column:1/-1}.gdp-actions button{width:100%}}
`;doc.head.appendChild(style);}
function plannerMarkup(group,lang='ko'){
  const items=list(group.items),recovery=group.recoveryScore===null||group.recoveryScore===undefined?'—':group.recoveryScore;
  return `<section class="gdp-draft" data-garang-daily-plan-draft="1" data-date="${escapeHtml(group.date)}"><div class="gdp-head"><div><span class="gdp-kicker">GARANG DAILY DRAFT</span><h2>${lang==='en'?'Today is already drafted.':'오늘 계획은 미리 준비했습니다.'}</h2><p>${lang==='en'?'Your goal, weekly rhythm, recent activity and recovery shape this draft. Edit only what you need, then confirm.':'목표 · 주간 리듬 · 최근 활동 · 회복 상태를 반영한 초안입니다. 처음부터 짤 필요 없이 필요한 부분만 수정하고 확정하세요.'}</p></div><div class="gdp-meta"><span>${escapeHtml(group.goalLabel)}</span><span>WEEK ${group.weeklyFrequency}×</span><span>RECOVERY ${escapeHtml(recovery)}</span></div></div><div class="gdp-items">${items.map((item,index)=>`<div class="gdp-item" data-gdp-item="${escapeHtml(item.id)}"><span class="gdp-num">0${index+1}</span><div class="gdp-fields"><label class="gdp-field type"><span>TYPE</span><select data-gdp-type><option value="workout" ${item.type==='workout'?'selected':''}>운동</option><option value="running" ${item.type==='running'?'selected':''}>러닝</option><option value="nutrition" ${item.type==='nutrition'?'selected':''}>식단</option><option value="recovery" ${item.type==='recovery'?'selected':''}>회복</option></select></label><label class="gdp-field time"><span>TIME</span><input data-gdp-time type="time" value="${escapeHtml(item.time||'')}"></label><label class="gdp-field title"><span>ACTION</span><input data-gdp-title value="${escapeHtml(item.title||'')}"></label><label class="gdp-field duration"><span>MIN</span><input data-gdp-duration type="number" min="0" max="180" inputmode="numeric" value="${escapeHtml(item.duration??'')}"></label><label class="gdp-field intensity"><span>INTENSITY</span><select data-gdp-intensity><option value="" ${item.intensityScale==null?'selected':''}>—</option><option value="0.4" ${Number(item.intensityScale)===.4?'selected':''}>낮게</option><option value="0.7" ${Number(item.intensityScale)===.7?'selected':''}>가볍게</option><option value="0.9" ${Number(item.intensityScale)===.9?'selected':''}>보통</option><option value="1" ${Number(item.intensityScale)===1?'selected':''}>계획 강도</option><option value="1.05" ${Number(item.intensityScale)===1.05?'selected':''}>도전</option></select></label><button type="button" class="gdp-remove" data-gdp-remove aria-label="이 항목 삭제">×</button><p class="gdp-reason">${escapeHtml(item.reason||'')}</p></div></div>`).join('')}</div><div class="gdp-actions"><button type="button" class="gdp-confirm" data-gdp-confirm>이대로 확정</button><button type="button" class="gdp-save" data-gdp-save>수정 저장</button><button type="button" class="gdp-dismiss" data-gdp-dismiss>오늘 초안 숨기기</button></div></section>`;
}
function dismissedMarkup(date){return `<section class="gdp-dismissed" data-garang-daily-plan-dismissed="1" data-date="${escapeHtml(date)}"><strong>오늘 자동 초안을 숨겼습니다.</strong><p>계획 없이 아무 행동도 하지 않은 날은 ‘지킨 날’로 계산하지 않습니다. 필요하면 다시 초안을 만들 수 있습니다.</p><button type="button" class="gdp-regenerate" data-gdp-regenerate>초안 다시 만들기</button></section>`;}
function readInputs(container,group){return list(group.items).map(item=>{const row=container.querySelector(`[data-gdp-item="${CSS.escape(String(item.id))}"]`);if(!row)return item;const duration=finite(row.querySelector('[data-gdp-duration]')?.value),intensity=finite(row.querySelector('[data-gdp-intensity]')?.value);return {...item,type:String(row.querySelector('[data-gdp-type]')?.value||item.type),time:String(row.querySelector('[data-gdp-time]')?.value||''),title:String(row.querySelector('[data-gdp-title]')?.value||'').trim()||item.title,duration:duration===null?item.duration:clamp(Math.round(duration),0,180),intensityScale:intensity===null?item.intensityScale:intensity};});}
function mount(root){
  const doc=root.document;injectStyle(doc);let scheduled=false,retryTimer=null;
  const bridge=()=>root.GarangAgentStateBridge;
  function engines(state,date){let decision=null,performance=null;try{decision=bridge()?.getDecision?.()||null;}catch{}try{const userState=bridge()?.getUserState?.()||null;performance=root.GarangPerformanceScore?.compute?.(state,{now:new Date(`${date}T12:00:00`),userState,includeHistory:false})||null;}catch{}return {decision,performance,PlanExecution:root.GarangPlanExecution};}
  function persist(state,action,userConfirmed=false,detail={}){const b=bridge(),key=b?.getStorageKey?.();if(!key)return false;state.meta=object(state.meta)?state.meta:{};state.meta.updatedAt=isoNow();state.actionLog=Array.isArray(state.actionLog)?state.actionLog:[];state.actionLog.push({id:planId('action'),action,args:clone(detail),userConfirmed,at:state.meta.updatedAt});if(state.actionLog.length>300)state.actionLog.splice(0,state.actionLog.length-300);localStorage.setItem(key,JSON.stringify(state));root.dispatchEvent(new CustomEvent('garang:agent-write',{detail:{tool:'dailyPlan',action,storageKey:key,at:state.meta.updatedAt}}));root.dispatchEvent(new CustomEvent('garang:state-updated',{detail:{source:'daily-plan',action}}));clearTimeout(root.__garangDailyPlanSyncTimer);root.__garangDailyPlanSyncTimer=setTimeout(()=>{try{if(root.firebase?.auth?.().currentUser)doc.getElementById('syncBadge')?.click();}catch{}},180);return true;}
  function ensure(state,date){const report=ensureDailyDraft(state,{date,...engines(state,date)});if(report.created||report.past.length){for(const event of report.past)state.actionLog=Array.isArray(state.actionLog)?state.actionLog:[],state.actionLog.push({id:planId('action'),action:event.result==='kept'?'daily_plan_kept':'daily_plan_missed',args:event,userConfirmed:false,at:isoNow()});persist(state,report.created?'daily_plan_draft_created':'daily_plan_outcome_finalized',false,{date,created:report.created,past:report.past});}return report.group;}
  function decorateToday(state,date){const main=doc.getElementById('main');if(main?.dataset.garangScreen!=='today')return;const flow=main.querySelector('#garangTodayFlow'),group=readDraft(state,date);if(!flow)return;const hasConfirmed=confirmedPlans(state,date).length>0;if(group?.status==='draft'&&!hasConfirmed){flow.dataset.dailyDraft='1';const context=flow.querySelector('.gtf-context');if(context){const span=context.querySelector('span'),strong=context.querySelector('strong');if(span)span.textContent='GARANG이 목표와 최근 상태를 반영해 오늘 초안을 준비했습니다.';if(strong)strong.textContent=`DRAFT · ${list(group.items).length} ACTION${list(group.items).length===1?'':'S'}`;}const next=flow.querySelector('[data-gtf-route="planner"]');if(next)next.innerHTML='오늘 초안 확인 <span aria-hidden="true">→</span>';const plan=flow.querySelector('[data-key="plan"] strong');if(plan)plan.textContent=`초안 ${list(group.items).length}개 · 확인 전`;}
    else delete flow.dataset.dailyDraft;
  }
  function renderPlanner(state,date){const main=doc.getElementById('main');if(main?.dataset.garangScreen!=='planner')return;main.querySelector('[data-garang-daily-plan-draft],[data-garang-daily-plan-dismissed]')?.remove();if(confirmedPlans(state,date).length)return;const group=readDraft(state,date);if(!group)return;const host=doc.createElement('div');if(group.status==='draft')host.innerHTML=plannerMarkup(group,doc.documentElement.lang==='en'?'en':'ko');else if(group.status==='dismissed')host.innerHTML=dismissedMarkup(date);else return;const node=host.firstElementChild,head=main.querySelector(':scope > .page-head');if(node){if(head)head.insertAdjacentElement('afterend',node);else main.prepend(node);}}
  function run(){scheduled=false;const b=bridge();if(!b?.ready?.()){clearTimeout(retryTimer);retryTimer=setTimeout(schedule,160);return;}let state;try{state=b.getLiveState();}catch{return;}const date=localDate(),group=ensure(state,date);renderPlanner(state,date);decorateToday(state,date);return group;}
  function schedule(){if(scheduled)return;scheduled=true;root.requestAnimationFrame(()=>root.requestAnimationFrame(()=>root.requestAnimationFrame(run)));}
  doc.addEventListener('click',event=>{const action=event.target.closest?.('[data-gdp-confirm],[data-gdp-save],[data-gdp-dismiss],[data-gdp-regenerate],[data-gdp-remove]');if(!action)return;const main=doc.getElementById('main');if(main?.dataset.garangScreen!=='planner')return;event.preventDefault();const b=bridge();if(!b?.ready?.())return;let state;try{state=b.getLiveState();}catch{return;}const date=localDate(),group=readDraft(state,date),container=main.querySelector('[data-garang-daily-plan-draft]'),engine=engines(state,date);
    if(action.matches('[data-gdp-remove]')&&group?.status==='draft'&&container){const id=action.closest('[data-gdp-item]')?.dataset.gdpItem;updateDraft(state,date,readInputs(container,group).filter(item=>String(item.id)!==String(id)));persist(state,'daily_plan_draft_item_removed',true,{date,id});renderPlanner(state,date);return;}
    if(action.matches('[data-gdp-save]')&&group?.status==='draft'&&container){updateDraft(state,date,readInputs(container,group));persist(state,'daily_plan_draft_edited',true,{date});renderPlanner(state,date);return;}
    if(action.matches('[data-gdp-dismiss]')&&group){if(container&&group.status==='draft')updateDraft(state,date,readInputs(container,group));dismissDraft(state,date);persist(state,'daily_plan_draft_dismissed',true,{date});renderPlanner(state,date);return;}
    if(action.matches('[data-gdp-regenerate]')){const report=regenerateDraft(state,date,engine);persist(state,'daily_plan_draft_regenerated',true,{date});renderPlanner(state,date);decorateToday(state,date);return report;}
    if(action.matches('[data-gdp-confirm]')&&group?.status==='draft'){if(container)updateDraft(state,date,readInputs(container,group));const result=confirmDraft(state,date);persist(state,result.confirmed?'daily_plan_draft_confirmed':'daily_plan_draft_superseded',true,{date,planIds:result.rows.map(x=>x.id),reason:result.reason});root.GarangRouter?.navigate?.('planner',{source:'daily-plan-confirm',force:true});return;}
  },true);
  for(const name of ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:route-completed','garang:agent-write'])root.addEventListener(name,schedule);root.addEventListener('pageshow',schedule);doc.documentElement.addEventListener('garang:language-changed',schedule);schedule();return true;
}
return Object.freeze({VERSION,DRAFT_VERSION,goalClass,weeklyFrequency,trainingDays,buildDailyDraft,ensureDailyDraft,readDraft,updateDraft,dismissDraft,regenerateDraft,confirmDraft,outcome,finalizePastDrafts,plannerMarkup,mount,localDate});
});
