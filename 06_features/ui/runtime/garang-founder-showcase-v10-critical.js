/* GARANG Founder showcase v10 — critical-path DOM binding.
   Keeps canonical owners/actions intact; only adds reference hierarchy labels. */
(()=>{
'use strict';
if(window.GarangFounderShowcaseV10)return;
const VERSION='10.0.0';
const $=(s,r=document)=>r?.querySelector?.(s)||null;
let queued=false;
function screen(){return String($('#main')?.dataset?.garangScreen||'')}
function today(){
 const shell=$('#main[data-garang-screen="today"] .g8-today');
 if(!shell)return;
 const action=$('.g8-action-card',shell);
 if(action){
  let heading=$('.g10-action-section-title',shell);
  if(!heading){
   heading=document.createElement('h2');
   heading.className='g10-action-section-title';
   heading.textContent='오늘의 핵심 액션';
  }
  if(heading.nextElementSibling!==action)shell.insertBefore(heading,action);
 }
 const state=$('.g8-state-card',shell);
 const stateTitle=$('.g8-section-head h2',state);
 if(stateTitle&&stateTitle.textContent.trim()!=='오늘의 상태')stateTitle.textContent='오늘의 상태';
 shell.dataset.garangFounderReference='showcase-v10';
}
function workout(){
 const shell=$('#main[data-garang-screen="workout"] .g8-workout');
 if(!shell)return;
 shell.dataset.garangFounderReference='showcase-v10';
 const current=$('#workoutSetDetails .execution-set-row.current-set',shell);
 const complete=current?.querySelector?.('[data-execution-set-complete]');
 if(complete){
  complete.setAttribute('aria-label','세트 완료');
  const text=complete.textContent.trim();
  if(!text||/완료|complete/i.test(text))complete.textContent='세트 완료';
 }
}
function reconcile(){
 document.documentElement.dataset.garangVisualAuthority='founder-showcase-v10';
 const s=screen();
 if(s==='today')today();
 if(s==='workout')workout();
}
function schedule(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{
  queued=false;
  reconcile();
  setTimeout(reconcile,60);
 });
}
['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','garang:workout-session-started','garang:workout-set-rows-rendered','pageshow'].forEach(name=>window.addEventListener(name,schedule,{passive:true}));
document.addEventListener('click',()=>queueMicrotask(schedule),true);
window.GarangFounderShowcaseV10=Object.freeze({version:VERSION,schedule,reconcile});
schedule();
})();
