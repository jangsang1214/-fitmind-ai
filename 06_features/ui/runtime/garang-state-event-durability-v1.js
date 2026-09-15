/* GARANG State Event Durability v1.2
   Bridges the legacy app.js saveState ordering to the canonical Agent State Bridge.
   app.js can persist a state snapshot just before adding the semantic lifecycle event.
   A following route write may therefore overwrite storage/bridge with that stale snapshot.
   This boundary keeps lifecycle evidence scoped to its exact storage key and re-injects
   missing evidence before any later state write reaches the existing persistence chain.
*/
(() => {
'use strict';
if(window.GarangStateEventDurabilityV1)return;

let committing=false;
const previousSetItem=Storage.prototype.setItem;
const requiredByKey=new Map();
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const isStateKey=key=>/^garang_(?:demo_state_v3|user_.+_v3)$/.test(String(key||''));
const eventId=()=>globalThis.crypto?.randomUUID?.()||`evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;

function requiredEvents(key){
  const normalized=String(key||'');
  if(!requiredByKey.has(normalized))requiredByKey.set(normalized,new Map());
  return requiredByKey.get(normalized);
}
function ensureAnalytics(state){
  state.analytics=isObject(state.analytics)?state.analytics:{events:[]};
  state.analytics.events=Array.isArray(state.analytics.events)?state.analytics.events:[];
  return state.analytics.events;
}
function rememberLifecycle(key,eventName,source,live){
  if(!eventName)return null;
  const events=ensureAnalytics(live);
  const existing=[...events].reverse().find(row=>row?.name===eventName)||null;
  const row=existing||{
    id:eventId(),
    name:eventName,
    props:{source:String(source||'app'),durabilityBoundary:'state-event-v1'},
    at:new Date().toISOString()
  };
  if(!existing)events.push(row);
  requiredEvents(key).set(eventName,clone(row));
  if(events.length>500)events.splice(0,events.length-500);
  return row;
}
function mergeRequired(key,state){
  if(!isObject(state))return state;
  const required=requiredByKey.get(String(key||''));
  if(!required?.size)return state;
  const events=ensureAnalytics(state);
  for(const [name,row] of required){
    if(events.some(event=>event?.name===name))continue;
    events.push(clone(row));
  }
  if(events.length>500)events.splice(0,events.length-500);
  return state;
}

/* This wrapper is deliberately installed after the existing sync + Agent bridge wrappers.
   It changes only state-key payloads and delegates the final write to the full canonical
   persistence chain, so account pinning, durability metadata and bridge capture remain owned
   by their existing runtimes. */
Storage.prototype.setItem=function(key,value){
  if(this!==localStorage||!isStateKey(key))return previousSetItem.call(this,key,value);
  try{
    const parsed=JSON.parse(String(value));
    if(isObject(parsed))return previousSetItem.call(this,key,JSON.stringify(mergeRequired(key,parsed)));
  }catch{}
  return previousSetItem.call(this,key,value);
};

function publishAppStateSync(key,event){
  try{
    window.dispatchEvent(new CustomEvent('garang:agent-write',{detail:{
      tool:'state_lifecycle_sync',
      internalSync:true,
      source:String(event?.detail?.source||'app'),
      event:String(event?.detail?.event||'state_saved'),
      storageKey:key,
      at:new Date().toISOString()
    }}));
  }catch{}
}

function commitLifecycleEvent(event){
  if(committing)return false;
  const bridge=window.GarangAgentStateBridge;
  if(!bridge?.ready?.())return false;
  const key=bridge.getStorageKey?.();
  const live=bridge.getLiveState?.();
  if(!key||!live||typeof live!=='object')return false;

  const eventName=String(event?.detail?.event||'').trim();
  rememberLifecycle(key,eventName,event?.detail?.source,live);

  try{
    committing=true;
    localStorage.setItem(key,JSON.stringify(live));
    publishAppStateSync(key,event);
    return true;
  }catch(error){
    console.warn('[GARANG] state-event durability commit deferred',error?.message||error);
    return false;
  }finally{
    committing=false;
  }
}

window.addEventListener('garang:state-updated',commitLifecycleEvent);
window.GarangStateEventDurabilityV1=Object.freeze({
  version:'1.2.0',
  commit:event=>commitLifecycleEvent(event),
  snapshot:()=>clone(window.GarangAgentStateBridge?.getState?.()||null),
  required:key=>clone([...(requiredByKey.get(String(key||''))?.values()||[])])
});
})();
