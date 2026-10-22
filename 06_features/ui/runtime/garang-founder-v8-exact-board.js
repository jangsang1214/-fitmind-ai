/* GARANG Founder v8 exact-board bridge — visible anatomy is the interactive anatomy. */
(()=>{
'use strict';
if(window.GarangFounderV8ExactBoard)return;
const $=(s,r=document)=>r?.querySelector?.(s)||null;
const $$=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
let queued=false;
function screen(){return String($('#main')?.dataset?.garangScreen||'');}
function readState(){
  try{return window.GarangRepositories?.StateRepository?.read?.()||null}catch{return null}
}
function anatomy(side='front',focus='full'){
  const api=window.GarangAnatomyExactV2;if(!api?.create)return null;
  const gender=String(readState()?.profile?.gender||'male').toLowerCase()==='female'?'female':'male';
  return api.create(side,gender,focus);
}
function today(){
  const card=$('.g8-today .g8-decision-card');if(!card)return;
  let stage=$(':scope > .g8-today-anatomy',card);if(!stage){stage=document.createElement('div');stage.className='g8-today-anatomy';card.appendChild(stage)}
  if(!stage.querySelector('[data-garang-anatomy-model="exact-v2"]')&&window.GarangAnatomyExactV2)stage.replaceChildren(anatomy('front','upper'));
  card.classList.add('g8-decision-with-anatomy');
}
function body(){
  const host=$('.g8-body .g8-body-visual');if(!host||!window.GarangAnatomyExactV2)return;
  const active=($('.g8-body-tabs button.active')?.textContent||'FRONT').trim().toLowerCase();const side=['front','side','back'].includes(active)?active:'front';
  let pair=$(':scope > .g8-body-pair',host);if(!pair){pair=document.createElement('div');pair.className='g8-body-pair';host.prepend(pair)}
  const signature=`${side}:${window.GarangAnatomyExactV2.version}`;
  if(pair.dataset.signature!==signature){const companion=side==='back'?'front':'back';const primary=document.createElement('div');primary.className='g8-body-model g8-body-model-primary';primary.appendChild(anatomy(side,'full'));const secondary=document.createElement('div');secondary.className='g8-body-model g8-body-model-secondary';secondary.appendChild(anatomy(companion,'full'));pair.replaceChildren(primary,secondary);pair.dataset.signature=signature;}
  $$(':scope > img',host).forEach(n=>n.remove());const legacy=$('.g8-body-hit-layer',host);if(legacy){legacy.style.display='none';legacy.setAttribute('aria-hidden','true')}host.dataset.visibleAnatomy='exact-v2';
}
function summary(){
  const shell=$('.g8-summary');if(!shell||!window.GarangAnatomyExactV2)return;
  let stage=$(':scope > .g8-summary-anatomy',shell);if(!stage){stage=document.createElement('div');stage.className='g8-summary-anatomy';const next=$('.g8-summary-next',shell);shell.insertBefore(stage,next||null)}
  if(!stage.querySelector('[data-garang-anatomy-model="exact-v2"]'))stage.replaceChildren(anatomy('front','upper'));
}
function rest(){
  const host=$('#workoutExecutionRest');if(!host||host.hidden||!host.classList.contains('active'))return;
  const row=$('#workoutSetDetails .execution-set-row.current-set')||$('#workoutSetDetails .execution-set-row:not(.completed)');
  let card=$(':scope > .g8-rest-next-card',host);
  if(!row){card?.remove();return;}
  if(!card){card=document.createElement('section');card.className='g8-rest-next-card';host.appendChild(card)}
  const previous=($('.execution-previous',row)?.textContent||'').trim();
  const target=($('.execution-target',row)?.textContent||'').trim();
  const weight=$('[data-set-weight]',row)?.value||$('input[type="number"]',row)?.value||'—';
  const reps=$('[data-set-reps]',row)?.value||$$('input[type="number"]',row)[1]?.value||'—';
  card.innerHTML=`<span>다음 세트</span><strong>${weight} kg × ${reps}회</strong><small>${target||previous||'현재 계획을 이어갑니다.'}</small>`;
}
function reconcile(){
  document.documentElement.dataset.garangVisualAuthority='exact-board-v8';const s=screen();
  if(s==='today')today();if(s==='body')body();if(s==='workout'){if($('#main')?.classList.contains('g8-summary-mode'))summary();rest();}
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;reconcile()})}
['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:workout-session-ended','garang:workout-set-rows-rendered','pageshow'].forEach(n=>window.addEventListener(n,schedule,{passive:true}));
document.addEventListener('click',()=>queueMicrotask(schedule),true);
window.GarangFounderV8ExactBoard=Object.freeze({schedule,reconcile,version:'8.5.1'});schedule();
})();
