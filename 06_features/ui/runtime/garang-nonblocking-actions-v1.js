/* GARANG Nonblocking Actions v1.3
   Visible destructive/approval actions keep canonical app.js state mutations, but native blocking
   confirm() UI is replaced with a local two-tap confirmation. Binding follows explicit UI lifecycle
   events instead of watching the entire #main subtree. No global click interception.

   Today check-in accessibility:
   - the canonical app.js check-in modal remains the single write owner
   - the brand-first Today surface gets exactly one quiet, always-reachable check-in entry
   - any Action Flow check-in CTA is internalized so it cannot compete with that single entry
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
  const localDate=value=>{const d=value instanceof Date?value:new Date(value);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`:'';};
  const today=()=>localDate(new Date());
  const rowDate=row=>{const explicit=String(row?.date||row?.day||'').trim();if(/^\d{4}-\d{2}-\d{2}/.test(explicit))return explicit.slice(0,10);const raw=row?.performedAt||row?.createdAt||row?.updatedAt||'';return raw?localDate(raw):'';};
  const sameDate=(row,date)=>rowDate(row)===date;

  function reset(button){
    const timer=timers.get(button);if(timer)clearTimeout(timer);timers.delete(button);
    if(!button?.isConnected)return;
    button.dataset.garangConfirmArmed='0';
    if(button.dataset.garangOriginalText!==undefined)button.textContent=button.dataset.garangOriginalText;
    button.removeAttribute('aria-live');
  }

  function invokeCanonicalWithoutNativeDialog(button,original,event){
    const nativeConfirm=window.confirm;
    try{window.confirm=()=>true;return original.call(button,event);}finally{window.confirm=nativeConfirm;}
  }

  function bind(button,rule){
    if(!button||button.dataset.garangNonblockingBound==='1'||typeof button.onclick!=='function')return false;
    const original=button.onclick;button.dataset.garangNonblockingBound='1';button.dataset.garangOriginalText=button.textContent||'';
    button.onclick=function(event){
      if(button.dataset.garangConfirmArmed!=='1'){
        button.dataset.garangConfirmArmed='1';button.textContent=english()?rule.armedEn:rule.armedKo;button.setAttribute('aria-live','polite');const timer=setTimeout(()=>reset(button),4000);timers.set(button,timer);return;
      }
      const timer=timers.get(button);if(timer)clearTimeout(timer);timers.delete(button);button.dataset.garangConfirmArmed='0';return invokeCanonicalWithoutNativeDialog(button,original,event);
    };
    return true;
  }

  function injectCheckinStyle(){
    if(document.getElementById('garangTodayCheckinAccessStyle'))return;
    const style=document.createElement('style');style.id='garangTodayCheckinAccessStyle';style.textContent=`
.gtf-checkin-access{appearance:none;width:100%;min-height:64px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:center;margin:12px 0 0;padding:11px 0;border:0;border-top:1px solid rgba(120,170,153,.16);border-bottom:1px solid rgba(242,239,233,.07);border-radius:0;background:transparent;color:#f2efe9;text-align:left;cursor:pointer;box-shadow:none}
.gtf-checkin-access>span{font-size:7px;font-weight:600;letter-spacing:.16em;color:#78aa99}.gtf-checkin-access>strong{font-size:12px;font-weight:600;letter-spacing:-.01em;color:rgba(242,239,233,.86)}.gtf-checkin-access>small{grid-column:2;grid-row:1/3;font-size:8px;line-height:1.35;color:rgba(242,239,233,.34);text-align:right}.gtf-checkin-access:focus-visible{outline:1px solid rgba(120,170,153,.72);outline-offset:3px}.gtf-checkin-access:active{opacity:.78}
@media(max-width:390px){.gtf-checkin-access{min-height:66px}.gtf-checkin-access>small{max-width:112px}}
@media(prefers-reduced-motion:reduce){.gtf-checkin-access{transition:none!important}}
`;document.head.appendChild(style);
  }

  function latestTodayCheckin(){
    let state=null;try{state=window.GarangAgentStateBridge?.getState?.()||null;}catch{}
    if(!state)return null;const date=today(),rows=[...(Array.isArray(state.dailyCheckins)?state.dailyCheckins:[]),...(Array.isArray(state.checkins)?state.checkins:[])];return rows.filter(row=>sameDate(row,date)).at(-1)||null;
  }

  function internalizePrimaryCheckin(flow){
    const primary=flow?.querySelector('.gtf-next[data-gtf-action="open-checkin"]');
    if(!primary)return false;
    primary.hidden=true;primary.setAttribute('aria-hidden','true');primary.tabIndex=-1;primary.dataset.garangCheckinInternalized='1';
    const action=primary.closest('.gtf-action');if(action)action.style.setProperty('display','none','important');
    return true;
  }

  function pinEditorialCheckin(button){
    if(!button)return;
    button.style.setProperty('border-radius','0px','important');
    button.style.setProperty('background','transparent','important');
    button.style.setProperty('box-shadow','none','important');
    button.style.setProperty('border-left','0','important');
    button.style.setProperty('border-right','0','important');
    button.style.setProperty('border-top','1px solid rgba(120,170,153,.16)','important');
    button.style.setProperty('border-bottom','1px solid rgba(242,239,233,.07)','important');
  }

  function promoteTodayCheckin(){
    if(main.dataset.garangScreen!=='today')return;
    const flow=main.querySelector('#garangTodayFlow');if(!flow)return;
    internalizePrimaryCheckin(flow);
    const existing=flow.querySelector('[data-garang-checkin-access]'),context=flow.querySelector('.gtf-context');if(!context)return;
    const checkin=latestTodayCheckin(),checked=!!checkin,hour=new Date().getHours(),morning=hour>=5&&hour<12,action=flow.querySelector('.gtf-action');
    const todaySingleActionOwned=main.dataset.garangNextOwner==='today-action-flow'&&!!main.dataset.gsnAction&&main.dataset.gsnAction!=='checkin';
    if(action&&!flow.querySelector('.gtf-next[data-gtf-action="open-checkin"]')&&!todaySingleActionOwned){if(checked)action.style.removeProperty('display');else action.style.setProperty('display','none','important');}
    const button=existing||document.createElement('button');button.type='button';button.className='gtf-checkin-access';button.dataset.garangCheckinAccess='1';button.dataset.checked=checked?'1':'0';button.dataset.gtoPriority=checked?'0':'1';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',english()?(checked?'Edit today check-in':'Check in today'):(checked?'오늘 상태 수정':'오늘 상태 체크인'));pinEditorialCheckin(button);
    const sleep=Number(checkin?.sleepHours??checkin?.sleep),energy=Number(checkin?.energy),summary=checked?[Number.isFinite(sleep)?(english()?`Sleep ${sleep}h`:`수면 ${sleep}h`):'',Number.isFinite(energy)?(english()?`Energy ${energy}/5`:`에너지 ${energy}/5`):''].filter(Boolean).join(' · '):'';
    const nextHtml=checked
      ?`<span>${english()?'STATE':'상태'}</span><strong>${english()?'Edit':'수정'}</strong><small>${summary||(english()?'Saved':'저장됨')}</small>`
      :`<span>${english()?(morning?'MORNING':'CHECK-IN'):(morning?'아침':'상태')}</span><strong>${english()?'Today check-in':'오늘 상태 체크인'}</strong><small>${english()?'30 sec · 3 tracks':'30초 · 3영역 자동 조정'}</small>`;
    const signature=`${english()?'en':'ko'}|${checked?'1':'0'}|${morning?'1':'0'}|${summary}`;
    if(button.dataset.garangCheckinContentSignature!==signature){
      const motionCanvas=button.querySelector('.gtd3-motion-canvas');
      button.innerHTML=nextHtml;
      if(motionCanvas)button.appendChild(motionCanvas);
      button.dataset.garangCheckinContentSignature=signature;
    }
    button.onclick=()=>{const canonical=main.querySelector('[data-action="open-checkin"]');if(canonical)canonical.click();};
    if(!existing)context.insertAdjacentElement('afterend',button);
  }

  function loadTodayMorningOrchestrator(){
    if(window.GarangTodayMorningOrchestratorV1||document.querySelector('script[data-garang-today-morning-orchestrator-v1]'))return;
    const script=document.createElement('script');script.src='./06_features/ui/runtime/garang-today-morning-orchestrator-v1.js?v=1.4.1-stable-motion';script.dataset.garangTodayMorningOrchestratorV1='1';script.async=false;document.head.appendChild(script);
  }

  function loadTodayDensity(){
    if(window.GarangTodayDensityV1||document.querySelector('script[data-garang-today-density-v1]'))return;
    const script=document.createElement('script');script.src='./06_features/ui/runtime/garang-today-density-v1.js?v=4.0.0-mobile-first';script.dataset.garangTodayDensityV1='1';script.async=false;document.head.appendChild(script);
  }

  function loadAccumulationMotion(){
    if(window.GarangAccumulationMotionV1||document.querySelector('script[data-garang-accumulation-motion-v1]'))return;
    const script=document.createElement('script');script.src='./06_features/ui/runtime/garang-accumulation-motion-v1.js?v=4.0.0-ink-water';script.dataset.garangAccumulationMotionV1='1';script.async=false;document.head.appendChild(script);
  }

  function scan(){for(const rule of RULES)main.querySelectorAll(rule.selector).forEach(button=>bind(button,rule));injectCheckinStyle();promoteTodayCheckin();loadTodayMorningOrchestrator();loadTodayDensity();loadAccumulationMotion();}
  let queued=false,delayedScanTimer=0;
  function queueScan(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;scan();})));}
  function queueLifecycleScan(){queueScan();clearTimeout(delayedScanTimer);delayedScanTimer=setTimeout(()=>{queueScan();window.GarangAccumulationMotionV1?.sync?.();},340);}
  function immediateLifecycleScan(){scan();queueLifecycleScan();}
  window.addEventListener('garang:screen-rendered',immediateLifecycleScan);window.addEventListener('garang:state-updated',queueLifecycleScan);window.addEventListener('garang:state-hydrated',queueLifecycleScan);window.addEventListener('garang:agent-write',queueLifecycleScan);window.addEventListener('garang:route-completed',immediateLifecycleScan);window.addEventListener('pageshow',immediateLifecycleScan);
  scan();queueLifecycleScan();
  // Preserve the public compatibility version; Today visual and motion loaders are cache-versioned independently.
  window.GarangNonblockingActions=Object.freeze({version:'1.2.3',scan,queueScan,promoteTodayCheckin});
})();