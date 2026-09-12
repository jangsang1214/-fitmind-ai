/* GARANG Canonical Daily Plan v1
   One planning source for today's GARANG plan.
   Home and Planner already read GarangDailyPlanV1; this bridge makes Coach and
   legacy apply actions confirm the same three-track draft instead of creating a
   second single-row plan source.
*/
(() => {
'use strict';
if(window.GarangCanonicalDailyPlanV1)return;

const VERSION='garang-canonical-daily-plan-v1.0.0';
const DOMAINS=Object.freeze(['training','recovery','nutrition']);
const DOMAIN_LABELS=Object.freeze({ko:{training:'운동',recovery:'회복',nutrition:'식단'},en:{training:'Training',recovery:'Recovery',nutrition:'Nutrition'}});
const CONFIRMATION_SCOPE_KEY=window.GarangAgentContractV2?.CONFIRMATION_SCOPE_KEY||'__GARANG_AGENT_CONFIRMED_WRITE_V2__';
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const list=value=>Array.isArray(value)?value:[];
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const dateKey=value=>String(value||'').slice(0,10);
const sameDate=(row,date)=>dateKey(row?.date||row?.day||row?.performedAt||row?.createdAt)===date;
const id=prefix=>globalThis.crypto?.randomUUID?.()||`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const isoNow=()=>new Date().toISOString();
const daily=()=>window.GarangDailyPlanV1||null;
const stateBridge=()=>window.GarangAgentStateBridge||null;

function currentDate(){return daily()?.localDate?.()||(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})();}
function confirmedPlans(state,date){return list(state?.planner).filter(row=>sameDate(row,date)&&String(row?.status||'confirmed').toLowerCase()!=='draft');}
function canonicalRows(state,date){return confirmedPlans(state,date).filter(row=>row?.origin==='garang-daily-plan');}
function engines(state,date){
  const bridge=stateBridge();let decision=null,performance=null,userState=null;
  try{decision=bridge?.getDecision?.()||null;}catch{}
  try{userState=bridge?.getUserState?.()||null;}catch{}
  try{performance=window.GarangPerformanceScore?.compute?.(state,{now:new Date(`${date}T12:00:00`),userState,includeHistory:false})||null;}catch{}
  return {decision,performance,PlanExecution:window.GarangPlanExecution};
}
function persist(state,action,userConfirmed,detail={}){
  const bridge=stateBridge(),key=bridge?.getStorageKey?.();if(!key)throw new Error('CANONICAL_DAILY_PLAN_STORAGE_NOT_READY');
  state.meta=object(state.meta)?state.meta:{};state.meta.updatedAt=isoNow();
  state.actionLog=Array.isArray(state.actionLog)?state.actionLog:[];
  state.actionLog.push({id:id('action'),action,args:clone(detail),userConfirmed:!!userConfirmed,at:state.meta.updatedAt});
  if(state.actionLog.length>300)state.actionLog.splice(0,state.actionLog.length-300);
  localStorage.setItem(key,JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('garang:agent-write',{detail:{tool:'dailyPlan',action,args:clone(detail),storageKey:key,at:state.meta.updatedAt}}));
  window.dispatchEvent(new CustomEvent('garang:state-updated',{detail:{source:'canonical-daily-plan',action}}));
  clearTimeout(window.__garangCanonicalDailyPlanSyncTimer);
  window.__garangCanonicalDailyPlanSyncTimer=setTimeout(()=>{try{if(window.firebase?.auth?.().currentUser)document.getElementById('syncBadge')?.click();}catch{}},180);
  return true;
}
function ensureDraft(state,date){
  const Daily=daily();if(!Daily)throw new Error('GARANG_DAILY_PLAN_NOT_READY');
  let group=Daily.readDraft?.(state,date)||null,report=null;
  if(!group||group.status!=='draft'){
    report=Daily.ensureDailyDraft?.(state,{date,...engines(state,date)})||null;
    group=report?.group||Daily.readDraft?.(state,date)||null;
  }
  return {group,report};
}
function navigatePlanner(source){try{return window.GarangRouter?.navigate?.('planner',{source:source||'canonical-daily-plan',force:true})===true;}catch{return false;}}
function confirmToday(options={}){
  const Daily=daily(),bridge=stateBridge();
  if(!Daily||!bridge?.ready?.())throw new Error('CANONICAL_DAILY_PLAN_NOT_READY');
  const date=String(options.date||currentDate()).slice(0,10),source=String(options.source||'canonical-daily-plan');
  const state=bridge.getLiveState?.();if(!state)throw new Error('CANONICAL_DAILY_PLAN_STATE_NOT_READY');
  const existing=confirmedPlans(state,date);
  if(existing.length){
    const result={confirmed:false,existing:true,reason:'existing-plan',date,rows:clone(existing),canonical:existing.every(row=>row?.origin==='garang-daily-plan')};
    if(options.navigate===true)navigatePlanner(source);
    return result;
  }
  const {group,report}=ensureDraft(state,date);
  if(!group||group.status!=='draft'){
    const result={confirmed:false,existing:false,reason:group?.status||'no-draft',date,rows:[]};
    if(options.navigate===true)navigatePlanner(source);
    return result;
  }
  const result=Daily.confirmDraft(state,date);
  const confirmedGroup=Daily.readDraft?.(state,date)||group;
  if(result.confirmed){
    confirmedGroup.confirmationSource=source;
    confirmedGroup.updatedAt=isoNow();
  }
  persist(state,result.confirmed?'daily_plan_draft_confirmed':'daily_plan_draft_superseded',true,{
    date,source,reason:result.reason,planIds:list(result.rows).map(row=>row.id),domains:list(result.rows).map(row=>row.domain),
    created:report?.created===true,adapted:report?.adapted===true,revision:Number(confirmedGroup?.revision)||1
  });
  const output={...result,date,source,existing:false,group:clone(confirmedGroup)};
  if(options.navigate===true)navigatePlanner(source);
  return output;
}
function summaryToday(options={}){
  const Daily=daily(),bridge=stateBridge();if(!Daily||!bridge?.ready?.())return null;
  let state;try{state=bridge.getLiveState?.();}catch{return null;}if(!state)return null;
  const date=String(options.date||currentDate()).slice(0,10),lang=options.lang==='en'?'en':'ko';
  const group=Daily.readDraft?.(state,date)||null;
  let items=list(group?.items);
  if(!items.length)items=canonicalRows(state,date);
  if(!items.length)return null;
  const byDomain=new Map();items.forEach((item,index)=>{const domain=DOMAINS.includes(String(item?.domain))?String(item.domain):(index===0?'training':index===1?'recovery':'nutrition');if(!byDomain.has(domain))byDomain.set(domain,item);});
  const parts=DOMAINS.map(domain=>{const item=byDomain.get(domain);if(!item)return null;const title=String(item?.title||'').trim();return `${DOMAIN_LABELS[lang][domain]} · ${title||'—'}`;}).filter(Boolean);
  if(!parts.length)return null;
  return `${lang==='en'?"Today's plan":'오늘의 계획'} · ${parts.join(' · ')}`;
}
function confirmedWrite(meta){
  if(meta?.userConfirmed===true||meta?.confirmed===true)return true;
  const scoped=window[CONFIRMATION_SCOPE_KEY];
  return scoped?.userConfirmed===true||scoped?.confirmed===true;
}
function installWriteFacade(){
  const base=stateBridge();if(!base||base.__canonicalDailyPlanV1===VERSION)return false;
  const previousApply=typeof base.applyWrite==='function'?base.applyWrite.bind(base):null;
  const facade=Object.freeze({...base,__canonicalDailyPlanV1:VERSION,applyWrite(tool,args,meta){
    if(tool==='createPlan'&&confirmedWrite(meta)){
      const result=confirmToday({source:'coach',navigate:false,proposalArgs:clone(args||{})});
      if(result.confirmed||result.reason==='existing-plan')return result;
      throw new Error(`CANONICAL_DAILY_PLAN_${String(result.reason||'NOT_CONFIRMED').toUpperCase().replace(/[^A-Z0-9]+/g,'_')}`);
    }
    if(!previousApply)throw new Error('AGENT_WRITE_NOT_AVAILABLE');
    return previousApply(tool,args,meta);
  }});
  window.GarangAgentStateBridge=facade;
  return true;
}
function installLegacyApplyInterceptor(){
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-action="apply-coach-plan"]');if(!button)return;
    const bridge=stateBridge(),Daily=daily();if(!bridge?.ready?.()||!Daily)return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    try{confirmToday({source:'legacy-apply-coach-plan',navigate:true});}
    catch(error){console.warn('[GARANG] canonical daily plan apply failed',error);}
  },true);
}
function decorateCoachProposals(){
  const summary=summaryToday({lang:document.documentElement.lang==='en'?'en':'ko'});if(!summary)return;
  document.querySelectorAll('.g4-agent-proposal').forEach(card=>{
    const tool=String(card.querySelector('.g4-proposal-head b')?.textContent||'').trim();
    if(!/계획 생성|Create plan/i.test(tool))return;
    const copy=card.querySelector(':scope > p');if(copy&&copy.textContent!==summary)copy.textContent=summary;
    card.dataset.canonicalDailyPlan='1';
  });
}
let decorateQueued=false;
function scheduleDecorate(){if(decorateQueued)return;decorateQueued=true;requestAnimationFrame(()=>{decorateQueued=false;decorateCoachProposals();});}

installWriteFacade();
installLegacyApplyInterceptor();
for(const name of ['garang:screen-rendered','garang:coach-mounted','garang:coach-message-rendered','garang:state-updated','garang:agent-write'])window.addEventListener(name,scheduleDecorate);
new MutationObserver(scheduleDecorate).observe(document.getElementById('main')||document.body,{childList:true,subtree:true});
window.GarangCanonicalDailyPlanV1=Object.freeze({version:VERSION,confirmToday,summaryToday,confirmedPlans:(state,date=currentDate())=>clone(confirmedPlans(state,date)),canonicalRows:(state,date=currentDate())=>clone(canonicalRows(state,date)),installWriteFacade});
scheduleDecorate();
})();
