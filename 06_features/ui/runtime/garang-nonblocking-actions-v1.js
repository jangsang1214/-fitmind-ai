/* GARANG Nonblocking Actions v1.1
   Visible destructive/approval actions keep canonical app.js state mutations, but native blocking
   confirm() UI is replaced with a local two-tap confirmation. Binding follows explicit UI lifecycle
   events instead of watching the entire #main subtree. No global click interception. */
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

  function scan(){
    for(const rule of RULES)main.querySelectorAll(rule.selector).forEach(button=>bind(button,rule));
  }

  let queued=false;
  function queueScan(){
    if(queued)return;queued=true;
    queueMicrotask(()=>{queued=false;scan();});
  }
  window.addEventListener('garang:screen-rendered',queueScan);
  window.addEventListener('garang:state-updated',queueScan);
  window.addEventListener('garang:state-hydrated',queueScan);
  window.addEventListener('garang:agent-write',queueScan);
  window.addEventListener('pageshow',queueScan);
  scan();

  window.GarangNonblockingActions=Object.freeze({version:'1.1.0',scan,queueScan});
})();
