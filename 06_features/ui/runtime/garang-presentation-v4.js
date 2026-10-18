/* GARANG Presentation v4
   Structural adapter only. Moves canonical nodes into stable visual composition without cloning state/action owners.
*/
(() => {
'use strict';
if (window.GarangPresentationV4) return;
const VERSION='garang-presentation-v4.0.2';
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
  move(shell,flow);
  if(visual){visual.classList.add('g4-today-visual');move(shell,visual);}
  const support=ensure('section','g4-today-support',shell);
  for(const child of directChildren(m,[head,shell]))move(support,child);
  return true;
}
function workout(m){
  /* Preserve the canonical Overview/Exercise panel ownership. Presentation v4 only
     annotates real runtime owners; it never reparents Program/setup content into LIVE. */
  m.classList.add('g4-workout-shell');
  const session=qs(m,'.workout-session-bar');if(session)session.classList.add('g4-live-session');
  const hero=qs(m,'.workout-visual-hero');if(hero)hero.classList.add('g4-exercise-visual');
  const execution=qs(m,'.workout-execution-v2');if(execution)execution.classList.add('g4-execution');
  const tabs=qs(m,'.gws-tabs');if(tabs)tabs.classList.add('g4-workout-tabs');
  const overview=qs(m,'.gws-panel[data-garang-workout-surface="overview"]');if(overview)overview.classList.add('g4-workout-overview');
  const exercise=qs(m,'.gws-panel[data-garang-workout-surface="exercise"]');if(exercise)exercise.classList.add('g4-workout-exercise');
  const draft=qs(m,'#workoutDraftArea');if(draft)draft.classList.add('g4-workout-draft');
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
  move(shell,scan);
  const support=ensure('section','g4-nutrition-support',shell);
  for(const child of directChildren(m,[head,shell]))move(support,child);
  return true;
}
function ensureBodyPresentationAnatomy(hero){
  const anatomy=qs(hero,'.body-hero-anatomy');
  if(!anatomy)return false;
  if(qs(anatomy,':scope > .g4-body-anatomy-pair'))return true;
  const mini=qs(anatomy,':scope > .mini-body-svg');
  const gender=String(mini?.dataset?.gender||'male')==='female'?'female':'male';
  const label=gender==='female'?'WOMEN':'MEN';
  const wrap=document.createElement('div');
  wrap.className='muscle-map-wrap g4-body-anatomy-pair';
  wrap.dataset.garangPresentationAnatomy='v4';
  const map=document.createElement('div');
  map.className='muscle-map anatomical-pro';
  map.dataset.gender=gender;
  map.dataset.muscle='full';
  for(const side of ['front','back']){
    const view=document.createElement('div');view.className='body-view';
    const caption=document.createElement('span');caption.textContent=`${side.toUpperCase()} · ${label}`;
    const img=document.createElement('img');
    img.src=`./05_assets/body-model-v6/${gender}-${side}.svg`;
    img.alt=`${gender==='female'?'여성':'남성'} ${side==='front'?'전면':'후면'} 근육 해부 모델`;
    img.loading='eager';img.decoding='async';img.draggable=false;
    view.append(caption,img);map.appendChild(view);
  }
  wrap.appendChild(map);anatomy.appendChild(wrap);
  if(mini){mini.hidden=true;mini.dataset.garangPresentationSuperseded='v4';}
  return true;
}
function body(m){
  const head=qs(m,':scope > .page-head');
  const hero=qs(m,'.body-hero');
  if(!hero)return false;
  const shell=ensure('section','g4-body-shell',m,head?.nextSibling||m.firstChild);
  move(shell,hero,qs(m,'.body-trend-card'));
  ensureBodyPresentationAnatomy(hero);
  for(const child of directChildren(m,[head,shell]))move(shell,child);
  return true;
}
function coach(m){
  const shell=qs(m,'.garang-coach-v2')||qs(m,'.coach-app-shell');
  if(!shell)return false;
  shell.classList.add('g4-coach-shell');
  return true;
}
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
  if(name==='today')return today(m);
  if(name==='workout')return workout(m);
  if(name==='nutrition')return nutrition(m);
  if(name==='body')return body(m);
  if(name==='coach')return coach(m);
  return true;
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
