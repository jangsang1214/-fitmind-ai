/* GARANG State Event Durability v1.3
   Bridges the legacy app.js saveState ordering to the canonical Agent State Bridge.
   app.js can persist a state snapshot just before adding the semantic lifecycle event.
   A following route write may therefore overwrite storage/bridge with that stale snapshot.
   This boundary preserves the minimum observed occurrence count for each semantic event,
   scoped to the exact GARANG storage key, while delegating writes to the canonical chain.
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

function requirements(key){
  const normalized=String(key||'');
  if(!requiredByKey.has(normalized))requiredByKey.set(normalized,new Map());
  return requiredByKey.get(normalized);
}
function ensureAnalytics(state){
  state.analytics=isObject(state.analytics)?state.analytics:{events:[]};
  state.analytics.events=Array.isArray(state.analytics.events)?state.analytics.events:[];
  return state.analytics.events;
}
function countNamed(events,name){let count=0;for(const row of events)if(row?.name===name)count++;return count;}
function syntheticEvent(name,source){return {
  id:eventId(),
  name,
  props:{source:String(source||'app'),durabilityBoundary:'state-event-v1'},
  at:new Date().toISOString()
};}
function advanceRequirement(key,eventName,source,live){
  if(!eventName)return null;
  const events=ensureAnalytics(live),required=requirements(key),observed=countNamed(events,eventName),prior=required.get(eventName);
  /* First observation may already include the current app-owned event because the bridge
     can share app.js' live object. Keep that count as the baseline. On subsequent lifecycle
     occurrences the required count must advance by exactly one unless app.js already advanced
     it itself. This preserves legitimate repeated events without duplicating healthy writes. */
  const target=prior==null?Math.max(1,observed):Math.max(observed,prior+1);
  required.set(eventName,{count:target,source:String(source||'app')});
  while(countNamed(events,eventName)<target)events.push(syntheticEvent(eventName,source));
  if(events.length>500)events.splice(0,events.length-500);
  return target;
}
function mergeRequired(key,state){
  if(!isObject(state))return state;
  const required=requiredByKey.get(String(key||''));
  if(!required?.size)return state;
  const events=ensureAnalytics(state);
  for(const [name,meta] of required){
    while(countNamed(events,name)<Number(meta?.count||0))events.push(syntheticEvent(name,meta?.source));
  }
  if(events.length>500)events.splice(0,events.length-500);
  return state;
}

/* Installed after the existing sync + Agent bridge wrappers. Only state-key payloads are
   amended; account pinning, sync metadata and live bridge capture stay with existing owners. */
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
  advanceRequirement(key,eventName,event?.detail?.source,live);

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
  version:'1.3.0',
  commit:event=>commitLifecycleEvent(event),
  snapshot:()=>clone(window.GarangAgentStateBridge?.getState?.()||null),
  required:key=>clone(Object.fromEntries(requiredByKey.get(String(key||''))||[]))
});
})();
