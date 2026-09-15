/* GARANG State Event Durability v1
   Bridges the legacy app.js saveState ordering to the canonical Agent State Bridge.
   app.js emits `garang:state-updated` after adding its semantic event, but the legacy
   local write happens just before that event is added. This boundary commits the live
   bridge object once more at the lifecycle boundary so subsequent routes cannot read
   or persist a stale pre-event snapshot.
*/
(() => {
'use strict';
if(window.GarangStateEventDurabilityV1)return;

let committing=false;
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));

function commitLifecycleEvent(event){
  if(committing)return false;
  const bridge=window.GarangAgentStateBridge;
  if(!bridge?.ready?.())return false;
  const key=bridge.getStorageKey?.();
  const live=bridge.getLiveState?.();
  if(!key||!live||typeof live!=='object')return false;

  const eventName=String(event?.detail?.event||'').trim();
  live.analytics=live.analytics&&typeof live.analytics==='object'?live.analytics:{events:[]};
  live.analytics.events=Array.isArray(live.analytics.events)?live.analytics.events:[];

  /* The app normally already added this event to the same live object. If a legacy
     write boundary supplied an older object, the lifecycle envelope is enough evidence
     to restore the missing event exactly once before the next route can consume state. */
  if(eventName&&!live.analytics.events.some(row=>row?.name===eventName)){
    live.analytics.events.push({
      id:globalThis.crypto?.randomUUID?.()||`evt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name:eventName,
      props:{source:String(event?.detail?.source||'app'),durabilityBoundary:'state-event-v1'},
      at:new Date().toISOString()
    });
    if(live.analytics.events.length>500)live.analytics.events.splice(0,live.analytics.events.length-500);
  }

  try{
    committing=true;
    localStorage.setItem(key,JSON.stringify(live));
    return true;
  }catch(error){
    console.warn('[GARANG] state-event durability commit deferred',error?.message||error);
    return false;
  }finally{
    committing=false;
  }
}

window.addEventListener('garang:state-updated',commitLifecycleEvent);
window.GarangStateEventDurabilityV1=Object.freeze({version:'1.0.0',commit:event=>commitLifecycleEvent(event),snapshot:()=>clone(window.GarangAgentStateBridge?.getState?.()||null)});
})();