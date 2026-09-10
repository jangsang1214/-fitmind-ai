/* GARANG Workout Flow v1.3
   One visible functional workout page at a time:
   Overview -> Exercise -> Log -> Overview.
   Existing app.js markup and handlers remain the feature owners.
*/
(function(root){
'use strict';
if(!root||root.__garangWorkoutFlowV1)return;
root.__garangWorkoutFlowV1=true;

const VERSION='garang-workout-flow-v1.3.0-paged';
const state={active:'overview'};
const SURFACES=[
  {id:'overview',en:'Overview',ko:'개요'},
  {id:'exercise',en:'Exercises',ko:'종목'},
  {id:'log',en:'Log',ko:'기록'}
];

function isKo(){return document.documentElement.lang!=='en';}
function direct(main,selector){return main.querySelector(':scope > '+selector);}
function removeLegacyChrome(main){
  main.querySelectorAll('.garang-workout-tabs,:scope > .gwf-nav,:scope > .gwf-panel-note,:scope > .gwf-next,:scope > .gws-nav,:scope > .gws-panel-note,:scope > .gws-next').forEach(node=>node.remove());
}
function ensureStyle(){
  if(document.getElementById('garang-workout-flow-v1-style'))return;
  const style=document.createElement('style');
  style.id='garang-workout-flow-v1-style';
  style.textContent=[
    '.gws-shell,.gws-panel{display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box}',
    '.gws-panel>*{min-width:0;max-width:100%;box-sizing:border-box}',
    '.gws-panel input,.gws-panel select,.gws-panel textarea{max-width:100%;box-sizing:border-box}',
    '.gws-nav{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch;margin:0 0 22px;border-bottom:1px solid rgba(242,239,233,.12);overflow:visible}',
    '.gws-step{position:relative;min-width:0;min-height:52px;padding:13px 8px 11px;border:0;border-radius:0;background:transparent;color:#777d77;font:500 11px/1 var(--g2-ui,system-ui);letter-spacing:.03em;white-space:nowrap;cursor:pointer}',
    '.gws-step::after{content:"";position:absolute;left:50%;bottom:-1px;width:0;height:2px;background:#4fae92;transform:translateX(-50%);transition:width .2s ease}',
    '.gws-step.active{color:#ebe9e3}',
    '.gws-step.active::after{width:38px}',
    '.gws-step em{display:block;margin-top:6px;color:#4fae92;font-size:8px;font-style:normal;letter-spacing:.14em}',
    '.gws-panel{display:block;min-width:0}',
    '.gws-panel[hidden]{display:none!important}',
    '.gws-next{display:flex;justify-content:flex-end;margin:18px 0 0}',
    '.gws-next button{border:1px solid rgba(79,174,146,.28);border-radius:999px;background:transparent;color:#e9e8e2;padding:10px 14px;font:500 10px/1 var(--g2-ui,system-ui);cursor:pointer}',
    '.gws-panel[data-garang-workout-surface="exercise"] .exercise-visual-library{margin-top:0}',
    '.gws-panel[data-garang-workout-surface="log"] .workout-builder{margin-top:0}',
    '@media(max-width:700px){.gws-nav{margin-bottom:18px}.gws-step{min-height:48px;padding:11px 4px 9px;font-size:10px}.gws-step em{font-size:7px}.gws-step.active::after{width:32px}.gws-next{margin-top:14px}}'
  ].join('');
  document.head.appendChild(style);
}
function panel(shell,id){
  const node=document.createElement('section');
  node.className='gws-panel';
  node.dataset.garangWorkoutSurface=id;
  node.dataset.garangWorkoutPage='1';
  node.setAttribute('aria-label',id);
  shell.appendChild(node);
  return node;
}
function move(node,target){
  if(node&&node.parentElement!==target)target.appendChild(node);
}
function renderNav(shell){
  let nav=shell.querySelector(':scope > .gws-nav');
  if(!nav){
    nav=document.createElement('nav');
    nav.className='gws-nav';
    nav.setAttribute('data-garang-workout-nav','1');
    nav.setAttribute('aria-label','운동 기록 흐름');
  }
  nav.innerHTML=SURFACES.map(item=>'<button type="button" class="gws-step '+(state.active===item.id?'active':'')+'" data-gws-step="'+item.id+'">'+item.en+'<em>'+item.ko+'</em></button>').join('');
  nav.querySelectorAll('[data-gws-step]').forEach(button=>{
    button.addEventListener('click',()=>{
      state.active=button.dataset.gwsStep||'overview';
      apply(shell);
    });
  });
  const firstPanel=shell.querySelector(':scope > .gws-panel');
  if(firstPanel)shell.insertBefore(nav,firstPanel);
  else shell.appendChild(nav);
}
function renderNext(shell){
  let next=shell.querySelector(':scope > .gws-next');
  if(!next){
    next=document.createElement('div');
    next.className='gws-next';
  }
  const nextId=state.active==='overview'?'exercise':state.active==='exercise'?'log':'overview';
  const label=isKo()?(state.active==='overview'?'종목 보기':state.active==='exercise'?'기록 입력':'개요 보기'):(state.active==='overview'?'View exercises':state.active==='exercise'?'Open log':'View overview');
  next.innerHTML='<button type="button" data-gws-next="'+nextId+'">'+label+'</button>';
  next.querySelector('[data-gws-next]').addEventListener('click',()=>{
    state.active=nextId;
    apply(shell);
  });
  shell.appendChild(next);
}
function apply(shell){
  renderNav(shell);
  shell.querySelectorAll(':scope > .gws-panel').forEach(node=>{
    const on=node.dataset.garangWorkoutSurface===state.active;
    node.hidden=!on;
    node.setAttribute('aria-hidden',on?'false':'true');
    node.dataset.garangWorkoutAttached=on?'1':'0';
    node.setAttribute('data-garang-workout-attached',on?'1':'0');
  });
  renderNext(shell);
  const main=shell.parentElement;
  if(main)main.dataset.garangWorkoutSurface=state.active;
}
function findWorkoutAnalysis(main){
  const section=direct(main,'.record-insights');
  if(section)return {section};
  const title=[...main.children].find(node=>node.matches('.section-title')&&/운동 분석|workout insights/i.test(node.textContent||''));
  const empty=title?.nextElementSibling?.matches('.card.empty')?title.nextElementSibling:null;
  return {title,empty,section:null};
}
function mount(){
  const main=document.getElementById('main');
  if(!main||main.dataset.garangScreen!=='workout')return;
  removeLegacyChrome(main);
  ensureStyle();

  let shell=direct(main,'.gws-shell');
  if(shell){
    apply(shell);
    return;
  }

  const head=direct(main,'.page-head');
  const hero=direct(main,'.workout-visual-hero');
  const library=direct(main,'.exercise-visual-library');
  const builder=direct(main,'.workout-builder');
  const cert=direct(main,'.cert-entry-card');
  const history=direct(main,'.compact-history');
  const insights=direct(main,'.record-insights');
  const title=hero?.nextElementSibling?.matches('.section-title')?hero.nextElementSibling:null;
  const analysis=findWorkoutAnalysis(main);
  if(!hero||!library||!builder)return;

  shell=document.createElement('div');
  shell.className='gws-shell';
  shell.dataset.garangWorkoutFlow=VERSION;
  shell.dataset.garangWorkoutSingleSurface='1';
  if(head)head.insertAdjacentElement('afterend',shell);
  else main.insertAdjacentElement('afterbegin',shell);

  const overview=panel(shell,'overview');
  const exercise=panel(shell,'exercise');
  const log=panel(shell,'log');

  move(hero,overview);
  move(history,overview);
  move(insights,overview);
  move(analysis.section,overview);
  move(analysis.title,overview);
  move(analysis.empty,overview);
  move(title,exercise);
  move(library,exercise);
  move(builder,log);
  move(cert,log);

  apply(shell);
}
root.addEventListener('garang:screen-rendered',mount);
root.addEventListener('garang:route-completed',mount);
root.addEventListener('garang:state-updated',mount);
if(document.readyState!=='loading')root.requestAnimationFrame(mount);
else document.addEventListener('DOMContentLoaded',mount);
})(typeof globalThis!=='undefined'?globalThis:window);
