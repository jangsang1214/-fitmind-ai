/* GARANG Founder Target v5
   Structural presentation owner for the Founder 11-screen board.
   It moves existing canonical state/action nodes; it does not clone write owners.
*/
(()=>{
'use strict';
if(window.GarangFounderTargetV5)return;
const VERSION='garang-presentation-v4.5.2-founder-target';
const main=()=>document.getElementById('main');
const app=()=>document.getElementById('appView');
const qs=(root,sel)=>root?.querySelector?.(sel)||null;
const isNode=node=>node&&node.nodeType===1;
const screen=()=>String(main()?.dataset?.garangScreen||'').trim();
function move(parent,...nodes){nodes.flat().forEach(node=>{if(isNode(node)&&node!==parent&&node.parentElement!==parent)parent.appendChild(node);});}
function ensure(tag,cls,parent,before=null){let el=qs(parent,`:scope > .${cls}`);if(el)return el;el=document.createElement(tag);el.className=cls;if(before)parent.insertBefore(el,before);else parent.appendChild(el);return el;}
function reveal(node,display='block'){if(!isNode(node))return node;node.hidden=false;node.removeAttribute('aria-hidden');node.style.setProperty('display',display,'important');node.style.setProperty('visibility','visible','important');return node;}
function state(){try{return window.GarangRepositories?.StateRepository?.read?.()||null;}catch{return null;}}
function gender(){const value=String(state()?.profile?.gender||'male').toLowerCase();return value==='female'?'female':'male';}
function chrome(){document.documentElement.dataset.garangPresentation='v4';document.body.classList.add('garang-founder-target-v5');}
function mark(m,name){[...m.classList].filter(c=>/^g[45]-screen-/.test(c)).forEach(c=>m.classList.remove(c));m.classList.add('g5-screen',`g5-screen-${name}`);m.dataset.garangPresentation='v4';}
function dateLabel(){const d=new Date();return `${d.getMonth()+1}월 ${d.getDate()}일 (${['일','월','화','수','목','금','토'][d.getDay()]})`;}
function text(node){return String(node?.textContent||'').replace(/\s+/g,' ').trim();}

function today(m){
  const flow=qs(m,'#garangTodayFlow');
  if(!flow)return false;
  reveal(flow,'block');
  const head=qs(m,':scope > .page-head');
  const legacyVisual=qs(m,'.visual-today-hero');
  const shell=ensure('section','g4-today-shell',m,head?.nextSibling||m.firstChild);
  reveal(shell,'block');
  move(shell,flow);
  let date=qs(flow,':scope > .g5-today-date');
  if(!date){date=document.createElement('span');date.className='g5-today-date';flow.prepend(date);}
  date.textContent=dateLabel();reveal(date,'block');

  const decision=qs(flow,'.gtf-decision');
  const context=qs(flow,'.gtf-context');
  const copy=ensure('section','g5-today-hero-copy',flow,date.nextSibling);
  reveal(copy,'block');move(copy,decision,context);reveal(decision,'block');reveal(context,'block');

  let anatomy=qs(flow,':scope > .g4-today-anatomy');
  if(!anatomy){anatomy=document.createElement('img');anatomy.className='g4-today-anatomy';anatomy.alt='';anatomy.setAttribute('aria-hidden','true');anatomy.loading='eager';anatomy.decoding='async';anatomy.draggable=false;flow.appendChild(anatomy);}
  anatomy.src=`./05_assets/body-model-v6/${gender()}-front.svg`;
  anatomy.hidden=false;anatomy.style.setProperty('display','block','important');

  const workout=ensure('section','g5-today-workout-card',flow);reveal(workout,'grid');
  const plan=qs(flow,'.gpc-today-plan')||qs(m,'.gpc-today-plan');
  const action=qs(flow,'.gtf-action')||qs(m,'.gtf-action');
  const bodyPanel=legacyVisual?.querySelector?.('.today-body-panel')||qs(m,'.today-body-panel');
  move(workout,plan,bodyPanel,action);reveal(plan,'block');reveal(bodyPanel,'grid');reveal(action,'block');

  const status=ensure('section','g5-today-status',flow);reveal(status,'block');
  const tracks=qs(flow,'.gtf-track-visual')||qs(m,'.gtf-track-visual');
  move(status,tracks);reveal(tracks,'grid');

  const support=ensure('section','g5-today-support',shell);reveal(support,'grid');
  [...m.children].forEach(child=>{if(child!==head&&child!==shell)move(support,child);});
  if(legacyVisual&&legacyVisual!==bodyPanel)legacyVisual.classList.add('g4-today-visual');
  return true;
}

function workoutTitle(m){
  const candidates=[qs(m,'.workout-visual-hero h1'),qs(m,'.workout-visual-hero h2'),qs(m,'.workout-visual-hero strong'),qs(m,'.workout-execution-v2 h2'),qs(m,'.gws-panel[data-garang-workout-surface="exercise"] h2')];
  const found=candidates.map(text).find(Boolean);return found||'운동 세션';
}
function currentSetLabel(m){const current=qs(m,'#workoutSetDetails .execution-set-row.current-set');const all=m.querySelectorAll?.('#workoutSetDetails .execution-set-row')||[];if(!current||!all.length)return {index:1,total:Math.max(1,all.length||4)};return {index:[...all].indexOf(current)+1,total:all.length};}
function workout(m){
  m.classList.add('g4-workout-shell');
  const head=qs(m,':scope > .page-head');
  const header=ensure('div','g5-workout-header',m,head?.nextSibling||m.firstChild);
  if(!header.dataset.ready){header.dataset.ready='1';header.innerHTML='<button type="button" aria-label="뒤로">‹</button><b>운동 세션</b><button type="button" class="g5-workout-end">종료</button>';header.querySelector('.g5-workout-end')?.addEventListener('click',()=>{const end=document.querySelector('#endWorkoutSession,[data-action="end-workout-session"]');end?.click?.();});}
  let title=qs(m,':scope > .g5-workout-title');if(!title){title=document.createElement('h1');title.className='g5-workout-title';header.insertAdjacentElement('afterend',title);}title.textContent=workoutTitle(m);
  const session=qs(m,'.workout-session-bar');if(session){session.classList.add('g4-live-session');title.insertAdjacentElement('afterend',session);}
  const live=!!session?.classList.contains('is-live');
  const media=ensure('section','g5-workout-media',m,session?.nextSibling||title.nextSibling);
  const hero=qs(m,'.workout-visual-hero');if(hero){hero.classList.add('g4-exercise-visual');move(media,hero);}
  let progress=qs(m,':scope > .g5-set-progress');if(!progress){progress=document.createElement('div');progress.className='g5-set-progress';media.insertAdjacentElement('afterend',progress);}const set=currentSetLabel(m);progress.innerHTML=`<span>←</span><b>세트 <strong>${set.index} / ${set.total}</strong></b><span>→</span>`;
  const execution=qs(m,'.workout-execution-v2');if(execution){execution.classList.add('g4-execution');progress.insertAdjacentElement('afterend',execution);}
  const tabs=qs(m,'.gws-tabs');if(tabs){tabs.classList.add('g4-workout-tabs');tabs.style.setProperty('display',live?'none':'grid','important');}
  const overview=qs(m,'.gws-panel[data-garang-workout-surface="overview"]');if(overview){overview.classList.add('g4-workout-overview');if(live)overview.style.setProperty('display','none','important');else overview.style.removeProperty('display');}
  const exercise=qs(m,'.gws-panel[data-garang-workout-surface="exercise"]');if(exercise)exercise.classList.add('g4-workout-exercise');
  const draft=qs(m,'#workoutDraftArea');if(draft){draft.classList.add('g4-workout-draft');if(live)draft.style.setProperty('display','none','important');else draft.style.removeProperty('display');}
  media.style.setProperty('display',live?'block':'none','important');progress.style.setProperty('display',live?'flex':'none','important');
  let next=qs(m,':scope > .g5-next-set');if(!next){next=document.createElement('div');next.className='g5-next-set';m.appendChild(next);}const nextRow=qs(m,'#workoutSetDetails .execution-set-row.current-set + .execution-set-row');next.textContent=nextRow?`다음 세트 · ${text(nextRow).slice(0,80)}`:'다음 세트 · 현재 목표를 유지하세요';next.style.setProperty('display',live?'block':'none','important');
  const rest=document.getElementById('workoutExecutionRest');if(rest&&app()&&!app().hidden&&screen()==='workout'){rest.classList.add('g4-rest-portal');if(rest.parentElement!==document.body)document.body.appendChild(rest);}
  return true;
}

function nutrition(m){const scan=qs(m,'.meal-scan-card');if(!scan)return true;const head=qs(m,':scope > .page-head');const shell=ensure('section','g4-nutrition-shell',m,head?.nextSibling||m.firstChild);move(shell,scan);return true;}
function ensureBodyPair(hero){
  const anatomy=qs(hero,'.body-hero-anatomy');if(!anatomy)return false;let pair=qs(anatomy,':scope > .g4-body-anatomy-pair');
  if(!pair){pair=document.createElement('div');pair.className='g4-body-anatomy-pair';for(const side of ['front','back']){const img=document.createElement('img');img.src=`./05_assets/body-model-v6/${gender()}-${side}.svg`;img.alt='';img.setAttribute('aria-hidden','true');img.draggable=false;pair.appendChild(img);}anatomy.appendChild(pair);}
  [...anatomy.children].forEach(child=>{if(child!==pair){child.hidden=true;child.setAttribute('aria-hidden','true');child.style.setProperty('display','none','important');}});
  pair.style.setProperty('display','grid','important');pair.style.setProperty('grid-template-columns','1fr 1fr','important');pair.style.setProperty('gap','6px','important');[...pair.children].forEach(img=>{img.style.width='100%';img.style.height='auto';});return true;
}
function body(m){
  const hero=qs(m,'.body-hero');if(!hero)return true;const head=qs(m,':scope > .page-head');const shell=ensure('section','g4-body-shell',m,head?.nextSibling||m.firstChild);move(shell,hero,qs(m,'.body-trend-card'));ensureBodyPair(hero);
  const metrics=qs(hero,'.body-hero-metrics');if(metrics)[...metrics.children].forEach((child,index)=>{child.hidden=index>=3;child.style.setProperty('display',index<3?'grid':'none','important');});
  return true;
}
function coach(m){const shell=qs(m,'.garang-coach-v2')||qs(m,'.coach-app-shell');if(shell)shell.classList.add('g4-coach-shell');return true;}
function cleanupRest(){const rest=document.getElementById('workoutExecutionRest');if(!rest||screen()==='workout')return;rest.classList.remove('g4-rest-portal');}
function apply(){chrome();const m=main(),name=screen();if(!m||!name)return false;cleanupRest();mark(m,name);if(name==='today')return today(m);if(name==='workout')return workout(m);if(name==='nutrition')return nutrition(m);if(name==='body')return body(m);if(name==='coach')return coach(m);return true;}
let queued=false,timer=0;
function schedule(){if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;apply();});}clearTimeout(timer);timer=setTimeout(apply,180);}
for(const event of ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','pageshow'])window.addEventListener(event,schedule);
document.addEventListener('DOMContentLoaded',schedule,{once:true});schedule();
const api=Object.freeze({version:VERSION,apply,schedule});window.GarangFounderTargetV5=api;window.GarangPresentationV4=api;
})();
