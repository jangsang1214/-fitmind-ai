/* GARANG Reference UI v2
   Presentation-only structural rebuild from the Founder-approved UI/UX v2 reference.
   Keeps canonical state, mutation, routing and intelligence owners intact.
*/
(() => {
'use strict';
if (window.GarangReferenceUIV2) return;
const VERSION='garang-reference-ui-v2.0.0';
const main=()=>document.getElementById('main');
const app=()=>document.getElementById('appView');
const qs=(root,sel)=>root?.querySelector?.(sel)||null;
const isNode=n=>n&&n.nodeType===1;
const isEnglish=()=>document.documentElement.lang==='en';
const copy=(ko,en)=>isEnglish()?en:ko;

function node(tag,cls,html=''){
  const el=document.createElement(tag);if(cls)el.className=cls;if(html)el.innerHTML=html;return el;
}
function ensureInteractionGuards(){
  if(document.getElementById('garangReferenceUIV2Guards'))return;
  const style=document.createElement('style');style.id='garangReferenceUIV2Guards';style.textContent=`
.g-ref-body-primary .g3-anatomy-legend,.g-ref-body-primary .g3-anatomy-legend *{pointer-events:none!important}
.g-ref-body-primary .g3-view-switch{position:relative!important;z-index:24!important;pointer-events:auto!important;scroll-margin-top:104px!important}
.g-ref-body-primary .g3-view-switch button{position:relative!important;z-index:25!important;pointer-events:auto!important;min-height:44px!important}
.g-ref-today-stage .visual-today-hero .today-decision-panel[hidden]{display:none!important}
`;
  document.head.appendChild(style);
}
function screenName(){return String(main()?.dataset?.garangScreen||'').trim();}
function setScreenClass(m,screen){
  if(m.dataset.garangReferenceScreen!==screen){
    delete m.dataset.garangReferenceUi;
    m.dataset.garangReferenceScreen=screen;
  }
  for(const c of [...m.classList])if(c.startsWith('g-ref-screen-'))m.classList.remove(c);
  m.classList.add('g-ref-screen','g-ref-screen-'+screen);
}
function ensureIntro(m){
  let intro=qs(m,':scope > .g-ref-screen-intro');
  if(intro)return intro;
  intro=node('section','g-ref-screen-intro');
  const head=qs(m,':scope > .page-head')||qs(m,'.page-head');
  if(head?.nextSibling)m.insertBefore(intro,head.nextSibling);else m.prepend(intro);
  return intro;
}
function dayLabel(d){
  const ko=['일','월','화','수','목','금','토'],en=['SUN','MON','TUE','WED','THU','FRI','SAT'];
  return (isEnglish()?en:ko)[d.getDay()];
}
function todayStrip(){
  const now=new Date(),cells=[];
  for(let offset=-3;offset<=3;offset++){
    const d=new Date(now);d.setDate(now.getDate()+offset);
    cells.push(`<span class="${offset===0?'is-today':''}"><small>${dayLabel(d)}</small><b>${d.getDate()}</b></span>`);
  }
  return `<div class="g-ref-date-copy"><strong>${copy('안녕하세요!','Hello!')}</strong><span>${copy('오늘도 좋은 하루예요.','Here is what matters today.')}</span></div><div class="g-ref-date-strip">${cells.join('')}</div>`;
}
function ensureStage(m,cls,after){
  let stage=qs(m,':scope > .'+cls);if(stage)return stage;
  stage=node('section',cls);
  if(after?.nextSibling)m.insertBefore(stage,after.nextSibling);else if(after)m.appendChild(stage);else m.prepend(stage);
  return stage;
}
function move(stage,...items){for(const item of items.flat()){if(isNode(item)&&item!==stage&&!stage.contains(item))stage.appendChild(item);}}
function directRemainder(m,excluded=[]){const deny=new Set(excluded.filter(Boolean));return [...m.children].filter(x=>!deny.has(x)&&!x.classList.contains('g-ref-screen-intro')&&!x.className.includes('g-ref-'))}

function decorateToday(m){
  const head=qs(m,':scope > .page-head')||qs(m,'.page-head');
  const intro=ensureIntro(m);intro.innerHTML=todayStrip();
  const flow=qs(m,'#garangTodayFlow'),hero=qs(m,'.visual-today-hero');
  const stage=ensureStage(m,'g-ref-today-stage',intro);move(stage,flow,hero);
  if(flow)flow.classList.add('g-ref-primary-decision');
  if(hero){
    hero.classList.add('g-ref-today-body-card');
    const legacy=qs(hero,'.today-decision-panel');
    if(legacy){legacy.hidden=!!flow;legacy.setAttribute('aria-hidden',flow?'true':'false');}
  }
  const support=ensureStage(m,'g-ref-today-support',stage);
  for(const child of directRemainder(m,[head,intro,stage,support]))move(support,child);
}
function cleanupWorkoutRestPortal(){
  const rest=document.getElementById('workoutExecutionRest');
  if(!rest||rest.dataset.garangReferenceRestPortal!=='v2')return false;
  if(screenName()==='workout'&&!app()?.hidden)return false;
  rest.remove();
  return true;
}
function pinWorkoutRest(rest){
  if(!rest)return;
  if(screenName()==='workout'&&!app()?.hidden&&rest.parentElement!==document.body){
    rest.dataset.garangReferenceRestPortal='v2';
    rest.classList.add('g-ref-workout-rest-portal');
    document.body.appendChild(rest);
  }
  const set=(name,value)=>rest.style.setProperty(name,value,'important');
  set('position','fixed');set('left','50%');set('right','auto');set('top','auto');
  set('bottom','calc(84px + env(safe-area-inset-bottom, 0px))');set('transform','translateX(-50%)');
  set('width','calc(100vw - 24px)');set('max-width','430px');set('min-width','0');set('box-sizing','border-box');
  set('margin','0');set('z-index','125');
}
function settleWorkoutRest(){
  if(screenName()!=='workout')return false;
  const rest=document.getElementById('workoutExecutionRest');
  if(!rest||rest.hidden||!rest.classList.contains('active'))return false;
  pinWorkoutRest(rest);
  const nav=document.getElementById('bottomNav'),r=rest.getBoundingClientRect(),n=nav?.getBoundingClientRect?.();
  if(n&&r.bottom>n.top-10){
    const lift=Math.ceil(r.bottom-(n.top-10));
    rest.style.setProperty('transform',`translate(-50%, -${lift}px)`,'important');
  }
  return true;
}
function decorateWorkout(m){
  const head=qs(m,':scope > .page-head')||qs(m,'.page-head');
  const intro=ensureIntro(m);intro.innerHTML=`<div class="g-ref-workout-title"><span>WORKOUT</span><strong>${copy('바로 실행하고, 짧게 기록','Start immediately. Log only what matters.')}</strong></div>`;
  const execution=qs(m,'.workout-execution-v2'),hero=qs(m,'.workout-visual-hero'),tabs=qs(m,'.gws-tabs');
  if(execution)execution.classList.add('g-ref-workout-execution');
  if(hero)hero.classList.add('g-ref-workout-hero');
  if(tabs)tabs.classList.add('g-ref-workout-tabs');
  const panel=qs(m,'.gws-panel[data-garang-workout-surface="exercise"]');if(panel)panel.classList.add('g-ref-workout-panel');
  const overview=qs(m,'.gws-panel[data-garang-workout-surface="overview"]');if(overview)overview.classList.add('g-ref-workout-overview');
  pinWorkoutRest(document.getElementById('workoutExecutionRest'));
  if(head)head.classList.add('g-ref-original-head');
}
function decorateNutrition(m){
  const head=qs(m,':scope > .page-head')||qs(m,'.page-head');
  const intro=ensureIntro(m);intro.innerHTML=`<div class="g-ref-section-copy"><span>NUTRITION</span><strong>${copy('찍기만 하면 분석하고, 다음 식사까지 연결','Scan it. GARANG interprets it and guides the next meal.')}</strong></div>`;
  const scan=qs(m,'.meal-scan-card');
  const stage=ensureStage(m,'g-ref-nutrition-stage',intro);move(stage,scan);
  if(scan)scan.classList.add('g-ref-meal-scan-primary');
  const summary=qs(m,'.nutrition-detail-summary'),adaptive=qs(m,'.adaptive-nutrition-card');
  const status=ensureStage(m,'g-ref-nutrition-status',stage);move(status,summary,adaptive);
  const support=ensureStage(m,'g-ref-nutrition-support',status);
  for(const child of directRemainder(m,[head,intro,stage,status,support]))move(support,child);
}
function ensureBodyModelSource(hero){
  const visual=qs(hero,'.body-hero-anatomy');if(!visual)return null;
  let wrap=qs(visual,'.muscle-map-wrap');if(wrap)return wrap;
  const female=/\bWOMEN\b/.test(hero?.textContent||'');
  const gender=female?'female':'male',label=female?'WOMEN':'MEN';
  wrap=node('div','muscle-map-wrap g-ref-body-model-source');
  wrap.innerHTML=`<div class="muscle-map anatomical-pro" id="bodyHeroMuscleMap" data-muscle="full" data-gender="${gender}"><div class="body-view"><span>FRONT · ${label}</span></div><div class="body-view"><span>BACK · ${label}</span></div></div>`;
  visual.replaceChildren(wrap);
  return wrap;
}
function decorateBody(m){
  const head=qs(m,':scope > .page-head')||qs(m,'.page-head');
  const intro=ensureIntro(m);intro.innerHTML=`<div class="g-ref-section-copy"><span>BODY</span><strong>${copy('내 몸을 더 직관적이고, 입체적으로 이해','Understand your body clearly, in three dimensions.')}</strong></div>`;
  const hero=qs(m,'.body-hero'),trend=qs(m,'.body-trend-card');
  const stage=ensureStage(m,'g-ref-body-stage',intro);move(stage,hero,trend);
  if(hero)hero.classList.add('g-ref-body-primary');
  if(trend)trend.classList.add('g-ref-body-trend');
  ensureBodyModelSource(hero);
  const support=ensureStage(m,'g-ref-body-support',stage);
  for(const child of directRemainder(m,[head,intro,stage,support]))move(support,child);
}
function decorateCoach(m){
  const shell=qs(m,'.garang-coach-v2')||qs(m,'.coach-app-shell');if(!shell)return false;
  shell.classList.add('g-ref-coach-shell');
  const status=qs(shell,'.coach-status-card');if(status)status.classList.add('g-ref-coach-status');
  const thread=qs(shell,'.g2-chat-scroll')||qs(shell,'.coach-thread');if(thread)thread.classList.add('g-ref-coach-thread');
  const composer=qs(shell,'.g2-composer-wrap')||qs(shell,'.coach-bottom-stack');if(composer)composer.classList.add('g-ref-coach-composer');
  return true;
}
function decorateProgress(m){
  const head=qs(m,':scope > .page-head')||qs(m,'.page-head');if(head)head.classList.add('g-ref-progress-head');
}
function decorateAuth(){
  const view=document.getElementById('authView');if(view)view.classList.add('g-ref-auth');
}
function decorateChrome(){
  ensureInteractionGuards();document.documentElement.dataset.garangReferenceUi='v2';document.body.classList.add('garang-reference-ui-v2');
  app()?.classList.add('g-ref-app');document.querySelector('.topbar')?.classList.add('g-ref-topbar');document.getElementById('bottomNav')?.classList.add('g-ref-bottom-nav');
  decorateAuth();
}
function apply(){
  decorateChrome();const m=main(),screen=screenName();if(!m||!screen)return false;
  if(screen!=='workout')cleanupWorkoutRestPortal();
  setScreenClass(m,screen);
  if(screen==='today'){
    decorateToday(m);
    const flow=qs(m,'#garangTodayFlow');
    if(!flow||!flow.parentElement?.classList?.contains('g-ref-today-stage')){delete m.dataset.garangReferenceUi;return false;}
  }else if(screen==='workout')decorateWorkout(m);else if(screen==='nutrition')decorateNutrition(m);else if(screen==='body')decorateBody(m);else if(screen==='coach'){
    if(!decorateCoach(m)){delete m.dataset.garangReferenceUi;return false;}
  }else if(screen==='progress')decorateProgress(m);
  m.dataset.garangReferenceUi='v2';
  return true;
}
function schedule(){
  if(screenName()==='today'){
    const enqueue=typeof queueMicrotask==='function'?queueMicrotask:fn=>Promise.resolve().then(fn);
    enqueue(()=>{if(screenName()==='today')apply();});
  }
  requestAnimationFrame(()=>{apply();setTimeout(apply,60);setTimeout(apply,220);});
}
for(const evt of ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','garang:coach-mounted','garang:coach-message-rendered','garang:daily-workout-plan-ready','garang:workout-set-rows-rendered','garang:workout-session-started'])window.addEventListener(evt,schedule,{passive:true});
new MutationObserver(mutations=>{if(mutations.some(m=>m.type==='attributes'&&m.target===document.documentElement&&m.attributeName==='lang'))schedule();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
document.addEventListener('click',event=>{
  if(!event.target.closest?.('[data-execution-set-complete]'))return;
  setTimeout(settleWorkoutRest,0);
  requestAnimationFrame(()=>requestAnimationFrame(settleWorkoutRest));
  setTimeout(settleWorkoutRest,80);
},true);
document.addEventListener('DOMContentLoaded',schedule,{once:true});
schedule();
window.GarangReferenceUIV2=Object.freeze({version:VERSION,apply,schedule,settleWorkoutRest});
})();