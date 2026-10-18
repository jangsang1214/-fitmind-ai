/* GARANG Presentation v4
   Structural adapter only. Moves canonical nodes into stable visual composition without cloning state/action owners.
*/
(() => {
'use strict';
if (window.GarangPresentationV4) return;
const VERSION='garang-presentation-v4.0.3';
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
function important(el,name,value){el?.style?.setProperty?.(name,value,'important');}
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
function inferGender(root){
  const node=qs(root,'[data-gender],[data-garang-gender]');
  const value=String(node?.dataset?.gender||node?.dataset?.garangGender||'').toLowerCase();
  if(value==='female')return 'female';
  if(/WOMEN|여성/.test(String(root?.textContent||'')))return 'female';
  return 'male';
}
function ensureTodayPresentationAnatomy(flow,visual){
  let img=qs(flow,':scope > .g4-today-anatomy');
  const gender=inferGender(visual||flow);
  if(!img){
    img=document.createElement('img');img.className='g4-today-anatomy';img.alt='';img.setAttribute('aria-hidden','true');img.draggable=false;img.loading='eager';img.decoding='async';flow.appendChild(img);
  }
  img.src=`./05_assets/body-model-v6/${gender}-front.svg`;
  important(img,'position','absolute');important(img,'right','-12px');important(img,'top','20px');important(img,'width','48%');important(img,'height','224px');important(img,'object-fit','contain');important(img,'object-position','center top');important(img,'opacity','.86');important(img,'z-index','0');important(img,'pointer-events','none');important(img,'filter','drop-shadow(0 24px 30px rgba(0,0,0,.58)) saturate(.88) contrast(1.06)');
  important(img,'-webkit-mask-image','linear-gradient(to bottom,#000 0%,#000 76%,transparent 100%)');important(img,'mask-image','linear-gradient(to bottom,#000 0%,#000 76%,transparent 100%)');
  const title=qs(flow,'.gtf-decision h2'),copy=qs(flow,'.gtf-decision p'),context=qs(flow,'.gtf-context');
  important(title,'max-width','58%');important(copy,'max-width','58%');important(context,'max-width','60%');
}
function today(m){
  const head=qs(m,':scope > .page-head');
  const flow=qs(m,'#garangTodayFlow');
  if(!flow)return false;
  const visual=qs(m,'.visual-today-hero');
  const shell=ensure('section','g4-today-shell',m,head?.nextSibling||m.firstChild);
  move(shell,flow);
  if(visual){visual.classList.add('g4-today-visual');move(shell,visual);}
  ensureTodayPresentationAnatomy(flow,visual);
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
  let pair=qs(anatomy,':scope > .g4-body-anatomy-pair');
  const gender=inferGender(anatomy);
  if(!pair){
    pair=document.createElement('div');pair.className='muscle-map-wrap g4-body-anatomy-pair';pair.dataset.garangPresentationAnatomy='v4';
    const map=document.createElement('div');map.className='muscle-map anatomical-pro';map.dataset.gender=gender;map.dataset.muscle='full';
    for(const side of ['front','back']){
      const view=document.createElement('div');view.className='body-view';
      const caption=document.createElement('span');caption.textContent=`${side.toUpperCase()} · ${gender==='female'?'WOMEN':'MEN'}`;
      const img=document.createElement('img');img.src=`./05_assets/body-model-v6/${gender}-${side}.svg`;img.alt=`${gender==='female'?'여성':'남성'} ${side==='front'?'전면':'후면'} 근육 해부 모델`;img.loading='eager';img.decoding='async';img.draggable=false;
      view.append(caption,img);map.appendChild(view);
    }
    pair.appendChild(map);anatomy.appendChild(pair);
  }
  /* Body hero's legacy mini/runtime renderers are decorative, not interaction owners.
     Re-hide them on every apply because older visual runtimes may remount after v4. */
  [...anatomy.children].forEach(child=>{
    if(child===pair)return;
    child.hidden=true;child.setAttribute('aria-hidden','true');child.dataset.garangPresentationSuperseded='v4';important(child,'display','none');
  });
  important(pair,'display','flex');important(pair,'width','100%');important(pair,'min-height','420px');

  const visual=qs(hero,'.body-hero-visual'),metrics=qs(hero,'.body-hero-metrics');
  const latest=visual?[...visual.children].find(child=>child!==anatomy):null;
  if(latest&&metrics){
    latest.classList.add('g4-body-weight-metric');
    metrics.prepend(latest);
  }
  if(metrics){
    metrics.classList.add('g4-body-metrics');important(metrics,'grid-template-columns','repeat(3,minmax(0,1fr))');important(metrics,'gap','7px');
    [...metrics.children].forEach((child,index)=>{child.hidden=index>=3;important(child,'display',index<3?'grid':'none');if(index<3){important(child,'min-height','68px');important(child,'place-items','center');important(child,'text-align','center');}});
  }
  if(latest){
    const eyebrow=qs(latest,'.eyebrow'),small=qs(latest,'small'),strong=qs(latest,'strong');
    if(eyebrow)eyebrow.textContent='체중';if(small)small.hidden=true;
    important(latest,'padding','10px 6px');important(latest,'background','rgba(15,20,29,.94)');important(latest,'border','1px solid rgba(255,255,255,.07)');important(latest,'border-radius','14px');
    important(strong,'font-size','18px');important(strong,'line-height','1.2');
  }
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
