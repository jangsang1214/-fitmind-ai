/* GARANG Founder Target v5
   Structural presentation owner for the Founder 11-screen board.
   It moves only stable canonical nodes where safe and keeps dynamic write/session owners in canonical DOM.
*/
(()=>{
'use strict';
if(window.GarangFounderTargetV5)return;
const VERSION='garang-presentation-v4.5.4-founder-target';
const main=()=>document.getElementById('main');
const app=()=>document.getElementById('appView');
const qs=(root,sel)=>root?.querySelector?.(sel)||null;
const isNode=node=>node&&node.nodeType===1;
const screen=()=>String(main()?.dataset?.garangScreen||'').trim();
function move(parent,...nodes){nodes.flat().forEach(node=>{if(isNode(node)&&node!==parent&&node.parentElement!==parent)parent.appendChild(node);});}
function ensure(tag,cls,parent,before=null){let el=qs(parent,`:scope > .${cls}`);if(el)return el;el=document.createElement(tag);el.className=cls;if(before)parent.insertBefore(el,before);else parent.appendChild(el);return el;}
function imp(node,name,value){node?.style?.setProperty?.(name,value,'important');}
function reveal(node,display='block'){if(!isNode(node))return node;node.hidden=false;node.removeAttribute('aria-hidden');imp(node,'display',display);imp(node,'visibility','visible');return node;}
function hide(node){if(!isNode(node))return;imp(node,'display','none');}
function state(){try{return window.GarangRepositories?.StateRepository?.read?.()||null;}catch{return null;}}
function gender(){const value=String(state()?.profile?.gender||'male').toLowerCase();return value==='female'?'female':'male';}
function text(node){return String(node?.textContent||'').replace(/\s+/g,' ').trim();}
function chrome(){
  document.documentElement.dataset.garangPresentation='v4';
  document.body.classList.add('garang-founder-target-v5');
  const name=screen(),top=document.querySelector('.topbar'),menu=document.getElementById('menuBtn'),brand=top?.querySelector('.brand.mini'),actions=top?.querySelector('.top-actions'),settings=document.getElementById('settingsTopBtn');
  if(top){
    imp(top,'display',name==='today'?'grid':'none');imp(top,'grid-template-columns','44px minmax(0,1fr) 44px');imp(top,'align-items','center');imp(top,'min-height','56px');imp(top,'padding','7px 12px 6px');imp(top,'background','#05070a');imp(top,'border','0');
  }
  if(menu){imp(menu,'grid-column','1');imp(menu,'grid-row','1');imp(menu,'justify-self','start');imp(menu,'display','grid');}
  if(brand){imp(brand,'grid-column','2');imp(brand,'grid-row','1');imp(brand,'justify-self','center');imp(brand,'position','static');imp(brand,'left','auto');imp(brand,'transform','none');}
  if(actions){imp(actions,'grid-column','3');imp(actions,'grid-row','1');imp(actions,'display','flex');imp(actions,'justify-content','flex-end');imp(actions,'width','44px');}
  if(settings){imp(settings,'display','grid');imp(settings,'place-items','center');imp(settings,'width','40px');imp(settings,'height','40px');}
  ['syncBadge','planBadge','profileTopBtn','logoutBtn'].forEach(id=>hide(document.getElementById(id)));
  const nav=document.getElementById('bottomNav');if(nav)imp(nav,'display',name==='workout'?'none':'grid');
}
function mark(m,name){[...m.classList].filter(c=>/^g[45]-screen-/.test(c)).forEach(c=>m.classList.remove(c));m.classList.add('g5-screen',`g5-screen-${name}`);m.dataset.garangPresentation='v4';}
function dateLabel(){const d=new Date();return `${d.getMonth()+1}월 ${d.getDate()}일 (${['일','월','화','수','목','금','토'][d.getDay()]})`;}

function today(m){
  const flow=qs(m,'#garangTodayFlow');if(!flow)return false;
  reveal(flow,'block');imp(flow,'position','relative');imp(flow,'min-height','0');imp(flow,'padding','0');imp(flow,'border','0');imp(flow,'border-radius','0');imp(flow,'background','transparent');imp(flow,'box-shadow','none');imp(flow,'overflow','visible');
  const head=qs(m,':scope > .page-head');hide(head);
  const legacyVisual=qs(m,'.visual-today-hero');
  const shell=ensure('section','g4-today-shell',m,head?.nextSibling||m.firstChild);reveal(shell,'block');move(shell,flow);

  let date=qs(flow,':scope > .g5-today-date');if(!date){date=document.createElement('span');date.className='g5-today-date';flow.prepend(date);}date.textContent=dateLabel();reveal(date,'block');
  const decision=qs(flow,'.gtf-decision'),context=qs(flow,'.gtf-context');
  const copy=ensure('section','g5-today-hero-copy',flow,date.nextSibling);reveal(copy,'block');move(copy,decision,context);reveal(decision,'block');reveal(context,'block');

  let anatomy=qs(flow,':scope > .g4-today-anatomy');if(!anatomy){anatomy=document.createElement('img');anatomy.className='g4-today-anatomy';anatomy.alt='';anatomy.setAttribute('aria-hidden','true');anatomy.loading='eager';anatomy.decoding='async';anatomy.draggable=false;flow.appendChild(anatomy);}anatomy.src=`./05_assets/body-model-v6/${gender()}-front.svg`;anatomy.hidden=false;imp(anatomy,'display','block');

  const workout=ensure('section','g5-today-workout-card',flow);reveal(workout,'grid');
  const plan=qs(flow,'.gpc-today-plan')||qs(m,'.gpc-today-plan'),action=qs(flow,'.gtf-action')||qs(m,'.gtf-action');
  move(workout,plan,action);reveal(plan,'block');reveal(action,'block');
  const bodyPanel=legacyVisual?.querySelector?.('.today-body-panel')||qs(m,'.today-body-panel');hide(bodyPanel);hide(legacyVisual);
  let cardAnatomy=qs(workout,':scope > .g5-today-card-anatomy');if(!cardAnatomy){cardAnatomy=document.createElement('img');cardAnatomy.className='g5-today-card-anatomy';cardAnatomy.alt='';cardAnatomy.setAttribute('aria-hidden','true');cardAnatomy.draggable=false;workout.appendChild(cardAnatomy);}cardAnatomy.src=`./05_assets/body-model-v6/${gender()}-front.svg`;reveal(cardAnatomy,'block');imp(cardAnatomy,'grid-column','2');imp(cardAnatomy,'grid-row','1 / 3');imp(cardAnatomy,'align-self','end');imp(cardAnatomy,'justify-self','center');imp(cardAnatomy,'width','102px');imp(cardAnatomy,'height','148px');imp(cardAnatomy,'object-fit','cover');imp(cardAnatomy,'object-position','50% 5%');imp(cardAnatomy,'pointer-events','none');imp(cardAnatomy,'filter','drop-shadow(0 15px 22px rgba(0,0,0,.65))');

  const status=ensure('section','g5-today-status',flow);reveal(status,'block');const tracks=qs(flow,'.gtf-track-visual')||qs(m,'.gtf-track-visual');move(status,tracks);reveal(tracks,'grid');
  const allowed=new Set([date,copy,anatomy,workout,status]);[...flow.children].forEach(child=>{if(!allowed.has(child))hide(child);});

  const support=ensure('section','g5-today-support',shell);reveal(support,'grid');[...m.children].forEach(child=>{if(child!==head&&child!==shell)move(support,child);});
  return true;
}

function workoutTitle(m){const candidates=[qs(m,'.workout-visual-hero h1'),qs(m,'.workout-visual-hero h2'),qs(m,'.workout-visual-hero strong'),qs(m,'.workout-execution-v2 h2'),qs(m,'.gws-panel[data-garang-workout-surface="exercise"] h2')];return candidates.map(text).find(Boolean)||'벤치프레스';}
function currentSetLabel(m){const current=qs(m,'#workoutSetDetails .execution-set-row.current-set');const all=m.querySelectorAll?.('#workoutSetDetails .execution-set-row')||[];if(!current||!all.length)return {index:1,total:Math.max(1,all.length||4)};return {index:[...all].indexOf(current)+1,total:all.length};}
function decorateRest(rest,m){
  if(!rest)return;
  reveal(document.getElementById('addWorkoutRest30'),'inline-flex');reveal(document.getElementById('skipWorkoutRest'),'inline-flex');
  let card=qs(rest,':scope > .g5-rest-next-card');if(!card){card=document.createElement('section');card.className='g5-rest-next-card';rest.appendChild(card);}
  const set=currentSetLabel(m),row=qs(m,'#workoutSetDetails .execution-set-row.current-set');card.innerHTML=`<span>다음 세트</span><strong>${set.index} / ${set.total} · ${text(row).slice(0,65)||'목표 중량과 반복을 유지하세요'}</strong>`;reveal(card,'grid');imp(card,'width','100%');imp(card,'max-width','340px');imp(card,'margin','18px 0 0');imp(card,'padding','14px');imp(card,'border','1px solid rgba(255,255,255,.075)');imp(card,'border-radius','14px');imp(card,'background','#0b1016');imp(card,'gap','5px');
}
function summaryMode(m,result){
  if(!result)return false;m.classList.add('g5-workout-summary-mode');window.scrollTo?.(0,0);
  const head=qs(m,':scope > .g5-summary-heading')||document.createElement('section');if(!head.classList.contains('g5-summary-heading')){head.className='g5-summary-heading';m.prepend(head);}head.innerHTML='<strong>운동 완료 🎉</strong><span>오늘의 결과와 다음 행동</span>';reveal(head,'grid');imp(head,'gap','4px');imp(head,'margin','4px 0 12px');imp(head.querySelector('strong'),'font-size','24px');imp(head.querySelector('span'),'font-size','10px');imp(head.querySelector('span'),'color','#858e9c');
  [...m.children].forEach(child=>{if(child!==head&&!child.contains(result)&&child!==result)hide(child);});
  reveal(result,'block');imp(result,'margin','0');imp(result,'border','0');imp(result,'background','transparent');imp(result,'box-shadow','none');
  let img=qs(result,':scope > .g5-summary-anatomy');if(!img){img=document.createElement('img');img.className='g5-summary-anatomy';img.alt='';img.setAttribute('aria-hidden','true');result.appendChild(img);}img.src=`./05_assets/body-model-v6/${gender()}-front.svg`;reveal(img,'block');imp(img,'width','118px');imp(img,'height','150px');imp(img,'object-fit','cover');imp(img,'object-position','50% 7%');imp(img,'margin','14px auto 0');imp(img,'pointer-events','none');
  return true;
}
function workout(m){
  m.classList.add('g4-workout-shell');const result=qs(m,'.workout-result-card');if(result&&getComputedStyle(result).display!=='none')return summaryMode(m,result);
  const head=qs(m,':scope > .page-head');hide(head);
  const header=ensure('div','g5-workout-header',m,head?.nextSibling||m.firstChild);reveal(header,'grid');if(!header.dataset.ready){header.dataset.ready='1';header.innerHTML='<button type="button" aria-label="뒤로">‹</button><b>운동 세션</b><button type="button" class="g5-workout-end">종료</button>';header.querySelector('.g5-workout-end')?.addEventListener('click',()=>{const end=document.querySelector('#endWorkoutSession,[data-action="end-workout-session"]');end?.click?.();});}
  let title=qs(m,':scope > .g5-workout-title');if(!title){title=document.createElement('h1');title.className='g5-workout-title';header.insertAdjacentElement('afterend',title);}title.textContent=workoutTitle(m);reveal(title,'block');
  const session=qs(m,'.workout-session-bar');if(session)session.classList.add('g4-live-session');const live=!!session?.classList.contains('is-live');
  if(live&&m.dataset.g5LiveTop!=='1'){m.dataset.g5LiveTop='1';requestAnimationFrame(()=>{window.scrollTo?.(0,0);try{m.scrollTop=0;}catch{}});}
  if(session&&live){imp(session,'min-height','40px');imp(session,'padding','6px 10px');imp(session,'margin','0 0 8px');session.querySelectorAll('p,small,.workout-session-help').forEach(hide);const timer=qs(session,'.workout-session-live strong');if(timer)imp(timer,'font-size','15px');}

  const exercise=qs(m,'.gws-panel[data-garang-workout-surface="exercise"]');if(exercise)exercise.classList.add('g4-workout-exercise');const execution=qs(m,'.workout-execution-v2');if(execution)execution.classList.add('g4-execution');const executionHost=execution?.parentElement||exercise||m;
  let media=qs(executionHost,':scope > .g5-workout-media');if(!media){media=document.createElement('section');media.className='g5-workout-media';executionHost.insertBefore(media,execution||executionHost.firstChild);}reveal(media,live?'block':'none');
  const hero=qs(m,'.workout-visual-hero');if(hero)hero.classList.add('g4-exercise-visual');
  let progress=qs(executionHost,':scope > .g5-set-progress');if(!progress){progress=document.createElement('div');progress.className='g5-set-progress';executionHost.insertBefore(progress,execution||null);}const set=currentSetLabel(m);progress.innerHTML=`<span>←</span><b>세트 <strong>${set.index} / ${set.total}</strong></b><span>→</span>`;reveal(progress,live?'flex':'none');

  const tabs=qs(m,'.gws-tabs');if(tabs){tabs.classList.add('g4-workout-tabs');imp(tabs,'display',live?'none':'grid');}const overview=qs(m,'.gws-panel[data-garang-workout-surface="overview"]');if(overview){overview.classList.add('g4-workout-overview');if(live)hide(overview);else overview.style.removeProperty('display');}const draft=qs(m,'#workoutDraftArea');if(draft){draft.classList.add('g4-workout-draft');if(live)hide(draft);else draft.style.removeProperty('display');}
  if(live){['.execution-sets-field','.execution-duration-field','[data-workout-setup]','.gws-reuse','#workoutSessionFeedback'].forEach(sel=>m.querySelectorAll(sel).forEach(hide));}
  let next=qs(executionHost,':scope > .g5-next-set');if(!next){next=document.createElement('div');next.className='g5-next-set';executionHost.appendChild(next);}const nextRow=qs(m,'#workoutSetDetails .execution-set-row.current-set + .execution-set-row');next.textContent=nextRow?`다음 세트 · ${text(nextRow).slice(0,80)}`:'다음 세트 · 현재 목표를 유지하세요';reveal(next,live?'block':'none');

  const rest=document.getElementById('workoutExecutionRest');if(rest&&app()&&!app().hidden&&screen()==='workout'){rest.classList.add('g4-rest-portal');if(rest.parentElement!==document.body)document.body.appendChild(rest);if(!rest.hidden)decorateRest(rest,m);}
  return true;
}

function nutrition(m){const scan=qs(m,'.meal-scan-card');if(!scan)return true;const head=qs(m,':scope > .page-head');const shell=ensure('section','g4-nutrition-shell',m,head?.nextSibling||m.firstChild);move(shell,scan);return true;}
function ensureBodyPair(hero){const anatomy=qs(hero,'.body-hero-anatomy');if(!anatomy)return false;let pair=qs(anatomy,':scope > .g4-body-anatomy-pair');if(!pair){pair=document.createElement('div');pair.className='g4-body-anatomy-pair';for(const side of ['front','back']){const img=document.createElement('img');img.src=`./05_assets/body-model-v6/${gender()}-${side}.svg`;img.alt='';img.setAttribute('aria-hidden','true');img.draggable=false;pair.appendChild(img);}anatomy.appendChild(pair);}[...anatomy.children].forEach(child=>{if(child!==pair){child.hidden=true;child.setAttribute('aria-hidden','true');imp(child,'display','none');}});imp(pair,'display','grid');imp(pair,'grid-template-columns','1fr 1fr');imp(pair,'gap','6px');[...pair.children].forEach(img=>{img.style.width='100%';img.style.height='auto';});return true;}
function body(m){const hero=qs(m,'.body-hero');if(!hero)return true;const head=qs(m,':scope > .page-head');const shell=ensure('section','g4-body-shell',m,head?.nextSibling||m.firstChild);move(shell,hero,qs(m,'.body-trend-card'));ensureBodyPair(hero);const metrics=qs(hero,'.body-hero-metrics');if(metrics)[...metrics.children].forEach((child,index)=>{child.hidden=index>=3;imp(child,'display',index<3?'grid':'none');});return true;}
function coach(m){const shell=qs(m,'.garang-coach-v2')||qs(m,'.coach-app-shell');if(shell)shell.classList.add('g4-coach-shell');return true;}
function cleanupRest(){const rest=document.getElementById('workoutExecutionRest');if(!rest||screen()==='workout')return;rest.classList.remove('g4-rest-portal');}
function apply(){const m=main(),name=screen();if(!m||!name)return false;mark(m,name);chrome();cleanupRest();if(name==='today')return today(m);if(name==='workout')return workout(m);if(name==='nutrition')return nutrition(m);if(name==='body')return body(m);if(name==='coach')return coach(m);return true;}
let queued=false,timer=0;function schedule(){if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;apply();});}clearTimeout(timer);timer=setTimeout(apply,180);}
for(const event of ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','pageshow'])window.addEventListener(event,schedule);document.addEventListener('DOMContentLoaded',schedule,{once:true});schedule();
const api=Object.freeze({version:VERSION,apply,schedule});window.GarangFounderTargetV5=api;window.GarangPresentationV4=api;
})();
