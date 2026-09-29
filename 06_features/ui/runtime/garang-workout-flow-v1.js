/* GARANG Workout Flow v1.5
   Two-surface workout architecture:
   Overview owns session state / interpretation / advanced session capabilities.
   Exercises owns discovery plus the single canonical recording surface.
   Existing app.js markup and handlers remain the feature owners.
*/
(function(root){
'use strict';
if(!root||root.__garangWorkoutFlowV1)return;
root.__garangWorkoutFlowV1=true;

const VERSION='garang-workout-flow-v1.5.0-two-surface';
const state={active:'overview'};
const SURFACES=[
  {id:'overview',en:'Overview',ko:'개요'},
  {id:'exercise',en:'Exercises',ko:'종목'}
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
    '.gws-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:stretch;margin:0 0 16px;border-bottom:1px solid rgba(242,239,233,.12);overflow:visible}',
    '.gws-step{position:relative;min-width:0;min-height:52px;padding:13px 8px 11px;border:0;border-radius:0;background:transparent;color:#777d77;font:500 11px/1 var(--g2-ui,system-ui);letter-spacing:.03em;white-space:nowrap;cursor:pointer}',
    '.gws-step::after{content:"";position:absolute;left:50%;bottom:-1px;width:0;height:2px;background:#4fae92;transform:translateX(-50%);transition:width .2s ease}',
    '.gws-step.active{color:#ebe9e3}',
    '.gws-step.active::after{width:38px}',
    '.gws-step em{display:block;margin-top:6px;color:#4fae92;font-size:8px;font-style:normal;letter-spacing:.14em}',
    '.gws-panel{display:block;min-width:0}',
    '.gws-panel[hidden]{display:none!important}',
    '.gws-next{display:flex;justify-content:flex-end;margin:18px 0 0}',
    '.gws-next button{border:1px solid rgba(79,174,146,.28);border-radius:999px;background:transparent;color:#e9e8e2;padding:10px 14px;font:500 10px/1 var(--g2-ui,system-ui);cursor:pointer}',
    '.gws-reuse{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:0 2px 12px;border-bottom:1px solid rgba(242,239,233,.08)}',
    '.gws-reuse-copy{min-width:0;display:grid;gap:3px}',
    '.gws-reuse-copy strong{color:#e9e8e2;font:600 12px/1.35 var(--g2-ui,system-ui)}',
    '.gws-reuse-copy small{color:#7f857f;font:500 10px/1.4 var(--g2-ui,system-ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.gws-reuse button{flex:0 0 auto;border:1px solid rgba(79,174,146,.28);border-radius:999px;background:transparent;color:#e9e8e2;padding:9px 12px;font:500 10px/1 var(--g2-ui,system-ui);cursor:pointer}',
    '.gws-reuse button:disabled{opacity:.45;cursor:default}',
    '.gws-panel[data-garang-workout-surface="exercise"] .exercise-visual-library{margin-top:0}',
    '.gws-session-host{margin:0 0 14px}.gws-session-host .workout-session-bar{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"live controls" "feedback feedback" "progress progress";gap:8px 10px;padding:15px 16px 12px;border:1px solid rgba(143,226,193,.14);border-radius:18px;background:linear-gradient(150deg,rgba(18,25,21,.98),rgba(9,12,10,.98));box-shadow:0 16px 36px rgba(0,0,0,.22)}.gws-session-host .workout-session-live{grid-area:live;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:9px}.gws-session-host .workout-session-live span{display:flex;align-items:center;gap:7px;color:#88a99d;font-size:8px;letter-spacing:.14em}.gws-session-host .workout-session-live span i{width:6px;height:6px;border-radius:50%;background:#68726c}.gws-session-host .workout-session-bar.is-live .workout-session-live span i{background:#8fe0c2;box-shadow:0 0 0 5px rgba(143,224,194,.08)}.gws-session-host .workout-session-live strong{font:600 32px/1 var(--g2-ui,system-ui);color:#f1ede4;font-variant-numeric:tabular-nums}.gws-session-host .workout-session-controls{grid-area:controls;display:flex;align-items:center;gap:6px}.gws-session-host .workout-session-icon{min-height:44px;padding:0 14px;border:1px solid rgba(143,226,193,.22);border-radius:13px;background:rgba(143,226,193,.07);color:#e9eee9;font:700 10px/1 var(--g2-ui,system-ui)}.gws-session-host .workout-start{background:#eef1ec;color:#101411;border-color:#eef1ec}.gws-session-host .workout-session-icon[hidden]{display:none!important}.gws-session-host .workout-session-feedback{grid-area:feedback;margin:0;color:#8c958f;font-size:9px;line-height:1.4}.gws-session-host .workout-session-progress{grid-area:progress;padding-top:8px;border-top:1px solid rgba(255,255,255,.055);font-size:9px;color:#777d77}.gws-session-host .workout-session-progress small{display:none}.gws-session-host .workout-session-progress b{color:#c4c9c4}.gws-entry-dock{display:grid;gap:10px;margin:18px 0 0}.gws-entry-head{display:flex;align-items:end;justify-content:space-between;gap:12px;padding:0 2px 2px}.gws-entry-head span{display:block;color:#4fae92;font-size:7px;letter-spacing:.16em}.gws-entry-head strong{display:block;margin-top:5px;color:#ebe9e3;font:600 15px/1.2 var(--g2-ui,system-ui)}.gws-entry-head small{color:#777d77;font-size:9px}.gws-entry-dock .workout-builder{margin-top:0}.gws-overview-tools{margin:14px 0 0;border-top:1px solid rgba(242,239,233,.08);padding-top:12px}.gws-overview-tools>summary{cursor:pointer;color:#aeb3ad;font:600 10px/1.2 var(--g2-ui,system-ui);list-style:none}.gws-overview-tools>summary::-webkit-details-marker{display:none}.gws-overview-tools>summary::after{content:"＋";float:right;color:#4fae92}.gws-overview-tools[open]>summary::after{content:"−"}.gws-overview-tools-body{display:grid;gap:12px;margin-top:12px}.gws-session-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.gws-session-fields .field{display:grid!important;gap:5px}.gws-session-fields label{font-size:8px;color:#8c938d}.gws-session-fields input,.gws-session-fields select{min-height:40px}',
    '@media(max-width:700px){.gws-nav{margin-bottom:18px}.gws-step{min-height:48px;padding:11px 4px 9px;font-size:10px}.gws-step em{font-size:7px}.gws-step.active::after{width:32px}.gws-next{margin-top:14px}.gws-reuse{align-items:flex-start}.gws-reuse button{padding:9px 10px}}'
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
  const nextId=state.active==='overview'?'exercise':'overview';
  const label=isKo()?(state.active==='overview'?'종목 선택':'개요 보기'):(state.active==='overview'?'Choose exercise':'View overview');
  next.innerHTML='<button type="button" data-gws-next="'+nextId+'">'+label+'</button>';
  next.querySelector('[data-gws-next]').addEventListener('click',()=>{
    state.active=nextId;
    apply(shell);
  });
  shell.appendChild(next);
}
function snapshot(){
  try{return root.GarangAgentStateBridge?.ready?.()?root.GarangAgentStateBridge.getState():null;}catch{return null;}
}
function latestWorkout(){
  const current=snapshot(),rows=Array.isArray(current?.workouts)?current.workouts:[];
  return rows.length?{record:rows[rows.length-1],state:current}:null;
}
function field(id,value){
  const node=document.getElementById(id);
  if(!node||value===undefined||value===null||value==='')return false;
  node.value=String(value);
  node.dispatchEvent(new Event('input',{bubbles:true}));
  node.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}
function displayWeight(value,current){
  const unit=current?.preferences?.unit==='imperial'?'imperial':'metric';
  const converted=root.GarangUnits?.weight?.(Number(value),unit,1);
  return Number.isFinite(Number(converted))?converted:value;
}
function prefillLatest(button){
  const found=latestWorkout();
  if(!found?.record)return;
  const record=found.record,current=found.state;
  const details=Array.isArray(record.setDetails)&&record.setDetails.length?record.setDetails:Array.isArray(record.setsDetail)&&record.setsDetail.length?record.setsDetail:[];
  const first=details[0]||{};
  field('wName',record.name);
  field('wSets',record.sets||details.length||1);
  field('wReps',record.reps??first.reps??first.r);
  field('wWeight',displayWeight(record.weight??first.weight??first.w,current));
  field('wRpe',record.rpe??first.rpe);
  field('wDuration',record.duration);
  const visibleDetails=details.map(row=>({weight:displayWeight(row.weight??row.w,current),reps:row.reps??row.r,rpe:row.rpe}));
  requestAnimationFrame(()=>root.GarangWorkoutExecutionV2?.applyPrefill?.({details:visibleDetails,weight:displayWeight(record.weight??first.weight??first.w,current),reps:record.reps??first.reps??first.r,rpe:record.rpe??first.rpe,duration:record.duration}));
  button.textContent=isKo()?'최근 기록 적용됨':'Recent values applied';
  button.dataset.gwsReuseApplied='1';
}
function ensureRecentReuse(shell){
  const exercise=shell.querySelector(':scope > .gws-panel[data-garang-workout-surface="exercise"]');
  const dock=exercise?.querySelector(':scope > .gws-entry-dock');
  const builder=dock?.querySelector(':scope > .workout-builder');
  if(!exercise||!dock||!builder)return;
  let reuse=dock.querySelector(':scope > .gws-reuse');
  const found=latestWorkout();
  if(!reuse){
    reuse=document.createElement('div');
    reuse.className='gws-reuse';
    reuse.dataset.gwsReuse='latest-workout';
    dock.insertBefore(reuse,builder);
  }
  const label=found?.record?.name||'';
  reuse.innerHTML='<div class="gws-reuse-copy"><strong>'+(isKo()?'최근 운동 재사용':'Reuse recent workout')+'</strong><small>'+(found?(isKo()?'저장하지 않고 입력값만 채웁니다 · ':'Prefills only · ')+String(label):isKo()?'저장된 운동 기록이 생기면 사용할 수 있습니다.':'Available after your first saved workout.')+'</small></div><button type="button" data-gws-reuse-latest '+(found?'':'disabled')+'>'+(isKo()?'불러오기':'Prefill')+'</button>';
  const button=reuse.querySelector('[data-gws-reuse-latest]');
  if(button&&!button.disabled)button.addEventListener('click',()=>prefillLatest(button));
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
  ensureRecentReuse(shell);
  renderNext(shell);
  const main=shell.parentElement;
  if(main)main.dataset.garangWorkoutSurface=state.active;
  root.requestAnimationFrame(()=>root.requestAnimationFrame(()=>root.GarangWorkoutExecutionV2?.enhance?.()));
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

  const sessionHost=document.createElement('div');
  sessionHost.className='gws-session-host';
  sessionHost.dataset.garangWorkoutSessionHost='1';
  overview.appendChild(sessionHost);

  move(hero,overview);
  move(history,overview);
  move(insights,overview);
  move(analysis.section,overview);
  move(analysis.title,overview);
  move(analysis.empty,overview);

  const overviewTools=document.createElement('details');
  overviewTools.className='gws-overview-tools';
  overviewTools.innerHTML='<summary>'+(isKo()?'세션 설정 · 프로그램 · Health':'Session settings · Program · Health')+'</summary><div class="gws-overview-tools-body"></div>';
  overview.appendChild(overviewTools);
  const toolsBody=overviewTools.querySelector('.gws-overview-tools-body');
  const sessionFields=document.createElement('div');
  sessionFields.className='gws-session-fields';
  for(const id of ['wDuration','wBody','wSetType','wRir','wNotes'])move(builder.querySelector('#'+id)?.closest('.field'),sessionFields);
  if(sessionFields.children.length)toolsBody.appendChild(sessionFields);
  move(builder.querySelector('.workout-advanced-tools'),toolsBody);
  move(builder.querySelector('.workout-secondary-capabilities'),toolsBody);
  move(cert,toolsBody);

  move(title,exercise);
  move(library,exercise);

  const dock=document.createElement('section');
  dock.className='gws-entry-dock';
  dock.dataset.garangWorkoutEntry='1';
  dock.innerHTML='<div class="gws-entry-head"><div><span>RECORD</span><strong>'+(isKo()?'선택한 종목 기록':'Record selected exercise')+'</strong></div><small>'+(isKo()?'중량 · 반복 · 완료 중심':'Weight · reps · complete')+'</small></div>';
  exercise.appendChild(dock);
  move(builder,dock);

  apply(shell);
}
root.addEventListener('garang:workout-entry-focus',()=>{const main=document.getElementById('main'),shell=main?.querySelector(':scope > .gws-shell');if(!shell)return;state.active='exercise';apply(shell);root.requestAnimationFrame(()=>{const dock=shell.querySelector('.gws-entry-dock');dock?.scrollIntoView({block:'start',behavior:'smooth'});const weight=dock?.querySelector('[data-set-weight],#wWeight');try{weight?.focus?.({preventScroll:true});}catch{weight?.focus?.();}});});
root.addEventListener('garang:screen-rendered',mount);
root.addEventListener('garang:route-completed',mount);
root.addEventListener('garang:state-updated',mount);
if(document.readyState!=='loading')root.requestAnimationFrame(mount);
else document.addEventListener('DOMContentLoaded',mount);
})(typeof globalThis!=='undefined'?globalThis:window);