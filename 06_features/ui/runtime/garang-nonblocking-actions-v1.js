/* GARANG Nonblocking Actions v1.1
   Visible destructive/approval actions keep canonical app.js state mutations, but native blocking
   confirm() UI is replaced with a local two-tap confirmation. Binding follows explicit UI lifecycle
   events instead of watching the entire #main subtree. No global click interception.

   Today check-in accessibility:
   - the canonical app.js check-in modal remains the single write owner
   - the decision-first Today surface gets one quiet, always-reachable check-in entry
   - when Check-in is already the primary next action, no duplicate secondary control is shown
*/
(() => {
  'use strict';
  const main=document.getElementById('main');
  if(!main||window.__garangNonblockingActionsV1)return;
  window.__garangNonblockingActionsV1=true;

  const RULES=[
    {selector:'[data-action="apply-coach-plan"]',armedKo:'한 번 더 눌러 계획 적용',armedEn:'Tap again to apply'},
    {selector:'[data-plan-delete]',armedKo:'한 번 더 눌러 삭제',armedEn:'Tap again to delete'},
    {selector:'[data-memory-delete]',armedKo:'한 번 더 눌러 삭제',armedEn:'Tap again to delete'}
  ];
  const timers=new WeakMap();
  const english=()=>document.documentElement.lang==='en';
  const pad=value=>String(value).padStart(2,'0');
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
  const sameDate=(row,date)=>String(row?.date||row?.day||row?.performedAt||row?.createdAt||'').slice(0,10)===date;

  function reset(button){
    const timer=timers.get(button);if(timer)clearTimeout(timer);timers.delete(button);
    if(!button?.isConnected)return;
    button.dataset.garangConfirmArmed='0';
    if(button.dataset.garangOriginalText!==undefined)button.textContent=button.dataset.garangOriginalText;
    button.removeAttribute('aria-live');
  }

  function invokeCanonicalWithoutNativeDialog(button,original,event){
    const nativeConfirm=window.confirm;
    try{
      window.confirm=()=>true;
      return original.call(button,event);
    }finally{
      window.confirm=nativeConfirm;
    }
  }

  function bind(button,rule){
    if(!button||button.dataset.garangNonblockingBound==='1'||typeof button.onclick!=='function')return false;
    const original=button.onclick;
    button.dataset.garangNonblockingBound='1';
    button.dataset.garangOriginalText=button.textContent||'';
    button.onclick=function(event){
      if(button.dataset.garangConfirmArmed!=='1'){
        button.dataset.garangConfirmArmed='1';
        button.textContent=english()?rule.armedEn:rule.armedKo;
        button.setAttribute('aria-live','polite');
        const timer=setTimeout(()=>reset(button),4000);timers.set(button,timer);
        return;
      }
      const timer=timers.get(button);if(timer)clearTimeout(timer);timers.delete(button);
      button.dataset.garangConfirmArmed='0';
      return invokeCanonicalWithoutNativeDialog(button,original,event);
    };
    return true;
  }

  function injectCheckinStyle(){
    if(document.getElementById('garangTodayCheckinAccessStyle'))return;
    const style=document.createElement('style');style.id='garangTodayCheckinAccessStyle';style.textContent=`
.gtf-checkin-access{appearance:none;width:100%;min-height:48px;display:grid;grid-template-columns:74px minmax(0,1fr) auto;gap:10px;align-items:center;margin:12px 0 0;padding:0 2px 0 0;border:0;border-top:1px solid rgba(242,239,233,.075);border-bottom:1px solid rgba(242,239,233,.075);border-radius:0;background:transparent;color:#f2efe9;text-align:left;cursor:pointer}
.gtf-checkin-access>span{font-size:7px;font-weight:600;letter-spacing:.16em;color:#78aa99}.gtf-checkin-access>strong{font-size:10px;font-weight:500;letter-spacing:-.01em;color:rgba(242,239,233,.72)}.gtf-checkin-access>small{font-size:8px;line-height:1.35;color:rgba(242,239,233,.34);text-align:right}.gtf-checkin-access[data-checked="0"]>strong{color:#f2efe9}.gtf-checkin-access[data-checked="0"]>small{color:#ad715b}.gtf-checkin-access:focus-visible{outline:1px solid rgba(120,170,153,.72);outline-offset:3px}.gtf-checkin-access:active{opacity:.78}
@media(max-width:390px){.gtf-checkin-access{grid-template-columns:60px minmax(0,1fr) auto;gap:8px;min-height:50px}.gtf-checkin-access>small{max-width:92px}}
@media(prefers-reduced-motion:reduce){.gtf-checkin-access{transition:none!important}}
`;document.head.appendChild(style);
  }

  function latestTodayCheckin(){
    let state=null;try{state=window.GarangAgentStateBridge?.getState?.()||null;}catch{}
    if(!state)return null;const date=today(),rows=[...(Array.isArray(state.dailyCheckins)?state.dailyCheckins:[]),...(Array.isArray(state.checkins)?state.checkins:[])];return rows.filter(row=>sameDate(row,date)).at(-1)||null;
  }

  function promoteTodayCheckin(){
    if(main.dataset.garangScreen!=='today')return;
    const flow=main.querySelector('#garangTodayFlow');if(!flow)return;
    const existing=flow.querySelector('[data-garang-checkin-access]');
    const primary=flow.querySelector('.gtf-next[data-gtf-action="open-checkin"]');
    if(primary){existing?.remove();return;}
    const context=flow.querySelector('.gtf-context');if(!context)return;
    const checkin=latestTodayCheckin(),checked=!!checkin;
    const button=existing||document.createElement('button');button.type='button';button.className='gtf-checkin-access';button.dataset.garangCheckinAccess='1';button.dataset.checked=checked?'1':'0';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',english()?(checked?'Edit today check-in':'Check in today'):(checked?'오늘 상태 수정':'오늘 상태 체크인'));
    const sleep=Number(checkin?.sleepHours??checkin?.sleep),energy=Number(checkin?.energy);
    const summary=checked?[Number.isFinite(sleep)?(english()?`Sleep ${sleep}h`:`수면 ${sleep}h`):'',Number.isFinite(energy)?(english()?`Energy ${energy}/5`:`에너지 ${energy}/5`):''].filter(Boolean).join(' · '):'';
    button.innerHTML=`<span>CHECK-IN</span><strong>${english()?(checked?'Edit state':'Today check-in'):(checked?'상태 수정':'오늘 상태 체크인')}</strong><small>${checked?(summary||(english()?'Saved':'저장됨')):(english()?'30 sec':'30초')}</small>`;
    button.onclick=()=>{const canonical=main.querySelector('[data-action="open-checkin"]');if(canonical)canonical.click();};
    if(!existing)context.insertAdjacentElement('afterend',button);
  }

  function loadTodayMorningOrchestrator(){
    if(window.GarangTodayMorningOrchestratorV1||document.querySelector('script[data-garang-today-morning-orchestrator-v1]'))return;
    const script=document.createElement('script');
    script.src='./06_features/ui/runtime/garang-today-morning-orchestrator-v1.js?v=1.0.0';
    script.dataset.garangTodayMorningOrchestratorV1='1';
    script.async=false;
    document.head.appendChild(script);
  }

  function scan(){
    for(const rule of RULES)main.querySelectorAll(rule.selector).forEach(button=>bind(button,rule));
    injectCheckinStyle();promoteTodayCheckin();loadTodayMorningOrchestrator();
  }

  let queued=false;
  function queueScan(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;scan();})));
  }
  window.addEventListener('garang:screen-rendered',queueScan);
  window.addEventListener('garang:state-updated',queueScan);
  window.addEventListener('garang:state-hydrated',queueScan);
  window.addEventListener('garang:agent-write',queueScan);
  window.addEventListener('garang:route-completed',queueScan);
  window.addEventListener('pageshow',queueScan);
  scan();queueScan();

  window.GarangNonblockingActions=Object.freeze({version:'1.1.0',scan,queueScan,promoteTodayCheckin});
})();
