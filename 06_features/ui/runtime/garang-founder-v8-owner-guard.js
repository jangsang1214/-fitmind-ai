/* GARANG Founder v8 owner guard — preserve canonical Workout nodes across presentation recomposition. */
(()=>{
'use strict';
if(window.GarangFounderV8OwnerGuard)return;
const VERSION='8.0.0';
const ids=new Set(['startWorkoutSession','finishWorkoutSession','workoutExecutionState','workoutExecutionElapsed','workoutExecutionProgress']);
let observer=null,queued=false;
function stash(){
  let node=document.getElementById('garangFounderV8OwnerStash');
  if(node)return node;
  node=document.createElement('div');
  node.id='garangFounderV8OwnerStash';
  node.hidden=true;
  node.setAttribute('aria-hidden','true');
  node.style.setProperty('display','none','important');
  document.body.appendChild(node);
  return node;
}
function connectedOwner(node){
  if(!node||node.nodeType!==1)return false;
  if(node.id&&ids.has(node.id))return true;
  if(node.classList?.contains('workout-session-live')||node.classList?.contains('workout-session-progress'))return true;
  return !!node.querySelector?.('#startWorkoutSession,#finishWorkoutSession,#workoutExecutionState,#workoutExecutionElapsed,#workoutExecutionProgress');
}
function rescueNode(node){
  if(!node||node.nodeType!==1)return;
  const candidates=[];
  if(node.id&&ids.has(node.id))candidates.push(node);
  if(node.classList?.contains('workout-session-live')||node.classList?.contains('workout-session-progress'))candidates.push(node);
  node.querySelectorAll?.('#startWorkoutSession,#finishWorkoutSession,.workout-session-live,.workout-session-progress').forEach(n=>candidates.push(n));
  const host=stash();
  [...new Set(candidates)].forEach(candidate=>{
    if(candidate.isConnected)return;
    host.appendChild(candidate);
  });
}
function portalRest(){
  const rest=document.getElementById('workoutExecutionRest');
  if(!rest)return;
  if(rest.parentElement!==document.body)document.body.appendChild(rest);
  if(!rest.hidden&&rest.classList.contains('active')){
    rest.style.removeProperty('display');
    rest.style.removeProperty('visibility');
    rest.style.removeProperty('pointer-events');
  }
}
function reconcile(){
  queued=false;
  portalRest();
  const host=stash();
  ['startWorkoutSession','finishWorkoutSession'].forEach(id=>{
    const node=document.getElementById(id);
    if(node&&document.getElementById('main')?.dataset?.garangScreen==='workout'&&!node.closest('.g8-workout')&&!node.closest('.workout-session-bar')&&node.parentElement!==host)host.appendChild(node);
  });
}
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(reconcile);
}
observer=new MutationObserver(records=>{
  for(const record of records){
    record.removedNodes?.forEach(node=>{if(connectedOwner(node))rescueNode(node)});
    if(record.type==='attributes'&&record.target?.id==='workoutExecutionRest')portalRest();
  }
});
observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','style']});
['garang:screen-rendered','garang:route-completed','garang:workout-session-started','garang:state-updated','pageshow'].forEach(name=>window.addEventListener(name,schedule,{passive:true}));
schedule();
window.GarangFounderV8OwnerGuard=Object.freeze({version:VERSION,schedule,reconcile});
})();
