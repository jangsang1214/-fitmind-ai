/* GARANG Coach Quiet Surface v1
   Premium Coach presentation plus an evidence-only bridge for fresh assistant answers.
   It does not own messages, prompts, proposals, decisions, plan mutations, or scrolling.
*/
(() => {
'use strict';

const main=document.getElementById('main');
if(!main)return;
const VERSION='garang-coach-quiet-surface-v1.0.1';
const STYLE_ID='garang-coach-quiet-surface-v1-runtime-style';
const raf=callback=>{
  const frame=window.requestAnimationFrame;
  if(typeof frame==='function')frame(callback);
  else window.setTimeout(callback,0);
};
const isEnglish=()=>document.documentElement.lang==='en';
const coachEvidenceSeen=new Set();
let coachEvidenceRoot=null;

function ensureRuntimeOverrides(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=[
    '.garang-coach-v2 .g4-prompt-strip.gcs-quiet-strip{display:flex!important;flex-flow:row nowrap!important;align-items:center!important;gap:6px!important;width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important}',
    '.garang-coach-v2 .g4-prompt-strip.gcs-quiet-strip::-webkit-scrollbar{display:none!important}',
    '.garang-coach-v2 .g4-prompt-strip.gcs-quiet-strip>.gcl-context-actions{display:block!important;flex:0 0 auto!important;width:max-content!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;overflow:visible!important}',
    '.garang-coach-v2 .g4-prompt-strip.gcs-quiet-strip>.gcl-context-actions>div{display:flex!important;flex-flow:row nowrap!important;align-items:center!important;gap:6px!important;width:max-content!important;max-width:none!important;flex-wrap:nowrap!important}',
    '.garang-coach-v2 .g4-prompt-strip.gcs-quiet-strip>.gcl-context-actions>.gcl-actions-panel[hidden]{display:none!important}',
    '.garang-coach-v2 .g4-prompt-strip.gcs-quiet-strip>.gcl-context-actions[data-gcl-actions-expanded="true"]{display:flex!important;align-items:center!important;gap:8px!important;width:100%!important;max-width:100%!important}',
    '.garang-coach-v2 .g4-prompt-strip.gcs-quiet-strip>.gcl-context-actions[data-gcl-actions-expanded="true"]>.gcl-actions-panel{display:flex!important;flex:1 1 auto!important;min-width:0!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important}',
    '.garang-coach-v2 .g4-prompt-strip.gcs-quiet-strip>.gcl-context-actions[data-gcl-actions-expanded="true"]>.gcl-actions-panel::-webkit-scrollbar{display:none!important}',
    '.garang-coach-v2 .g4-prompt-strip.gcs-quiet-strip .gcl-context-actions button[data-gcl-coach]{display:inline-flex!important;flex:0 0 auto!important;min-width:0!important;min-height:30px!important;height:30px!important;box-sizing:border-box!important;white-space:nowrap!important;writing-mode:horizontal-tb!important}',
    '.garang-coach-v2 .g4-prompt-strip.gcs-quiet-strip.gcs-show-legacy>.gcl-context-actions{flex:0 0 100%!important;width:100%!important;max-width:100%!important;order:-1!important}',
    '.garang-coach-v2 .g4-prompt-strip.gcs-quiet-strip.gcs-show-legacy>.gcl-context-actions>div{width:100%!important;max-width:100%!important;flex-wrap:wrap!important}',
    '.garang-coach-v2 .g2-empty-chat[data-garang-quiet-empty="1"]{display:block!important;min-height:0!important;padding:18px 0 8px!important;text-align:left!important}',
    '.garang-coach-v2 .g2-empty-chat[data-garang-quiet-empty="1"] .g2-empty-inner{max-width:760px!important;margin:0 auto!important;padding:0!important;text-align:left!important}',
    '.garang-coach-v2 .g2-empty-chat[data-garang-quiet-empty="1"] .gcs-empty-mark{display:none!important}',
    '.garang-coach-v2 .g2-empty-chat[data-garang-quiet-empty="1"] .g2-empty-inner h2{margin:0!important;font-size:21px!important;line-height:1.15!important;text-align:left!important}',
    '.garang-coach-v2 .g2-empty-chat[data-garang-quiet-empty="1"] .g2-empty-inner p{max-width:520px!important;margin:7px 0 0!important;font-size:10px!important;line-height:1.6!important;text-align:left!important}',
    '.garang-coach-v2 .gcs-prompt-more{display:inline-flex!important;flex:0 0 auto!important;min-width:0!important;min-height:30px!important;height:30px!important;box-sizing:border-box!important}',
    '.garang-coach-v2 .gcs-prompt-more[hidden]{display:none!important}',
    '.garang-coach-v2 .gcl-context-label,.garang-coach-v2 [data-gcl-context-label],.garang-coach-v2 .gcl-action-label,.garang-coach-v2 [data-gcl-action-label]{display:none!important}',
    '.garang-coach-v2 .gcs-legacy-action-surface{display:none!important}',
    '@media(max-width:800px){.garang-coach-v2 .g2-empty-chat[data-garang-quiet-empty="1"]{padding:14px 0 6px!important}.garang-coach-v2 .g2-empty-chat[data-garang-quiet-empty="1"] .g2-empty-inner h2{font-size:18px!important}}'
  ].join('');
  document.head.appendChild(style);
}

function syncEmptyState(root){
  const empty=root.querySelector('.g2-empty-chat');
  if(!empty)return;
  empty.dataset.garangQuietEmpty='1';
  const mark=empty.querySelector('.g2-empty-inner>.garang-exact-logo,.g2-empty-inner>.garang-code-mark');
  if(mark){
    mark.classList.add('gcs-empty-mark');
    mark.setAttribute('aria-hidden','true');
  }
  const heading=empty.querySelector('.g2-empty-inner h2');
  const description=empty.querySelector('.g2-empty-inner p');
  if(heading)heading.textContent=isEnglish()?'Start with one clear direction.':'오늘의 방향 하나만 정하세요.';
  if(description)description.textContent=isEnglish()?'GARANG connects your records to the next useful action.':'GARANG은 기록을 바탕으로 다음 행동 하나를 함께 정합니다.';
}

function promptButtons(strip){
  return Array.from(strip.children).filter(child=>child.matches?.('[data-garang-prompt-id]'));
}

function syncPromptSurface(root){
  const strip=root.querySelector('.g2-composer-wrap .g4-prompt-strip');
  if(!strip)return;
  strip.classList.add('gcs-quiet-strip');
  strip.dataset.garangQuietSurface=VERSION;
  strip.setAttribute('role','group');
  strip.setAttribute('aria-label',isEnglish()?'Coach quick actions':'Coach 빠른 실행');
  const legacy=promptButtons(strip);
  legacy.forEach((button,index)=>{
    button.dataset.gcsLegacyPriority=index<3?'primary':'secondary';
  });
  const host=Array.from(strip.children).find(child=>child.hasAttribute?.('data-gcl-coach-actions'));
  const actionCount=host?host.querySelectorAll('[data-gcl-coach]').length:0;
  strip.classList.toggle('gcs-no-context',actionCount===0);
  let more=Array.from(strip.children).find(child=>child.matches?.('[data-garang-coach-more]'));
  if(!more){
    more=document.createElement('button');
    more.type='button';
    more.className='gcs-prompt-more';
    more.dataset.garangCoachMore='1';
    strip.appendChild(more);
  }
  const expanded=strip.classList.contains('gcs-show-legacy');
  more.textContent=expanded?(isEnglish()?'Hide':'접기'):(isEnglish()?'More':'더 보기');
  more.setAttribute('aria-expanded',expanded?'true':'false');
  more.setAttribute('aria-label',expanded?(isEnglish()?'Hide Coach questions':'Coach 질문 접기'):(isEnglish()?'Show more Coach questions':'Coach 질문 더 보기'));
  more.hidden=legacy.length===0;
  if(more.dataset.gcsBound!=='1'){
    more.dataset.gcsBound='1';
    more.addEventListener('click',()=>{
      strip.classList.toggle('gcs-show-legacy');
      syncPromptSurface(root);
    });
  }
}

function hideActionLabels(root){
  root.querySelectorAll('.gcl-context-label,[data-gcl-context-label],.gcl-action-label,[data-gcl-action-label],.gcl-actions-heading').forEach(label=>{
    label.hidden=true;
    label.setAttribute('aria-hidden','true');
  });
  root.querySelectorAll('.gcl-coach-actions').forEach(host=>{
    host.classList.add('gcs-legacy-action-surface');
    host.querySelectorAll('span,small,p,h3,h4').forEach(label=>{
      if(/^(ACT[ ]*\/[ ]*(행동|ACTION)|행동[ ]*제안)$/i.test(String(label.textContent||'').trim())){
        label.hidden=true;
        label.setAttribute('aria-hidden','true');
      }
    });
  });
  const canonical=Array.from(root.querySelectorAll('[data-gcl-coach-actions]'));
  canonical.slice(1).forEach(host=>{
    host.hidden=true;
    host.setAttribute('aria-hidden','true');
    host.classList.add('gcs-duplicate-action-surface');
  });
}

function localDay(stamp){
  const d=new Date(stamp||Date.now());
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function persistCoachEvidence(message){
  const messageId=String(message?.dataset?.messageId||'').trim();
  const text=String(message?.querySelector?.('.g2-message-text')?.textContent||'').trim();
  if(!messageId||!text||message?.dataset?.thinking==='1')return false;
  try{
    const Bridge=window.GarangAgentStateBridge;
    if(!Bridge?.ready?.()||!Bridge.getLiveState||!Bridge.getStorageKey)return false;
    if(window.firebase?.auth?.().currentUser&&window.GarangCloudHydrationReady===false)return false;
    const state=Bridge.getLiveState(),key=Bridge.getStorageKey();
    if(!state||!key)return false;
    state.analytics=state.analytics&&typeof state.analytics==='object'&&!Array.isArray(state.analytics)?state.analytics:{};
    state.analytics.events=Array.isArray(state.analytics.events)?state.analytics.events:[];
    const exists=state.analytics.events.some(event=>String(event?.name||'')==='ai_chat_answered'&&String(event?.props?.coachMessageId||'')===messageId);
    if(exists)return true;
    const at=new Date().toISOString(),date=localDay(at);
    state.analytics.events.push({id:`coach_answer_${messageId}`,name:'ai_chat_answered',date,at,props:{screen:'coach',date,source:'coach-quiet-evidence-v1',coachMessageId:messageId}});
    if(state.analytics.events.length>1000)state.analytics.events.splice(0,state.analytics.events.length-1000);
    state.meta=state.meta&&typeof state.meta==='object'&&!Array.isArray(state.meta)?state.meta:{};
    state.meta.updatedAt=at;
    localStorage.setItem(key,JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('garang:state-updated',{detail:{source:'coach-quiet-evidence-v1',event:'ai_chat_answered',messageId,storageKey:key}}));
    window.setTimeout(()=>{try{if(window.firebase?.auth?.().currentUser)document.getElementById('syncBadge')?.click();}catch{}},120);
    return true;
  }catch(error){
    console.warn('[GARANG] Coach evidence bridge deferred',error);
    return false;
  }
}
function primeCoachEvidence(root=main.querySelector('.garang-coach-v2')){
  if(!root||coachEvidenceRoot===root)return;
  coachEvidenceRoot=root;
  coachEvidenceSeen.clear();
  root.querySelectorAll('.g2-message.assistant[data-message-id]:not([data-thinking="1"])').forEach(message=>{
    const id=String(message.dataset.messageId||'');
    if(id)coachEvidenceSeen.add(id);
  });
}
function syncCoachEvidence(root){
  const messages=Array.from(root.querySelectorAll('.g2-message.assistant[data-message-id]:not([data-thinking="1"])'));
  if(coachEvidenceRoot!==root){
    primeCoachEvidence(root);
    return;
  }
  messages.forEach(message=>{
    const id=String(message.dataset.messageId||'');
    if(!id||coachEvidenceSeen.has(id))return;
    if(persistCoachEvidence(message))coachEvidenceSeen.add(id);
  });
}

function sync(){
  ensureRuntimeOverrides();
  if(main.dataset.garangScreen!=='coach')return;
  const root=main.querySelector('.garang-coach-v2');
  if(!root)return;
  root.dataset.garangCoachQuietSurface=VERSION;
  syncEmptyState(root);
  syncPromptSurface(root);
  hideActionLabels(root);
  syncCoachEvidence(root);
}

let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  raf(()=>raf(()=>{
    queued=false;
    sync();
  }));
}

window.addEventListener('garang:coach-mounted',()=>primeCoachEvidence());
for(const eventName of ['garang:screen-rendered','garang:coach-mounted','garang:coach-message-rendered','garang:coach-decision-rendered','garang:state-hydrated','garang:state-updated','garang:agent-proposal-resolved','garang:route-completed']){
  window.addEventListener(eventName,schedule);
}
document.documentElement.addEventListener('garang:language-changed',schedule);
window.GarangCoachQuietSurface=Object.freeze({version:VERSION,sync:schedule});
schedule();
})();