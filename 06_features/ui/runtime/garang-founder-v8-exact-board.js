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
function imp(node,property,value){if(node)node.style.setProperty(property,value,'important')}
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
function liveSet(){
  const main=$('#main');if(!main?.classList.contains('g8-live-mode'))return;
  const row=$('#workoutSetDetails .execution-set-row.current-set');if(!row)return;
  const index=$('.execution-set-index',row),previous=$('.execution-previous',row),target=$('.execution-target',row),weight=$('.execution-weight-field',row),reps=$('.execution-reps-field',row),complete=$('[data-execution-set-complete]',row);
  imp(row,'display','grid');imp(row,'grid-template-columns','minmax(0,1fr) minmax(0,1fr)');imp(row,'grid-template-areas','none');imp(row,'grid-auto-flow','row');imp(row,'column-gap','10px');imp(row,'row-gap','8px');imp(row,'min-width','0');imp(row,'width','100%');imp(row,'overflow','hidden');imp(row,'padding','12px');imp(row,'min-height','190px');
  [index,previous,target,weight,reps,complete].forEach(node=>{imp(node,'grid-area','auto');imp(node,'min-width','0');imp(node,'max-width','100%')});
  imp(index,'grid-column','1');imp(index,'grid-row','1');imp(index,'justify-self','start');
  imp(previous,'grid-column','1');imp(previous,'grid-row','2');imp(previous,'text-align','left');imp(previous,'align-self','end');
  imp(target,'grid-column','2');imp(target,'grid-row','2');imp(target,'text-align','right');imp(target,'align-self','end');
  imp(weight,'grid-column','1');imp(weight,'grid-row','3');imp(weight,'width','100%');imp(weight,'overflow','hidden');
  imp(reps,'grid-column','2');imp(reps,'grid-row','3');imp(reps,'width','100%');imp(reps,'overflow','hidden');
  [weight,reps].forEach(field=>{const input=$('input',field);imp(input,'width','100%');imp(input,'min-width','0');imp(input,'max-width','100%');imp(input,'box-sizing','border-box');imp(input,'height','52px')});
  imp(complete,'grid-column','1 / -1');imp(complete,'grid-row','4');imp(complete,'width','100%');imp(complete,'min-width','0');imp(complete,'max-width','100%');imp(complete,'height','52px');imp(complete,'min-height','52px');imp(complete,'margin','0');imp(complete,'justify-self','stretch');imp(complete,'overflow','hidden');
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
  if(s==='today')today();if(s==='body')body();if(s==='workout'){if($('#main')?.classList.contains('g8-summary-mode'))summary();liveSet();rest();}
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;reconcile()})}
['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:workout-session-started','garang:workout-session-ended','garang:workout-set-rows-rendered','pageshow'].forEach(n=>window.addEventListener(n,schedule,{passive:true}));
document.addEventListener('click',()=>queueMicrotask(schedule),true);
window.GarangFounderV8ExactBoard=Object.freeze({schedule,reconcile,version:'8.5.2'});schedule();
})();
