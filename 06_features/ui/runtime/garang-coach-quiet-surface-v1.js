/* GARANG Coach Quiet Surface v1
   Presentation-only layer for the premium Coach surface.
   It does not own messages, prompts, proposals, decisions, writes, or scrolling.
*/
(() => {
'use strict';

const main=document.getElementById('main');
if(!main)return;
const VERSION='garang-coach-quiet-surface-v1.0.0';
const STYLE_ID='garang-coach-quiet-surface-v1-runtime-style';
const raf=callback=>{
  const frame=window.requestAnimationFrame;
  if(typeof frame==='function')frame(callback);
  else window.setTimeout(callback,0);
};
const isEnglish=()=>document.documentElement.lang==='en';

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

for(const eventName of ['garang:screen-rendered','garang:coach-mounted','garang:coach-message-rendered','garang:coach-decision-rendered','garang:state-hydrated','garang:state-updated','garang:agent-proposal-resolved','garang:route-completed']){
  window.addEventListener(eventName,schedule);
}
document.documentElement.addEventListener('garang:language-changed',schedule);
window.GarangCoachQuietSurface=Object.freeze({version:VERSION,sync:schedule});
schedule();
})();
