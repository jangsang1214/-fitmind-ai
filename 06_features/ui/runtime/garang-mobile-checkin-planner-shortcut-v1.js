/* GARANG Mobile Check-in + Planner Shortcut v1
   Presentation/routing-only hotfix:
   - keeps the canonical Today check-in inputs and #saveCheckin write owner
   - keeps the existing Planner route/persistence owner
   - makes the check-in action persistently reachable above mobile safe areas
   - adds one compact Today-plan shortcut delegated only to GarangRouter
*/
(() => {
'use strict';
if(window.GarangMobileCheckinPlannerShortcutV1)return;
const VERSION='1.0.3';
const STYLE_ID='garang-mobile-checkin-planner-shortcut-v1-style';
let bodyObserver=null,mainObserver=null,observedMain=null,flowObserver=null,observedFlow=null,queued=false,delayed=0;
const main=()=>document.getElementById('main');
const isKo=()=>document.documentElement.lang!=='en';

function ensureStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
html body>.modal-backdrop.garang-checkin-modal-backdrop{
  z-index:2147483000!important;
  padding:12px 12px max(12px,env(safe-area-inset-bottom))!important;
  place-items:end center!important;
}
html body>.modal-backdrop.garang-checkin-modal-backdrop>.modal.garang-checkin-modal{
  display:flex!important;
  flex-direction:column!important;
  width:min(560px,100%)!important;
  max-height:calc(100dvh - max(24px,env(safe-area-inset-top)) - max(24px,env(safe-area-inset-bottom)))!important;
  overflow:hidden!important;
  padding-bottom:max(16px,env(safe-area-inset-bottom))!important;
}
html body>.modal-backdrop.garang-checkin-modal-backdrop>.modal.garang-checkin-modal>.checkin-form{
  min-height:0!important;
  overflow-y:auto!important;
  overscroll-behavior:contain!important;
  -webkit-overflow-scrolling:touch;
  padding-right:2px!important;
  padding-bottom:8px!important;
}
html body>.modal-backdrop.garang-checkin-modal-backdrop>.modal.garang-checkin-modal>.garang-checkin-actions{
  flex:0 0 auto!important;
  padding-top:12px!important;
  border-top:1px solid rgba(242,239,233,.08)!important;
  background:#151310!important;
}
html body>.modal-backdrop.garang-checkin-modal-backdrop>.modal.garang-checkin-modal>.garang-checkin-actions>#saveCheckin{
  width:100%!important;
  min-height:52px!important;
  margin:0!important;
}
html body #main[data-garang-screen="today"] .gpc-today-plan-head:has([data-garang-planner-shortcut="1"]){
  justify-content:flex-start!important;
  gap:0!important;
}
html body #main[data-garang-screen="today"] .gpc-today-plan-head:has([data-garang-planner-shortcut="1"])>small{
  margin-left:auto!important;
}
html body #main[data-garang-screen="today"] [data-garang-planner-shortcut="1"]{
  appearance:none!important;
  display:grid!important;
  place-items:center!important;
  flex:0 0 auto!important;
  width:44px!important;
  min-width:44px!important;
  height:44px!important;
  min-height:44px!important;
  margin:-8px 0 -8px 0!important;
  padding:0!important;
  border:0!important;
  border-radius:999px!important;
  background:transparent!important;
  color:#78988c!important;
  box-shadow:none!important;
  font-size:0!important;
  cursor:pointer!important;
}
html body #main[data-garang-screen="today"] [data-garang-planner-shortcut="1"]::before{
  content:"+";
  display:grid!important;
  place-items:center!important;
  width:28px!important;
  height:28px!important;
  border:1px solid rgba(120,152,140,.32)!important;
  border-radius:999px!important;
  color:#78988c!important;
  font:400 16px/1 system-ui,sans-serif!important;
}
html body #main[data-garang-screen="today"] [data-garang-planner-shortcut="1"]:focus-visible{
  outline:1px solid rgba(120,170,153,.78)!important;
  outline-offset:1px!important;
}
html.garang-v8 body #main[data-garang-screen="today"] .g8-action-card [data-garang-planner-shortcut="1"]{
  position:absolute!important;
  top:12px!important;
  right:12px!important;
  z-index:4!important;
  width:44px!important;
  height:44px!important;
  margin:0!important;
  border:1px solid var(--g8-line)!important;
  background:rgba(255,255,255,.92)!important;
  color:var(--g8-ink)!important;
}
html.garang-v8 body #main[data-garang-screen="today"] .g8-action-card [data-garang-planner-shortcut="1"]::before{
  width:28px!important;
  height:28px!important;
  border:0!important;
  color:var(--g8-ink)!important;
  font:500 18px/1 system-ui,sans-serif!important;
}
@media(min-width:720px){
  html body>.modal-backdrop.garang-checkin-modal-backdrop{place-items:center!important;padding:24px!important}
  html body>.modal-backdrop.garang-checkin-modal-backdrop>.modal.garang-checkin-modal{max-height:88svh!important}
}
`;
  document.head.appendChild(style);
}

function enhanceCheckin(root=document){
  const save=root?.querySelector?.('#saveCheckin')||document.getElementById('saveCheckin');
  if(!save)return false;
  const modal=save.closest('.modal'),backdrop=modal?.closest('.modal-backdrop');
  if(!modal||!backdrop)return false;
  backdrop.classList.add('garang-checkin-modal-backdrop');
  modal.classList.add('garang-checkin-modal');
  let actions=modal.querySelector(':scope > .garang-checkin-actions');
  if(!actions){
    actions=document.createElement('div');
    actions.className='garang-checkin-actions';
    actions.dataset.garangCheckinActions='1';
    modal.appendChild(actions);
  }
  if(save.parentElement!==actions)actions.appendChild(save);
  return true;
}

function ensureFounderBuild(m){
  const shell=m?.querySelector?.('.g8-today');
  if(!shell)return null;
  let build=shell.querySelector('.g8-secondary-action.g9-showcase-build,.g8-secondary-action[data-garang-reference-build="1"]');
  if(!build){
    build=document.createElement('section');
    build.className='g8-secondary-action g9-showcase-build';
    build.dataset.garangReferenceBuild='1';
    build.innerHTML='<span class="g8-kicker">BUILD</span><strong>오늘 계획</strong><p>오늘 계획을 조정하고 다음 행동을 준비합니다.</p>';
    const state=shell.querySelector('.g8-state-card');
    if(state)shell.insertBefore(build,state);
    else shell.appendChild(build);
  }
  return build;
}

function ensurePlannerShortcut(){
  const m=main();
  if(!m||m.dataset.garangScreen!=='today')return false;
  const head=m.querySelector('.gpc-today-plan-head');
  const build=ensureFounderBuild(m);
  const existing=[...m.querySelectorAll('[data-garang-planner-shortcut="1"]')];
  let button=existing.find(node=>node.dataset.garangPlannerShortcutHost==='founder')||existing.find(node=>node.closest('.g9-showcase-build'))||existing.find(node=>node.closest('.g8-action-card'))||existing[0]||null;
  for(const duplicate of existing){if(duplicate!==button)duplicate.remove();}

  if(build&&button?.parentElement!==build){
    build.appendChild(button);
    button.dataset.garangPlannerShortcutHost='founder';
  }else if(button?.closest('.g8-action-card')){
    button.dataset.garangPlannerShortcutHost='founder';
  }

  if(!button){
    const host=build||head;
    if(!host)return false;
    button=document.createElement('button');
    button.type='button';
    button.dataset.garangPlannerShortcut='1';
    button.className='garang-planner-shortcut';
    button.textContent=build?'계획 열기':'+';
    if(build){
      button.dataset.garangPlannerShortcutHost='founder';
      host.appendChild(button);
    }else{
      const label=head.querySelector(':scope > span');
      if(label)label.insertAdjacentElement('afterend',button);
      else head.prepend(button);
    }
  }else if(button.dataset.garangPlannerShortcutHost!=='founder'&&head&&button.parentElement!==head){
    const label=head.querySelector(':scope > span');
    if(label)label.insertAdjacentElement('afterend',button);
    else head.prepend(button);
  }

  if(build&&button.parentElement===build){
    button.dataset.garangPlannerShortcutHost='founder';
    button.textContent='계획 열기';
  }
  const aria=isKo()?'플래너 열기':'Open Planner';
  if(button.getAttribute('aria-label')!==aria)button.setAttribute('aria-label',aria);
  button.title=aria;
  return true;
}

function observeMain(){
  const m=main();
  if(!m||m===observedMain)return;
  mainObserver?.disconnect();
  observedMain=m;
  mainObserver=new MutationObserver(records=>{
    if(m.dataset.garangScreen!=='today')return;
    for(const record of records){
      if(record.type!=='childList')continue;
      const changed=[...record.addedNodes,...record.removedNodes].some(node=>node?.nodeType===1);
      if(changed){schedule();break;}
    }
  });
  mainObserver.observe(m,{childList:true,subtree:true});
}
function observeFlow(){
  const flow=main()?.querySelector?.('#garangTodayFlow');
  if(!flow||flow===observedFlow)return;
  flowObserver?.disconnect();
  observedFlow=flow;
  flowObserver=new MutationObserver(schedule);
  flowObserver.observe(flow,{childList:true,subtree:true});
}

function reconcile(){
  queued=false;
  ensureStyle();
  observeMain();
  enhanceCheckin();
  observeFlow();
  ensurePlannerShortcut();
}
function schedule(){
  if(!queued){queued=true;requestAnimationFrame(()=>requestAnimationFrame(reconcile));}
  clearTimeout(delayed);
  delayed=setTimeout(reconcile,360);
}
function openPlanner(event){
  event?.preventDefault?.();
  event?.stopImmediatePropagation?.();
  try{return window.GarangRouter?.navigate?.('planner',{source:'today-plan-shortcut',force:true})===true;}catch{return false;}
}

document.addEventListener('click',event=>{
  const shortcut=event.target?.closest?.('[data-garang-planner-shortcut="1"]');
  if(shortcut)openPlanner(event);
},true);

bodyObserver=new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes){
    if(node?.nodeType!==1)continue;
    if(node.matches?.('.modal-backdrop'))enhanceCheckin(node);
  }
});
bodyObserver.observe(document.body,{childList:true,subtree:false});
for(const name of ['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:state-hydrated','pageshow'])window.addEventListener(name,schedule);

ensureStyle();
reconcile();
schedule();
window.GarangMobileCheckinPlannerShortcutV1=Object.freeze({version:VERSION,reconcile:schedule,enhanceCheckin,ensurePlannerShortcut,openPlanner});
})();
