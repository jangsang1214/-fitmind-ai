/* GARANG Action Data Bridge v1
   Confirmed Agent writes pass through one deterministic CRUD + durability boundary.
   The existing Agent State Bridge remains the read/state owner; this bridge performs
   atomic in-place commits so app.js keeps the same live state object reference.
   Recommendation resolution evidence is persisted here too, so User Performance Model
   learning signals share the same durable owner without moving decision ownership.
*/
(() => {
'use strict';

const Core=window.GarangActionDataReliability||null;
const Base=window.GarangAgentStateBridge||null;
const Memory=window.GarangMemoryIntelligence||null;
const Sync=window.GarangSyncDurability||null;
const CONFIRMATION_SCOPE_KEY=window.GarangAgentContractV2?.CONFIRMATION_SCOPE_KEY||'__GARANG_AGENT_CONFIRMED_WRITE_V2__';
const RECOMMENDATION_RESOLUTIONS=new Set(['accepted','rejected','dismissed','ignored']);
let syncTimer=null;

const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const clean=value=>String(value??'').trim();
function currentAuthUid(){try{return String(window.firebase?.auth?.().currentUser?.uid||'').trim()||null;}catch{return null;}}
function replaceInPlace(target,next){for(const key of Object.keys(target))delete target[key];Object.assign(target,clone(next));return target;}
function dispatchWrite(tool,args,result,key){try{window.dispatchEvent(new CustomEvent('garang:agent-write',{detail:{tool,args:clone(args||{}),result:clone(result),at:new Date().toISOString(),storageKey:key}}));window.dispatchEvent(new CustomEvent('garang:action-data-committed',{detail:{tool,id:result?.id||null,domain:result?.domain||args?.domain||null,storageKey:key}}));}catch{}}
function dispatchRecommendationEvidence(row,key){try{window.dispatchEvent(new CustomEvent('garang:recommendation-evidence-committed',{detail:{evidence:clone(row),storageKey:key}}));}catch{}}
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
function recommendationResolutionError(code,message){const error=new Error(message);error.code=code;return error;}
function normalizeRecommendationResolution(value){const resolution=clean(value).toLowerCase();if(!RECOMMENDATION_RESOLUTIONS.has(resolution))throw recommendationResolutionError('RECOMMENDATION_RESOLUTION_INVALID','Recommendation resolution must be accepted, rejected, dismissed, or ignored.');return resolution;}
function stableRecommendationIdentity(input={}){const recommendationId=clean(input.recommendationId||input.decisionId||input.proposalId||input.id);if(!recommendationId)throw recommendationResolutionError('RECOMMENDATION_ID_REQUIRED','Recommendation resolution evidence requires a stable recommendation id.');return recommendationId;}
function recommendationEvidenceId(input,resolution){const recommendationId=stableRecommendationIdentity(input),revision=Math.max(1,Number(input?.revision)||1);return `recommendation:${recommendationId}:r${revision}:${resolution}`;}
function recordRecommendationResolution(input={}){
  const target=requireReady(),resolution=normalizeRecommendationResolution(input.resolution),recommendationId=stableRecommendationIdentity(input),revision=Math.max(1,Number(input.revision)||1),id=recommendationEvidenceId(input,resolution);
  const existing=Array.isArray(target.actionLog)?target.actionLog.find(row=>clean(row?.id)===id):null;
  if(existing)return clone(existing);
  const before=clone(target),key=Base.getStorageKey?.();
  if(!key)throw new Error('ACTION_STORAGE_KEY_NOT_READY');
  const at=new Date().toISOString(),row={
    id,
    event:`recommendation_${resolution}`,
    type:'recommendation_resolution',
    resolution,
    recommendationId,
    decisionId:clean(input.decisionId)||null,
    proposalId:clean(input.proposalId||input.id)||null,
    revision,
    tool:clean(input.tool)||null,
    source:clean(input.source)||null,
    at,
    status:'success'
  };
  if(!Array.isArray(target.actionLog))target.actionLog=[];
  target.actionLog.push(row);
  if(target.actionLog.length>300)target.actionLog.splice(0,target.actionLog.length-300);
  if(!object(target.meta))target.meta={};
  target.meta.updatedAt=at;
  try{
    localStorage.setItem(key,JSON.stringify(target));
    try{const stored=JSON.parse(localStorage.getItem(key)||'null');if(object(stored))replaceInPlace(target,stored);}catch{}
    dispatchRecommendationEvidence(row,key);queueSync();return clone(row);
  }catch(error){replaceInPlace(target,before);throw error;}
}
function resolutionFromProposalStatus(status){const value=clean(status).toLowerCase();if(value==='confirmed')return 'accepted';if(value==='rejected')return 'dismissed';return null;}
function captureProposalResolution(event){
  const detail=event?.detail||{},resolution=resolutionFromProposalStatus(detail.status);
  if(!resolution)return;
  try{recordRecommendationResolution({...detail,proposalId:detail.proposalId||detail.id,resolution});}
  catch(error){try{console.warn('[GARANG] Recommendation resolution evidence was not persisted.',error);window.dispatchEvent(new CustomEvent('garang:recommendation-evidence-error',{detail:{code:error?.code||'RECOMMENDATION_EVIDENCE_PERSIST_FAILED',message:String(error?.message||error),recommendationId:detail.recommendationId||detail.id||null}}));}catch{}}
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
  applyWrite,createRecord,updateRecord,deleteRecord,recordRecommendationResolution,
  getDiagnostics:diagnostics
});
window.GarangActionDataBridge=PublicBridge;
window.addEventListener?.('garang:agent-proposal-resolved',captureProposalResolution);

/* Backward-compatible Agent State Bridge facade.
   Read ownership stays with the frozen v1 bridge, but every write now enters the
   reliability core. Existing Coach code therefore upgrades without another UI owner. */
if(Base&&Core){
  window.GarangAgentStateBridge=Object.freeze({...Base,applyWrite:(tool,args,meta)=>PublicBridge.applyWrite(tool,args,meta),getActionDataDiagnostics:diagnostics});
}
})();
