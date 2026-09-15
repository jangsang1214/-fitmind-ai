/* GARANG State Event Durability v1.4
   Compatibility boundary for legacy app.js saveState ordering.
   app.js persists immediately before adding its semantic analytics event, so a later
   stale write can drop that just-created occurrence. At lifecycle time we diff the live
   events against the just-persisted pre-event snapshot and protect the exact new event id.
   Repeated event names remain distinct and only a small recent occurrence window is kept.
*/
(() => {
'use strict';
if(window.GarangStateEventDurabilityV1)return;

let committing=false;
const previousSetItem=Storage.prototype.setItem;
const protectedByKey=new Map();
const MAX_PROTECTED=64;
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const isStateKey=key=>/^garang_(?:demo_state_v3|user_.+_v3)$/.test(String(key||''));
const eventId=()=>globalThis.crypto?.randomUUID?.()||`evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;

function ensureAnalytics(state){
  state.analytics=isObject(state.analytics)?state.analytics:{events:[]};
  state.analytics.events=Array.isArray(state.analytics.events)?state.analytics.events:[];
  return state.analytics.events;
}
function protectedEvents(key){
  const normalized=String(key||'');
  if(!protectedByKey.has(normalized))protectedByKey.set(normalized,[]);
  return protectedByKey.get(normalized);
}
function readPersisted(key){
  try{const parsed=JSON.parse(localStorage.getItem(key)||'null');return isObject(parsed)?parsed:null;}catch{return null;}
}
function syntheticEvent(name,source){return {
  id:eventId(),
  name,
  props:{source:String(source||'app'),durabilityBoundary:'state-event-v1'},
  at:new Date().toISOString()
};}
function rememberOccurrence(key,eventName,source,live){
  if(!eventName)return null;
  const liveEvents=ensureAnalytics(live),persisted=readPersisted(key),persistedEvents=Array.isArray(persisted?.analytics?.events)?persisted.analytics.events:[];
  const persistedIds=new Set(persistedEvents.map(row=>String(row?.id||'')).filter(Boolean));
  const occurrence=[...liveEvents].reverse().find(row=>row?.name===eventName&&row?.id&&!persistedIds.has(String(row.id)))||syntheticEvent(eventName,source);
  const protectedList=protectedEvents(key),id=String(occurrence.id);
  if(!protectedList.some(row=>String(row?.id)===id))protectedList.push(clone(occurrence));
  if(protectedList.length>MAX_PROTECTED)protectedList.splice(0,protectedList.length-MAX_PROTECTED);
  if(!liveEvents.some(row=>String(row?.id||'')===id))liveEvents.push(clone(occurrence));
  if(liveEvents.length>500)liveEvents.splice(0,liveEvents.length-500);
  return occurrence;
}
function mergeProtected(key,state){
  if(!isObject(state))return state;
  const protectedList=protectedByKey.get(String(key||''));
  if(!protectedList?.length)return state;
  const events=ensureAnalytics(state),ids=new Set(events.map(row=>String(row?.id||'')).filter(Boolean));
  for(const row of protectedList){
    const id=String(row?.id||'');if(!id||ids.has(id))continue;
    events.push(clone(row));ids.add(id);
  }
  if(events.length>500)events.splice(0,events.length-500);
  return state;
}

/* Installed outside existing sync + Agent bridge wrappers. We amend only GARANG state-key
   payloads, then delegate to the full canonical persistence chain. */
Storage.prototype.setItem=function(key,value){
  if(this!==localStorage||!isStateKey(key))return previousSetItem.call(this,key,value);
  try{
    const parsed=JSON.parse(String(value));
    if(isObject(parsed))return previousSetItem.call(this,key,JSON.stringify(mergeProtected(key,parsed)));
  }catch{}
  return previousSetItem.call(this,key,value);
};

function publishAppStateSync(key,event){
  try{
    window.dispatchEvent(new CustomEvent('garang:agent-write',{detail:{
      tool:'state_lifecycle_sync',internalSync:true,
      source:String(event?.detail?.source||'app'),event:String(event?.detail?.event||'state_saved'),
      storageKey:key,at:new Date().toISOString()
    }}));
  }catch{}
}
function commitLifecycleEvent(event){
  if(committing)return false;
  const bridge=window.GarangAgentStateBridge;
  if(!bridge?.ready?.())return false;
  const key=bridge.getStorageKey?.(),live=bridge.getLiveState?.();
  if(!key||!live||typeof live!=='object')return false;
  const eventName=String(event?.detail?.event||'').trim();
  rememberOccurrence(key,eventName,event?.detail?.source,live);
  try{
    committing=true;
    localStorage.setItem(key,JSON.stringify(live));
    publishAppStateSync(key,event);
    return true;
  }catch(error){
    console.warn('[GARANG] state-event durability commit deferred',error?.message||error);
    return false;
  }finally{committing=false;}
}

window.addEventListener('garang:state-updated',commitLifecycleEvent);
window.GarangStateEventDurabilityV1=Object.freeze({
  version:'1.4.0',
  commit:event=>commitLifecycleEvent(event),
  snapshot:()=>clone(window.GarangAgentStateBridge?.getState?.()||null),
  protected:key=>clone(protectedByKey.get(String(key||''))||[])
});
})();
