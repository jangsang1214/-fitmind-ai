/* GARANG Founder v8 owner guard — preserve canonical Today/Workout owners across presentation recomposition. */
(()=>{
'use strict';
if(window.GarangFounderV8OwnerGuard)return;
const VERSION='8.0.1';
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
function important(node,name,value){
  if(!node)return;
  if(node.style.getPropertyValue(name)===value&&node.style.getPropertyPriority(name)==='important')return;
  node.style.setProperty(name,value,'important');
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
function preserveTodayFlow(){
  const m=document.getElementById('main');
  if(!m||m.dataset.garangScreen!=='today')return;
  const flow=document.getElementById('garangTodayFlow');
  if(!flow||!m.contains(flow))return;
  const direct=[...m.children].find(node=>node.classList?.contains('g8-today'))||null;
  const nested=flow.querySelector(':scope > .g8-today');
  let shell=direct||nested;
  if(direct&&nested&&direct!==nested){
    const hasCanonical=nested.querySelector('.gtf-decision,.gtf-action,[data-garang-direct-workout-start="1"],[data-garang-today-workout-result="1"]');
    if(!hasCanonical)nested.remove();
  }
  if(shell&&shell.parentElement!==flow)flow.prepend(shell);
  flow.hidden=false;
  flow.removeAttribute('aria-hidden');
  flow.classList.add('g8-canonical-today-owner');
  important(flow,'display','block');
  important(flow,'visibility','visible');
  important(flow,'width','100%');
  important(flow,'min-width','0');
  important(flow,'margin','0');
  important(flow,'padding','0');
  important(flow,'border','0');
  important(flow,'background','transparent');
  shell=flow.querySelector(':scope > .g8-today')||shell;
  [...flow.children].forEach(child=>{
    if(child===shell){
      child.hidden=false;
      child.removeAttribute('aria-hidden');
      important(child,'display','block');
      important(child,'visibility','visible');
      return;
    }
    important(child,'display','none');
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
  preserveTodayFlow();
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
  let shouldSchedule=false;
  for(const record of records){
    record.removedNodes?.forEach(node=>{if(connectedOwner(node))rescueNode(node)});
    if(record.type==='attributes'&&record.target?.id==='workoutExecutionRest')portalRest();
    if(record.type==='attributes'&&record.target?.id==='garangTodayFlow')shouldSchedule=true;
    if(record.type==='childList'){
      if(record.target?.id==='garangTodayFlow')shouldSchedule=true;
      if([...record.addedNodes].some(node=>node?.nodeType===1&&(node.classList?.contains('g8-today')||node.querySelector?.('.g8-today'))))shouldSchedule=true;
    }
  }
  if(shouldSchedule)schedule();
});
observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class','style']});
['garang:screen-rendered','garang:route-completed','garang:workout-session-started','garang:workout-session-ended','garang:state-updated','pageshow'].forEach(name=>window.addEventListener(name,schedule,{passive:true}));
schedule();
window.GarangFounderV8OwnerGuard=Object.freeze({version:VERSION,schedule,reconcile});
})();
