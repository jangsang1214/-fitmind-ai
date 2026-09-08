/* GARANG Action Data Bridge v1
   Confirmed Agent writes pass through one deterministic CRUD + durability boundary.
   The existing Agent State Bridge remains the read/state owner; this bridge performs
   atomic in-place commits so app.js keeps the same live state object reference.
*/
(() => {
'use strict';

const Core=window.GarangActionDataReliability||null;
const Base=window.GarangAgentStateBridge||null;
const Memory=window.GarangMemoryIntelligence||null;
const Sync=window.GarangSyncDurability||null;
const CONFIRMATION_SCOPE_KEY=window.GarangAgentContractV2?.CONFIRMATION_SCOPE_KEY||'__GARANG_AGENT_CONFIRMED_WRITE_V2__';
let syncTimer=null;

const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
function currentAuthUid(){try{return String(window.firebase?.auth?.().currentUser?.uid||'').trim()||null;}catch{return null;}}
function replaceInPlace(target,next){for(const key of Object.keys(target))delete target[key];Object.assign(target,clone(next));return target;}
function dispatchWrite(tool,args,result,key){try{window.dispatchEvent(new CustomEvent('garang:agent-write',{detail:{tool,args:clone(args||{}),result:clone(result),at:new Date().toISOString(),storageKey:key}}));window.dispatchEvent(new CustomEvent('garang:action-data-committed',{detail:{tool,id:result?.id||null,domain:result?.domain||args?.domain||null,storageKey:key}}));}catch{}}
function queueSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>{try{if(window.firebase?.auth?.().currentUser)document.getElementById('syncBadge')?.click();}catch{}},120);}
function requireReady(){if(!Core||!Base?.ready?.())throw new Error('ACTION_DATA_BRIDGE_NOT_READY');return Base.getLiveState();}
function effectiveWriteMeta(meta){
  if(meta?.userConfirmed===true||meta?.confirmed===true)return meta;
  const scoped=window[CONFIRMATION_SCOPE_KEY];
  return scoped?.userConfirmed===true?scoped:(meta||{});
}
function persistOutcome(outcome,tool,args){
  const target=requireReady();
  if(outcome?.duplicate===true)return clone(outcome.result);
  const before=clone(target),key=Base.getStorageKey?.();
  if(!key)throw new Error('ACTION_STORAGE_KEY_NOT_READY');
  replaceInPlace(target,outcome.state);
  try{
    localStorage.setItem(key,JSON.stringify(target));
    try{const stored=JSON.parse(localStorage.getItem(key)||'null');if(object(stored))replaceInPlace(target,stored);}catch{}
    dispatchWrite(tool,args,outcome.result,key);queueSync();return clone(outcome.result);
  }catch(error){replaceInPlace(target,before);throw error;}
}
function applyWrite(tool,args={},meta={}){
  const target=requireReady(),resolvedMeta=effectiveWriteMeta(meta);
  const confirmed=resolvedMeta?.userConfirmed===true||resolvedMeta?.confirmed===true;
  const outcome=Core.executeTool(target,tool,args,{
    userConfirmed:confirmed,
    ownerUid:currentAuthUid(),
    idempotencyKey:resolvedMeta?.callId||resolvedMeta?.idempotencyKey||args?.idempotencyKey||null,
    memory:Memory,
    sync:Sync
  });
  return persistOutcome(outcome,tool,args);
}
function createRecord(domain,record,meta={}){return applyWrite('createRecord',{domain,record},meta);}
function updateRecord(domain,id,patch,meta={}){return applyWrite('updateRecord',{domain,id,patch,expectedRevision:meta.expectedRevision},meta);}
function deleteRecord(domain,id,meta={}){return applyWrite('deleteRecord',{domain,id},meta);}
function diagnostics(){const state=requireReady();return clone(Core.diagnostics(state));}

const PublicBridge=Object.freeze({
  version:'garang-action-data-bridge-v1',
  contractVersion:Core?.ACTION_CONTRACT_VERSION||null,
  ready:()=>!!Core&&!!Base?.ready?.(),
  applyWrite,createRecord,updateRecord,deleteRecord,
  getDiagnostics:diagnostics
});
window.GarangActionDataBridge=PublicBridge;

/* Backward-compatible Agent State Bridge facade.
   Read ownership stays with the frozen v1 bridge, but every write now enters the
   reliability core. Existing Coach code therefore upgrades without another UI owner. */
if(Base&&Core){
  window.GarangAgentStateBridge=Object.freeze({...Base,applyWrite:(tool,args,meta)=>PublicBridge.applyWrite(tool,args,meta),getActionDataDiagnostics:diagnostics});
}
})();
