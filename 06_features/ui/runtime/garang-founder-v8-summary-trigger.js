/* GARANG Founder v8 Summary trigger — narrow observer for async canonical workout results. */
(()=>{
'use strict';
if(window.GarangFounderV8SummaryTrigger)return;
const VERSION='8.0.0';
let observer=null,observedMain=null,queued=false;
function containsResult(node){
  if(!node||node.nodeType!==1)return false;
  return node.matches?.('.workout-result-card')||!!node.querySelector?.('.workout-result-card');
}
function scheduleSummary(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    if(document.getElementById('main')?.dataset?.garangScreen!=='workout')return;
    if(!document.querySelector('#main .workout-result-card'))return;
    window.GarangFounderV8?.schedule?.();
    requestAnimationFrame(()=>window.GarangFounderV8ExactBoard?.schedule?.());
  });
}
function observe(){
  const main=document.getElementById('main');
  if(!main||main===observedMain)return;
  observer?.disconnect();
  observedMain=main;
  observer=new MutationObserver(records=>{
    if(main.dataset.garangScreen!=='workout')return;
    for(const record of records){
      if(record.type!=='childList')continue;
      if([...record.addedNodes].some(containsResult)){
        scheduleSummary();
        return;
      }
    }
  });
  observer.observe(main,{childList:true,subtree:true});
}
function reconcile(){observe();if(document.querySelector('#main[data-garang-screen="workout"] .workout-result-card'))scheduleSummary();}
['garang:screen-rendered','garang:route-completed','garang:workout-session-ended','garang:state-updated','pageshow'].forEach(name=>window.addEventListener(name,reconcile,{passive:true}));
reconcile();
window.GarangFounderV8SummaryTrigger=Object.freeze({version:VERSION,reconcile,schedule:scheduleSummary});
})();
