/* GARANG Founder reference-lock v9 — binding showcase composition without cloning canonical owners. */
(()=>{
'use strict';
if(window.GarangFounderV8ExactBoard?.version==='9.0.0')return;
const $=(s,r=document)=>r?.querySelector?.(s)||null;
const $$=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
let queued=false;
function screen(){return String($('#main')?.dataset?.garangScreen||'');}
function readState(){try{return window.GarangRepositories?.StateRepository?.read?.()||null}catch{return null}}
function anatomy(side='front',focus='full'){
 const api=window.GarangAnatomyExactV2;if(!api?.create)return null;
 const gender=String(readState()?.profile?.gender||'male').toLowerCase()==='female'?'female':'male';
 return api.create(side,gender,focus);
}
function show(node,display){if(!node)return;node.hidden=false;node.removeAttribute('aria-hidden');node.style.removeProperty('visibility');node.style.removeProperty('pointer-events');if(display)node.style.setProperty('display',display,'important');}
function today(){
 const shell=$('.g8-today');if(!shell)return;
 $$('.g8-today-anatomy',shell).forEach(n=>n.remove());
 $('.g8-decision-card',shell)?.classList.add('g9-showcase-hero');
 $('.g8-action-card',shell)?.classList.add('g9-showcase-train');
 $('.g8-secondary-action',shell)?.classList.add('g9-showcase-build');
 $('.g8-state-card',shell)?.classList.add('g9-showcase-state');
 shell.dataset.garangReferenceLock='showcase-v9';
}
function body(){
 const host=$('.g8-body .g8-body-visual');if(!host||!window.GarangAnatomyExactV2)return;
 const active=($('.g8-body-tabs button.active')?.textContent||'FRONT').trim().toLowerCase();
 const side=['front','side','back'].includes(active)?active:'front';
 let pair=$(':scope > .g8-body-pair',host);if(!pair){pair=document.createElement('div');pair.className='g8-body-pair';host.prepend(pair)}
 const signature=`${side}:${window.GarangAnatomyExactV2.version}`;
 if(pair.dataset.signature!==signature){
  const companion=side==='back'?'front':'back';
  const primary=document.createElement('div');primary.className='g8-body-model g8-body-model-primary';primary.appendChild(anatomy(side,'full'));
  const secondary=document.createElement('div');secondary.className='g8-body-model g8-body-model-secondary';secondary.appendChild(anatomy(companion,'full'));
  pair.replaceChildren(primary,secondary);pair.dataset.signature=signature;
 }
 $$(':scope > img',host).forEach(n=>n.remove());
 const legacy=$('.g8-body-hit-layer',host);if(legacy){legacy.style.display='none';legacy.setAttribute('aria-hidden','true')}
 host.dataset.visibleAnatomy='exact-v2';
}
function workout(){
 const main=$('#main');if(!main)return;
 const shell=$('.g8-workout',main);if(!shell)return;
 shell.dataset.garangReferenceLock='showcase-v9';
 $('.g8-exercise-visual',shell)?.classList.add('g9-workout-visual');
 const row=$('#workoutSetDetails .execution-set-row.current-set',shell);if(!row)return;
 row.classList.add('g9-reference-current-set');
 const weight=$('.execution-weight-field',row),reps=$('.execution-reps-field',row),complete=$('[data-execution-set-complete]',row);
 [weight,reps].forEach(field=>{if(!field)return;show(field,'block');const input=$('input',field);if(input){input.style.removeProperty('width');input.style.removeProperty('height');input.style.removeProperty('max-width');input.style.removeProperty('min-width')}});
 if(complete){show(complete,'grid');complete.setAttribute('aria-label',complete.getAttribute('aria-label')||'세트 완료')}
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
function summary(){const shell=$('.g8-summary');if(!shell)return;$$(':scope > .g8-summary-anatomy',shell).forEach(n=>n.remove());shell.dataset.garangReferenceLock='showcase-v9';}
function reconcile(){
 document.documentElement.dataset.garangVisualAuthority='founder-showcase-v9';
 const s=screen();
 if(s==='today')today();
 if(s==='body')body();
 if(s==='workout'){workout();rest();if($('#main')?.classList.contains('g8-summary-mode'))summary();}
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;reconcile()})}
['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:workout-session-started','garang:workout-session-ended','garang:workout-set-rows-rendered','pageshow'].forEach(n=>window.addEventListener(n,schedule,{passive:true}));
document.addEventListener('click',()=>queueMicrotask(schedule),true);
window.GarangFounderV8ExactBoard=Object.freeze({schedule,reconcile,version:'9.0.0'});schedule();
})();
