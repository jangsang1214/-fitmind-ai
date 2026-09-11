/* GARANG Golden Path v1
   Coordinates the first-use loop without becoming a second data owner.
   It reads the deterministic Golden Path model and routes into the existing
   onboarding, Record, Coach, Planner and Accumulation owners.
   Today owns recovery check-in entry, so Golden Path never renders a second check-in CTA.
*/
(() => {
'use strict';

const doc=document,main=doc.getElementById('main');
if(!main||window.__garangGoldenPathV1)return;
window.__garangGoldenPathV1=true;
const SURFACE='data-golden-path-surface';
let queued=false;

const esc=value=>String(value??'').replace(/[&<>"']/g,match=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[match]));
const isKo=()=>doc.documentElement.lang!=='en';
const modelCore=()=>window.GarangGoldenPath||null;
const state=()=>{try{const bridge=window.GarangAgentStateBridge;return bridge?.ready?.()?bridge.getState():null;}catch{return null;}};
const screen=()=>main.dataset.garangScreen||doc.querySelector('#bottomNav button.active[data-page]')?.dataset?.page||'';

function currentModel(){const core=modelCore(),snapshot=state();if(!core||!snapshot)return null;return core.derive(snapshot,{today:core.localDate()});}
function copy(model){
  const english=!isKo();
  const plan=model.nextPlan?.title||'';
  const text={
    first_record:english?{title:'Leave your first record.',body:'One workout, meal, run or body record is enough to begin.'}:{title:'첫 기록 하나를 남겨보세요.',body:'운동·식단·러닝·체성분 중 하나면 충분합니다.'},
    coach:english?{title:'Check the judgment behind your record.',body:'Coach reads the data you just saved.'}:{title:'기록을 바탕으로 판단을 확인하세요.',body:'방금 남긴 기록을 Coach가 읽습니다.'},
    plan:english?{title:model.recoveryReady?'Turn today’s direction into a plan.':'Give GARANG one recovery signal first.',body:model.recoveryReady?'Connect the Coach judgment to an action you can keep.':'A short check-in lets Coach set the plan at the right intensity.'}:{title:model.recoveryReady?'오늘의 방향을 계획으로 남기세요.':'먼저 오늘의 회복 상태를 알려주세요.',body:model.recoveryReady?'Coach의 판단을 실제로 이어갈 계획을 만듭니다.':'짧은 체크인 하나가 Coach가 맞는 강도로 계획을 정하는 근거가 됩니다.'},
    execute:english?{title:'Carry the plan into a real record.',body:plan?`Next: ${plan}`:'Complete the next planned action, then save the record.'}:{title:'계획을 실제 기록으로 이어가세요.',body:plan?`다음 계획 · ${plan}`:'다음 계획을 수행한 뒤 실제 기록으로 남깁니다.'},
    accumulation:english?{title:'Connect today’s record to accumulation.',body:'Open your progress to see what the record changed.'}:{title:'오늘의 기록을 누적에 연결하세요.',body:'누적 화면에서 오늘 기록이 만든 변화를 확인합니다.'},
    revisit:english?{title:'Start a new day from the record.',body:'Your previous progress is saved. Continue today’s loop.'}:{title:'새로운 하루를 다시 시작하세요.',body:'지난 누적은 저장되어 있습니다. 오늘의 흐름을 이어가세요.'}
  };
  return text[model.step]||text.revisit;
}
function actionFor(model){
  if(model.step==='first_record')return {id:'record',label:isKo()?'기록 남기기':'Leave a record'};
  if(model.step==='coach')return {id:'coach',label:isKo()?'Coach 열기':'Open Coach'};
  if(model.step==='plan')return model.recoveryReady?{id:'coach',label:isKo()?'Coach에서 계획 제안':'Propose a plan in Coach'}:{id:'checkin',label:isKo()?'상태 기록하기':'Add check-in'};
  if(model.step==='execute'){
    const type=model.nextPlan?.type;
    if(type==='running')return {id:'execute',label:isKo()?'러닝 기록 열기':'Open running log'};
    if(type==='nutrition')return {id:'execute',label:isKo()?'식단 기록 열기':'Open meal log'};
    if(type==='recovery')return {id:'execute',label:isKo()?'오늘 상태 기록':'Open recovery check-in'};
    return {id:'execute',label:isKo()?'운동 기록 열기':'Open workout log'};
  }
  if(model.step==='accumulation')return {id:'accumulation',label:isKo()?'누적 확인':'View accumulation'};
  return {id:'today',label:isKo()?'Today로 돌아가기':'Back to Today'};
}
function surface(model){
  if(model.step==='complete'&&!model.revisitAvailable)return '';
  const action=actionFor(model);
  /* Today has one state-entry owner. The compact Today check-in stays visible; Golden Path stays silent here. */
  if(action.id==='checkin')return '';
  const content=model.step==='complete'?copy({...model,step:'revisit'}):copy(model);
  return `<section class="gp-next" ${SURFACE}="1" data-gp-step="${esc(model.step)}" aria-label="${isKo()?'다음 단계':'Next step'}"><div class="gp-next-copy"><span class="gp-next-eyebrow">NEXT / ${isKo()?'다음':'NEXT'}</span><strong>${esc(content.title)}</strong><p>${esc(content.body)}</p></div><button type="button" class="gp-next-action" data-gp-action="${esc(action.id)}">${esc(action.label)}</button></section>`;
}
function removeSurface(){main.querySelectorAll(`[${SURFACE}]`).forEach(node=>node.remove());}
function inject(){
  removeSurface();
  if(screen()!=='today'){main.removeAttribute('data-gp-step');main.removeAttribute('data-gp-complete');return;}
  const model=currentModel();if(!model)return;
  const html=surface(model);
  main.dataset.gpStep=model.step;main.dataset.gpComplete=model.completed?'true':'false';
  if(!html)return;
  const anchor=main.querySelector('#garangCoreToday,.today-hero,.page-head');
  if(anchor)anchor.insertAdjacentHTML('afterend',html);else main.insertAdjacentHTML('afterbegin',html);
}
function schedule(){
  if(queued)return;queued=true;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;inject();}));
}
function afterRoute(route,callback){
  const listener=event=>{
    if(event?.detail?.route!==route)return;
    window.removeEventListener('garang:route-completed',listener);
    requestAnimationFrame(()=>requestAnimationFrame(()=>callback?.()));
  };
  window.addEventListener('garang:route-completed',listener);
  let ok=false;try{ok=window.GarangRouter?.navigate?.(route,{source:'golden-path',force:true})===true;}catch{}
  if(!ok)window.removeEventListener('garang:route-completed',listener);
}
function openRecord(){
  afterRoute('log',()=>window.GarangSimplifiedShell?.openRecordSheet?.(doc.querySelector('#bottomNav [data-garang-primary-nav="1"][data-page="log"]')));
}
function openPlanner(){afterRoute('planner',()=>doc.querySelector('#garangPlanExecution [data-gx-details]')?.click());}
function openExecution(model){
  const type=model.nextPlan?.type;
  if(type==='running'){afterRoute('running');return;}
  if(type==='nutrition'){afterRoute('nutrition');return;}
  if(type==='recovery'){
    afterRoute('today',()=>doc.querySelector('[data-action="open-checkin"]')?.click());
    return;
  }
  if(type==='workout'){afterRoute('workout');return;}
  afterRoute('planner',()=>doc.querySelector('#garangPlanExecution [data-gx-details]')?.click());
}
function handleAction(action){
  const model=currentModel();if(!model)return;
  if(action==='record'){openRecord();return;}
  if(action==='coach'){afterRoute('coach');return;}
  if(action==='checkin'){doc.querySelector('[data-action="open-checkin"]')?.click();return;}
  if(action==='planner'){openPlanner();return;}
  if(action==='execute'){openExecution(model);return;}
  if(action==='accumulation'){afterRoute('progress');return;}
  if(action==='today'){afterRoute('today');}
}
doc.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-gp-action]');if(!button)return;
  event.preventDefault();event.stopImmediatePropagation();handleAction(button.dataset.gpAction||'');
},true);
for(const eventName of ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:route-completed','garang:agent-proposal-resolved'])window.addEventListener(eventName,schedule);
doc.documentElement.addEventListener('garang:language-changed',schedule);
window.addEventListener('pageshow',schedule);
schedule();
window.GarangGoldenPathUI=Object.freeze({version:'garang-golden-path-v1.0.1',refresh:schedule});
})();
