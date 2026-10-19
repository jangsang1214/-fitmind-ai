/* GARANG Founder Target v5 compatibility guard.
   Keeps the Founder-board presentation attached to canonical action/state owners.
   No concept-board image or crop is used at runtime.
*/
(()=>{
'use strict';
if(window.GarangFounderTargetV5Compat)return;
const VERSION='garang-founder-target-v5-compat.1.0.0';
const qs=(root,sel)=>root?.querySelector?.(sel)||null;
function show(node,display='block'){
  if(!node)return;
  node.hidden=false;
  node.removeAttribute('aria-hidden');
  node.style.setProperty('display',display,'important');
  node.style.setProperty('visibility','visible','important');
}
function repairToday(){
  const main=document.getElementById('main');
  if(main?.dataset?.garangScreen!=='today')return;
  const flow=qs(main,'#garangTodayFlow');
  const copy=qs(flow,':scope > .g5-today-hero-copy');
  const decision=qs(flow,'.gtf-decision')||qs(main,'.gtf-decision');
  if(!flow||!copy||!decision)return;

  /* The canonical decision is the visible Founder hero. Never duplicate its text. */
  [...copy.children].forEach(child=>{if(child!==decision)child.remove();});
  if(decision.parentElement!==copy)copy.appendChild(decision);
  show(copy,'block');
  show(decision,'block');
  const heading=qs(decision,'h2'),reason=qs(decision,'p');
  show(heading,'block');show(reason,'block');
  decision.style.setProperty('margin','0','important');
  decision.style.setProperty('padding','0','important');
  decision.style.setProperty('border','0','important');
  decision.style.setProperty('background','transparent','important');
}
function repairBottomNav(){
  const main=document.getElementById('main'),nav=document.getElementById('bottomNav');
  if(!main||!nav)return;
  const screen=String(main.dataset.garangScreen||'');
  const rest=document.getElementById('workoutExecutionRest');
  const session=qs(main,'.workout-session-bar');
  const restVisible=!!rest&&!rest.hidden&&getComputedStyle(rest).display!=='none';
  const live=screen==='workout'&&!!session?.classList.contains('is-live');
  nav.style.setProperty('display',(live||restVisible)?'none':'grid','important');
}
function repair(){repairToday();repairBottomNav();}
let timer=0;
function schedule(delay=0){clearTimeout(timer);timer=setTimeout(()=>requestAnimationFrame(repair),delay);}
for(const event of ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','garang:daily-workout-plan-ready','garang:workout-session-started','garang:workout-set-rows-rendered','pageshow']){
  window.addEventListener(event,()=>{schedule(35);setTimeout(repair,140);},{passive:true});
}
document.addEventListener('click',event=>{
  if(event.target?.closest?.('[data-gws-step],#startWorkoutSession,#skipWorkoutRest,#finishWorkoutSession,[data-execution-set-complete]')){
    schedule(50);setTimeout(repair,220);
  }
},true);
new MutationObserver(()=>schedule(20)).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','data-garang-screen']});
document.addEventListener('DOMContentLoaded',()=>schedule(50),{once:true});
schedule(50);
window.GarangFounderTargetV5Compat=Object.freeze({version:VERSION,repair,schedule});
})();
