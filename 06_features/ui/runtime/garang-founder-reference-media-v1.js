/* GARANG Founder reference media v1
   Presentation-only media binding for the approved showcase direction.
   Does not replace canonical workout/session/planner owners.
*/
(()=>{
'use strict';
if(window.GarangFounderReferenceMediaV1)return;
const VERSION='1.0.0';
const SHOULDER='https://images.pexels.com/photos/7289370/pexels-photo-7289370.jpeg?auto=compress&cs=tinysrgb&w=1600';
let queued=false;
const $=(s,r=document)=>r?.querySelector?.(s)||null;
function bindImage(img){
  if(!img||img.dataset.garangReferenceMedia==='shoulder-press')return;
  img.src=SHOULDER;
  img.alt=img.closest('.g8-exercise-visual')?'덤벨 숄더 프레스 운동':'오늘의 운동';
  img.decoding='async';
  img.loading='eager';
  img.referrerPolicy='no-referrer';
  img.dataset.garangReferenceMedia='shoulder-press';
}
function reconcile(){
  queued=false;
  const main=$('#main');
  const screen=String(main?.dataset?.garangScreen||'');
  if(screen==='today')bindImage($('.g8-action-visual img',main));
  if(screen==='workout')bindImage($('.g8-exercise-visual img',main));
}
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{reconcile();setTimeout(reconcile,80)});
}
['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','garang:workout-session-started','garang:workout-set-rows-rendered','pageshow'].forEach(name=>window.addEventListener(name,schedule,{passive:true}));
document.addEventListener('click',()=>queueMicrotask(schedule),true);
window.GarangFounderReferenceMediaV1=Object.freeze({version:VERSION,schedule,reconcile});
schedule();
})();
