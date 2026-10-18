/* GARANG Presentation v4
   Structural adapter only. Moves canonical nodes into stable visual composition without cloning state/action owners.
*/
(() => {
'use strict';
if (window.GarangPresentationV4) return;
const VERSION='garang-presentation-v4.0.0';
const main=()=>document.getElementById('main');
const app=()=>document.getElementById('appView');
const qs=(root,sel)=>root?.querySelector?.(sel)||null;
const isNode=node=>node&&node.nodeType===1;
const screen=()=>String(main()?.dataset?.garangScreen||'').trim();
function ensure(tag,cls,parent,before=null){
  let el=qs(parent,':scope > .'+cls);
  if(el)return el;
  el=document.createElement(tag);el.className=cls;
  if(before)parent.insertBefore(el,before);else parent.appendChild(el);
  return el;
}
function move(parent,...nodes){nodes.flat().forEach(node=>{if(isNode(node)&&node!==parent&&node.parentElement!==parent)parent.appendChild(node);});}
function markScreen(m,name){
  [...m.classList].filter(c=>c.startsWith('g4-screen-')).forEach(c=>m.classList.remove(c));
  m.classList.add('g4-screen','g4-screen-'+name);
  m.dataset.garangPresentation='v4';
}
function chrome(){
  document.documentElement.dataset.garangPresentation='v4';
  document.body.classList.add('garang-presentation-v4');
}
function directChildren(m,deny=[]){
  const blocked=new Set(deny.filter(Boolean));
  return [...m.children].filter(node=>!blocked.has(node)&&!node.classList.contains('g4-preserve-outside'));
}
function today(m){
  const head=qs(m,':scope > .page-head');
  const flow=qs(m,'#garangTodayFlow');
  if(!flow)return false;
  const visual=qs(m,'.visual-today-hero');
  const shell=ensure('section','g4-today-shell',m,head?.nextSibling||m.firstChild);
  const support=ensure('section','g4-today-support',shell);
  move(shell,flow);
  if(visual){visual.classList.add('g4-today-visual');move(shell,visual);}
  for(const child of directChildren(m,[head,shell]))move(support,child);
  if(support.parentElement!==shell)move(shell,support);
  return true;
}
function workout(m){
  const head=qs(m,':scope > .page-head');
  const shell=ensure('section','g4-workout-shell',m,head?.nextSibling||m.firstChild);
  const preferred=[
    qs(m,'.workout-session-bar'),
    qs(m,'.workout-visual-hero'),
    qs(m,'.workout-execution-v2'),
    qs(m,'.gws-tabs'),
    qs(m,'.gws-panel[data-garang-workout-surface="exercise"]'),
    qs(m,'#workoutDraftArea')
  ].filter(Boolean);
  preferred.forEach(node=>move(shell,node));
  for(const child of directChildren(m,[head,shell]))move(shell,child);
  const rest=document.getElementById('workoutExecutionRest');
  if(rest&&app()&&!app().hidden&&screen()==='workout'){
    rest.classList.add('g4-rest-portal');
    if(rest.parentElement!==document.body)document.body.appendChild(rest);
  }
  return true;
}
function nutrition(m){
  const head=qs(m,':scope > .page-head');
  const scan=qs(m,'.meal-scan-card');
  if(!scan)return false;
  const shell=ensure('section','g4-nutrition-shell',m,head?.nextSibling||m.firstChild);
  const support=ensure('section','g4-nutrition-support',shell);
  move(shell,scan);
  for(const child of directChildren(m,[head,shell]))move(support,child);
  if(support.parentElement!==shell)move(shell,support);
  return true;
}
function body(m){
  const head=qs(m,':scope > .page-head');
  const hero=qs(m,'.body-hero');
  if(!hero)return false;
  const shell=ensure('section','g4-body-shell',m,head?.nextSibling||m.firstChild);
  move(shell,hero,qs(m,'.body-trend-card'));
  for(const child of directChildren(m,[head,shell]))move(shell,child);
  return true;
}
function coach(m){
  const shell=qs(m,'.garang-coach-v2')||qs(m,'.coach-app-shell');
  if(!shell)return false;
  shell.classList.add('g4-coach-shell');
  return true;
}
function generic(){return true;}
function cleanupRest(){
  const rest=document.getElementById('workoutExecutionRest');
  if(!rest||screen()==='workout')return;
  rest.classList.remove('g4-rest-portal');
}
function apply(){
  chrome();
  const m=main(),name=screen();
  if(!m||!name)return false;
  cleanupRest();markScreen(m,name);
  let ok=true;
  if(name==='today')ok=today(m);
  else if(name==='workout')ok=workout(m);
  else if(name==='nutrition')ok=nutrition(m);
  else if(name==='body')ok=body(m);
  else if(name==='coach')ok=coach(m);
  else ok=generic(m);
  return ok;
}
let queued=false;
function schedule(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{
    queued=false;
    apply();
    setTimeout(apply,80);
  });
}
for(const event of ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','garang:coach-mounted','garang:coach-message-rendered','garang:daily-workout-plan-ready','garang:workout-set-rows-rendered','garang:workout-session-started'])window.addEventListener(event,schedule,{passive:true});
new MutationObserver(mutations=>{
  if(mutations.some(m=>m.type==='attributes'&&m.target===document.documentElement&&m.attributeName==='lang'))schedule();
}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
document.addEventListener('DOMContentLoaded',schedule,{once:true});
schedule();
window.GarangPresentationV4=Object.freeze({version:VERSION,apply,schedule});
})();
