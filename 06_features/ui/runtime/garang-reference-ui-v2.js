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

function node(tag,cls,html=''){
  const el=document.createElement(tag);if(cls)el.className=cls;if(html)el.innerHTML=html;return el;
}
function ensureInteractionGuards(){
  if(document.getElementById('garangReferenceUIV2Guards'))return;
  const style=document.createElement('style');style.id='garangReferenceUIV2Guards';style.textContent=`
.g-ref-body-primary .g3-anatomy-legend,.g-ref-body-primary .g3-anatomy-legend *{pointer-events:none!important}
.g-ref-body-primary .g3-view-switch{position:relative!important;z-index:24!important;pointer-events:auto!important;scroll-margin-top:104px!important}
.g-ref-body-primary .g3-view-switch button{position:relative!important;z-index:25!important;pointer-events:auto!important;min-height:44px!important}
`;
  document.head.appendChild(style);
}
function screenName(){return String(main()?.dataset?.garangScreen||'').trim();}
function setScreenClass(m,screen){
  for(const c of [...m.classList])if(c.startsWith('g-ref-screen-'))m.classList.remove(c);
  m.classList.add('g-ref-screen','g-ref-screen-'+screen);m.dataset.garangReferenceUi='v2';
}
function ensureIntro(m){
  let intro=qs(m,':scope > .g-ref-screen-intro');
  if(intro)return intro;
  intro=node('section','g-ref-screen-intro');
  const head=qs(m,':scope > .page-head')||qs(m,'.page-head');
  if(head?.nextSibling)m.insertBefore(intro,head.nextSibling);else m.prepend(intro);
  return intro;
}
function koreanDay(d){return ['일','월','화','수','목','금','토'][d.getDay()];}
function todayStrip(){
  const now=new Date(),cells=[];
  for(let offset=-3;offset<=3;offset++){
    const d=new Date(now);d.setDate(now.getDate()+offset);
    cells.push(`<span class="${offset===0?'is-today':''}"><small>${koreanDay(d)}</small><b>${d.getDate()}</b></span>`);
  }
  return `<div class="g-ref-date-copy"><strong>안녕하세요!</strong><span>오늘도 좋은 하루예요.</span></div><div class="g-ref-date-strip">${cells.join('')}</div>`;
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
  if(hero)hero.classList.add('g-ref-today-body-card');
  const support=ensureStage(m,'g-ref-today-support',stage);
  for(const child of directRemainder(m,[head,intro,stage,support]))move(support,child);
}
function decorateWorkout(m){
  const head=qs(m,':scope > .page-head')||qs(m,'.page-head');
  const intro=ensureIntro(m);intro.innerHTML='<div class="g-ref-workout-title"><span>WORKOUT</span><strong>바로 실행하고, 짧게 기록</strong></div>';
  const execution=qs(m,'.workout-execution-v2'),hero=qs(m,'.workout-visual-hero'),tabs=qs(m,'.gws-tabs');
  if(execution)execution.classList.add('g-ref-workout-execution');
  if(hero)hero.classList.add('g-ref-workout-hero');
  if(tabs)tabs.classList.add('g-ref-workout-tabs');
  const panel=qs(m,'.gws-panel[data-garang-workout-surface="exercise"]');if(panel)panel.classList.add('g-ref-workout-panel');
  const overview=qs(m,'.gws-panel[data-garang-workout-surface="overview"]');if(overview)overview.classList.add('g-ref-workout-overview');
  if(head)head.classList.add('g-ref-original-head');
}
function decorateNutrition(m){
  const head=qs(m,':scope > .page-head')||qs(m,'.page-head');
  const intro=ensureIntro(m);intro.innerHTML='<div class="g-ref-section-copy"><span>NUTRITION</span><strong>찍기만 하면 분석하고, 다음 식사까지 연결</strong></div>';
  const scan=qs(m,'.meal-scan-card');
  const stage=ensureStage(m,'g-ref-nutrition-stage',intro);move(stage,scan);
  if(scan)scan.classList.add('g-ref-meal-scan-primary');
  const summary=qs(m,'.nutrition-detail-summary'),adaptive=qs(m,'.adaptive-nutrition-card');
  const status=ensureStage(m,'g-ref-nutrition-status',stage);move(status,summary,adaptive);
  const support=ensureStage(m,'g-ref-nutrition-support',status);
  for(const child of directRemainder(m,[head,intro,stage,status,support]))move(support,child);
}
function decorateBody(m){
  const head=qs(m,':scope > .page-head')||qs(m,'.page-head');
  const intro=ensureIntro(m);intro.innerHTML='<div class="g-ref-section-copy"><span>BODY</span><strong>내 몸을 더 직관적이고, 입체적으로 이해</strong></div>';
  const hero=qs(m,'.body-hero'),trend=qs(m,'.body-trend-card');
  const stage=ensureStage(m,'g-ref-body-stage',intro);move(stage,hero,trend);
  if(hero)hero.classList.add('g-ref-body-primary');
  if(trend)trend.classList.add('g-ref-body-trend');
  const model=qs(m,'.g3-body-model[data-garang-classical-model="6"]');
  const visual=qs(hero,'.body-hero-anatomy');if(model&&visual&&!visual.contains(model))visual.replaceChildren(model);
  const support=ensureStage(m,'g-ref-body-support',stage);
  for(const child of directRemainder(m,[head,intro,stage,support]))move(support,child);
}
function decorateCoach(m){
  const shell=qs(m,'.coach-app-shell');if(!shell)return;
  shell.classList.add('g-ref-coach-shell');
  const status=qs(shell,'.coach-status-card');if(status)status.classList.add('g-ref-coach-status');
  const thread=qs(shell,'.coach-thread');if(thread)thread.classList.add('g-ref-coach-thread');
  const composer=qs(shell,'.coach-bottom-stack');if(composer)composer.classList.add('g-ref-coach-composer');
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
  decorateChrome();const m=main(),screen=screenName();if(!m||!screen)return false;setScreenClass(m,screen);
  if(screen==='today')decorateToday(m);else if(screen==='workout')decorateWorkout(m);else if(screen==='nutrition')decorateNutrition(m);else if(screen==='body')decorateBody(m);else if(screen==='coach')decorateCoach(m);else if(screen==='progress')decorateProgress(m);
  return true;
}
function schedule(){requestAnimationFrame(()=>{apply();setTimeout(apply,60);setTimeout(apply,220);});}
for(const evt of ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','garang:coach-mounted','garang:coach-message-rendered','garang:daily-workout-plan-ready'])window.addEventListener(evt,schedule,{passive:true});
document.addEventListener('DOMContentLoaded',schedule,{once:true});
schedule();
window.GarangReferenceUIV2=Object.freeze({version:VERSION,apply,schedule});
})();
