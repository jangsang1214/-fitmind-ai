/* GARANG Workout Flow v1
   Structural three-surface workout flow: overview -> exercise -> log -> overview.
   This runtime owns only the workout surface composition and navigation.
*/
(function(root){
'use strict';
if(!root||root.__garangWorkoutFlowV1)return;
root.__garangWorkoutFlowV1=true;

const VERSION='garang-workout-flow-v1.1.0-surfaces';
const state={active:'overview'};
const SURFACES=[
  {id:'overview',en:'Overview',ko:'개요'},
  {id:'exercise',en:'Exercise',ko:'종목'},
  {id:'log',en:'Log',ko:'기록'}
];

function isKo(){return document.documentElement.lang!=='en';}
function direct(main,selector){return main.querySelector(':scope > '+selector);}
function removeOldChrome(main){
  main.querySelectorAll(':scope > .gwf-nav,:scope > .gwf-panel-note,:scope > .gwf-next,:scope > .gws-nav,:scope > .gws-panel-note,:scope > .gws-next').forEach(node=>node.remove());
}
function ensureStyle(){
  if(document.getElementById('garang-workout-flow-v1-style'))return;
  const style=document.createElement('style');
  style.id='garang-workout-flow-v1-style';
  style.textContent=[
    '.gws-shell{display:block;width:100%;min-width:0}',
    '.gws-nav{display:flex;align-items:stretch;gap:5px;margin:0 0 18px;padding:3px;border-bottom:1px solid rgba(242,239,233,.11);overflow-x:auto;scrollbar-width:none}',
    '.gws-nav::-webkit-scrollbar{display:none}',
    '.gws-step{flex:1 1 0;min-width:92px;padding:11px 12px 9px;border:0;border-radius:999px;background:transparent;color:#777d77;font:500 10px/1 var(--g2-ui,system-ui);letter-spacing:.05em;white-space:nowrap;cursor:pointer}',
    '.gws-step.active{background:rgba(79,174,146,.12);color:#ebe9e3}',
    '.gws-step em{display:block;margin-top:5px;color:#4fae92;font-size:8px;font-style:normal;letter-spacing:.14em}',
    '.gws-panel{display:block;min-width:0}',
    '.gws-panel[hidden]{display:none!important}',
    '.gws-panel-note{margin:-7px 0 16px;color:#7c807b;font-size:10px;line-height:1.5}',
    '.gws-next{display:flex;justify-content:flex-end;margin:18px 0 0}',
    '.gws-next button{border:1px solid rgba(79,174,146,.3);border-radius:999px;background:transparent;color:#e9e8e2;padding:10px 14px;font:500 10px/1 var(--g2-ui,system-ui);cursor:pointer}',
    '.gws-panel[data-garang-workout-surface="exercise"] .exercise-visual-library{margin-top:0}',
    '.gws-panel[data-garang-workout-surface="log"] .workout-builder{margin-top:0}',
    '@media(max-width:700px){.gws-nav{margin-left:-2px;margin-right:-2px}.gws-step{min-width:84px;padding:10px 9px 8px;font-size:9px}.gws-panel-note{font-size:9px}.gws-next{margin-top:14px}}'
  ].join('');
  document.head.appendChild(style);
}
function panel(main,id){
  const node=document.createElement('section');
  node.className='gws-panel';
  node.dataset.garangWorkoutSurface=id;
  node.setAttribute('aria-label',id);
  main.querySelector(':scope > .gws-shell')?.appendChild(node);
  return node;
}
function move(node,target){
  if(node)target.appendChild(node);
}
function renderNav(shell){
  let nav=shell.querySelector(':scope > .gws-nav');
  if(!nav){nav=document.createElement('nav');nav.className='gws-nav';nav.setAttribute('aria-label','운동 기록 흐름');shell.appendChild(nav);}
  nav.innerHTML=SURFACES.map(item=>'<button type="button" class="gws-step '+(state.active===item.id?'active':'')+'" data-gws-step="'+item.id+'">'+item.en+'<em>'+item.ko+'</em></button>').join('');
  nav.querySelectorAll('[data-gws-step]').forEach(button=>{
    button.addEventListener('click',()=>{
      state.active=button.dataset.gwsStep||'overview';
      apply(shell);
    });
  });
}
function renderNote(shell){
  let note=shell.querySelector(':scope > .gws-panel-note');
  if(!note){note=document.createElement('p');note.className='gws-panel-note';shell.appendChild(note);}
  const ko=isKo();
  const notes={
    overview:ko?'운동 상태와 최근 누적을 확인합니다.':'Review workout status and recent accumulation.',
    exercise:ko?'오늘 수행할 종목을 선택합니다.':'Choose the exercise for today.',
    log:ko?'같은 중량과 세트별 중량을 하나의 기록 흐름에서 저장합니다.':'Log standard or set-by-set weights in one flow.'
  };
  note.textContent=notes[state.active];
}
function renderNext(shell){
  let next=shell.querySelector(':scope > .gws-next');
  if(!next){next=document.createElement('div');next.className='gws-next';shell.appendChild(next);}
  const nextId=state.active==='overview'?'exercise':state.active==='exercise'?'log':'overview';
  const label=isKo()?(state.active==='overview'?'종목 선택으로':state.active==='exercise'?'기록 시작':'운동 개요로 돌아가기'):(state.active==='overview'?'Choose exercise':state.active==='exercise'?'Start logging':'Back to overview');
  next.innerHTML='<button type="button" data-gws-next="'+nextId+'">'+label+'</button>';
  next.querySelector('[data-gws-next]').addEventListener('click',()=>{
    state.active=nextId;
    apply(shell);
  });
}
function apply(shell){
  renderNav(shell);
  renderNote(shell);
  shell.querySelectorAll(':scope > .gws-panel').forEach(node=>{
    const on=node.dataset.garangWorkoutSurface===state.active;
    node.hidden=!on;
    node.setAttribute('aria-hidden',on?'false':'true');
  });
  renderNext(shell);
  const main=shell.parentElement;
  if(main)main.dataset.garangWorkoutSurface=state.active;
}
function mount(){
  const main=document.getElementById('main');
  if(!main||main.dataset.garangScreen!=='workout')return;
  const head=direct(main,'.page-head');
  const hero=direct(main,'.workout-visual-hero');
  const library=direct(main,'.exercise-visual-library');
  const builder=direct(main,'.workout-builder');
  const cert=direct(main,'.cert-entry-card');
  const history=direct(main,'.compact-history');
  const insights=direct(main,'.record-insights');
  const title=hero?.nextElementSibling?.matches('.section-title')?hero.nextElementSibling:null;
  if(!hero||!library||!builder)return;
  removeOldChrome(main);
  ensureStyle();
  let shell=direct(main,'.gws-shell');
  if(!shell){
    shell=document.createElement('div');
    shell.className='gws-shell';
    shell.dataset.garangWorkoutFlow=VERSION;
    if(head)head.insertAdjacentElement('afterend',shell);else main.insertAdjacentElement('afterbegin',shell);
    const overview=panel(main,'overview');
    const exercise=panel(main,'exercise');
    const log=panel(main,'log');
    move(hero,overview);
    move(history,overview);
    move(insights,overview);
    move(title,exercise);
    move(library,exercise);
    move(builder,log);
    move(cert,log);
  }else{
    shell.dataset.garangWorkoutFlow=VERSION;
  }
  apply(shell);
}
root.addEventListener('garang:screen-rendered',mount);
root.addEventListener('garang:route-completed',mount);
root.addEventListener('garang:state-updated',mount);
if(document.readyState!=='loading')root.requestAnimationFrame(mount);
else document.addEventListener('DOMContentLoaded',mount);
})(typeof globalThis!=='undefined'?globalThis:window);
