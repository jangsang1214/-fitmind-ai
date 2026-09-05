/* GARANG sync durability runtime v1.3
   Harden local/cloud persistence before app.js without owning ordinary app clicks.
*/
(() => {
'use strict';

const Core=window.GarangSyncDurability,Sanitizer=window.GarangStateSanitizer;
if(!Core||window.__garangSyncDurabilityRuntime)return;
window.__garangSyncDurabilityRuntime=true;

const nativeParse=JSON.parse.bind(JSON),nativeStringify=JSON.stringify.bind(JSON);
const baseSetItem=Storage.prototype.setItem,baseGetItem=Storage.prototype.getItem,baseRemoveItem=Storage.prototype.removeItem;
const DEVICE_KEY='garang_sync_device_v1',PENDING_PREFIX='garang_sync_pending_v1::',BACKUP_PREFIX='garang_sync_backup_v1::';
let activeAuthUid=null,retryTimer=null,firestorePatched=false,authWatching=false;

function uuid(){return globalThis.crypto?.randomUUID?.()||`device_${Date.now()}_${Math.random().toString(36).slice(2)}`;}
function deviceId(){let value=baseGetItem.call(localStorage,DEVICE_KEY);if(!value){value=uuid();baseSetItem.call(localStorage,DEVICE_KEY,value);}return value;}
const DEVICE_ID=deviceId();
function safeParse(raw){try{return raw?nativeParse(raw):null;}catch{return null;}}
function readRaw(key){try{return baseGetItem.call(localStorage,key);}catch{return null;}}
function ownerForKey(key){try{return Core.ownerFromKey(key);}catch{return null;}}
function sanitize(value,ownerUid=null){try{return Sanitizer?.sanitizeState?Sanitizer.sanitizeState(value,{ownerUid}):value;}catch{return value;}}
function readStateKey(key){const value=safeParse(readRaw(key));return value?sanitize(value,ownerForKey(key)):value;}
function readUserState(uid){return readStateKey(Core.stateKey(uid));}
function toast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(el.__garangSyncTimer);el.__garangSyncTimer=setTimeout(()=>el.classList.remove('show'),2200);}
function currentUid(){try{return window.firebase?.auth?.().currentUser?.uid||activeAuthUid||null;}catch{return activeAuthUid||null;}}
function pendingKey(uid){return `${PENDING_PREFIX}${uid}`;}
function backupKey(key){return `${BACKUP_PREFIX}${key}`;}
function readPending(uid){return safeParse(readRaw(pendingKey(uid)))||null;}
function writePending(uid,value){baseSetItem.call(localStorage,pendingKey(uid),nativeStringify(value));}
function clearPending(uid){if(!uid)return;try{baseRemoveItem.call(localStorage,pendingKey(uid));}catch{}if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}}
function markPending(uid,reason,{increment=true}={}){if(!uid)return;const previous=readPending(uid)||{},attempt=increment?(Number(previous.attempt)||0)+1:(Number(previous.attempt)||0);writePending(uid,{uid,attempt,reason:String(reason||'pending'),updatedAt:new Date().toISOString()});scheduleRetry(uid);}
function scheduleRetry(uid,{immediate=false}={}){if(!uid||uid!==currentUid()||navigator.onLine===false)return;if(retryTimer)clearTimeout(retryTimer);const pending=readPending(uid);if(!pending)return;retryTimer=setTimeout(()=>{retryTimer=null;triggerRetry(uid);},immediate?180:Core.retryDelay(pending.attempt||0));}
function triggerRetry(uid){if(!uid||uid!==currentUid()||navigator.onLine===false)return;const badge=document.getElementById('syncBadge');if(!badge){retryTimer=setTimeout(()=>triggerRetry(uid),900);return;}badge.click();}
function syncError(code,message=code){const error=new Error(message);error.code=code;return error;}
function statePathUid(ref){const match=String(ref?.path||'').match(/^users\/([^/]+)\/app\/state$/);return match?match[1]:null;}
function stripCloudFields(value){if(!value||typeof value!=='object')return {};const out={...value};delete out.cloudUpdatedAt;return out;}
function safeCloudState(value,uid){return sanitize(stripCloudFields(value),uid);}
function mergeSyncMeta(outgoing,persisted,uid){const out=safeCloudState(outgoing,uid);out.meta={...(out.meta||{})};const meta=persisted?.meta||{};for(const key of ['syncOwnerUid','syncDeviceId','syncRevision','syncLastLocalAt','syncLastMergeAt','syncTombstones'])if(meta[key]!==undefined)out.meta[key]=meta[key];if(!out.meta.syncOwnerUid)out.meta.syncOwnerUid=uid;return out;}
function snapshotWithData(snapshot,data){return {exists:snapshot.exists,id:snapshot.id,ref:snapshot.ref,metadata:snapshot.metadata,data:()=>data,get:field=>data?.[field]};}
function stateFingerprint(value){try{return Core.fingerprint(value);}catch{return '';}}
function onboardingReady(value){return !!(value?.onboarding?.complete||value?.onboarding?.skipped);}
function publishCloudStateReady(uid,before,after){
  const detail=Object.freeze({uid:String(uid),onboardingReady:onboardingReady(after),needsTodayRoute:onboardingReady(after)&&!onboardingReady(before),at:new Date().toISOString()});
  window.__garangCloudStateReady=detail;
  window.dispatchEvent(new CustomEvent('garang:cloud-state-ready',{detail}));
}

/* Preserve sync metadata, but sanitize malformed rows before anything can reach app render. */
Storage.prototype.setItem=function(key,value){
  if(this!==localStorage||!Core.isStateKey(key))return baseSetItem.call(this,key,value);
  const previousRaw=readRaw(key),previous=safeParse(previousRaw),parsed=safeParse(String(value));
  if(!parsed)return baseSetItem.call(this,key,value);
  const ownerUid=ownerForKey(key),next=sanitize(parsed,ownerUid),deletes=Core.collectNewTombstones(previous,next,{ownerUid,clock:Date.now()});
  let hardened;
  try{hardened=Core.withLocalMetadata(previous,next,{ownerUid,deviceId:DEVICE_ID,clock:Date.now()});}
  catch(error){if(previousRaw)baseSetItem.call(localStorage,backupKey(key),previousRaw);throw error;}
  const mergeChanged=String(previous?.meta?.syncLastMergeAt||'')!==String(hardened?.meta?.syncLastMergeAt||'');
  if(previousRaw&&(deletes.length||mergeChanged))baseSetItem.call(localStorage,backupKey(key),previousRaw);
  return baseSetItem.call(this,key,nativeStringify(hardened));
};

function methodOwner(object,name){let current=object;while(current){if(Object.prototype.hasOwnProperty.call(current,name)&&typeof current[name]==='function')return current;current=Object.getPrototypeOf(current);}return null;}
function patchFirestore(){
  if(firestorePatched)return true;
  try{
    if(!window.firebase?.apps?.length)return false;
    const db=window.firebase.firestore(),probe=db.collection('__garang_sync_probe__').doc('__probe__');
    const setOwner=methodOwner(probe,'set'),getOwner=methodOwner(probe,'get');if(!setOwner||!getOwner)return false;
    if(setOwner.__garangDurabilityPatched||getOwner.__garangDurabilityPatched){firestorePatched=true;return true;}
    const originalSet=setOwner.set,originalGet=getOwner.get;

    getOwner.get=async function(...args){
      const uid=statePathUid(this);if(!uid)return originalGet.apply(this,args);
      const auth=currentUid();if(auth&&auth!==uid)throw syncError('STALE_ACCOUNT_READ','Blocked a stale account sync read.');
      if(navigator.onLine===false){markPending(uid,'offline_read');throw syncError('unavailable','Offline sync deferred.');}
      const snapshot=await originalGet.apply(this,args);if(!snapshot?.exists)return snapshot;
      const remote=safeCloudState(snapshot.data(),uid),local=readUserState(uid);
      if(!local){publishCloudStateReady(uid,null,remote);return snapshotWithData(snapshot,remote);}
      const merged=Core.mergeActiveStates(local,remote,{ownerUid:uid,clock:Date.now()});
      publishCloudStateReady(uid,local,merged);
      if(stateFingerprint(merged)!==stateFingerprint(remote)){markPending(uid,'merge_needed',{increment:false});scheduleRetry(uid,{immediate:true});}
      return snapshotWithData(snapshot,merged);
    };

    setOwner.set=async function(data,options){
      const uid=statePathUid(this);if(!uid)return originalSet.call(this,data,options);
      const auth=currentUid();if(!auth||auth!==uid){markPending(uid,'stale_account_write');throw syncError('STALE_ACCOUNT_WRITE','Blocked a stale account sync write.');}
      if(navigator.onLine===false){markPending(uid,'offline_write');throw syncError('unavailable','Offline sync deferred.');}
      const persisted=readUserState(uid),outgoing=mergeSyncMeta(data,persisted,uid),ref=this,firestore=this.firestore||db;
      try{
        await firestore.runTransaction(async transaction=>{
          const snapshot=await transaction.get(ref),remote=snapshot.exists?safeCloudState(snapshot.data(),uid):null;
          const merged=Core.mergeActiveStates(outgoing,remote,{ownerUid:uid,clock:Date.now()}),payload=Core.compactForCloud(merged);
          payload.meta={...(payload.meta||{}),syncOwnerUid:uid};payload.clientUpdatedAt=payload.meta.updatedAt||outgoing.clientUpdatedAt||new Date().toISOString();payload.cloudUpdatedAt=window.firebase.firestore.FieldValue.serverTimestamp();
          transaction.set(ref,payload,{merge:false});
        });
        clearPending(uid);baseSetItem.call(localStorage,`garang_last_server_ack_${uid}`,new Date().toISOString());
        window.dispatchEvent(new CustomEvent('garang:sync-durable',{detail:{uid,status:'synced'}}));
      }catch(error){markPending(uid,error?.code||'transaction_failed');window.dispatchEvent(new CustomEvent('garang:sync-durable',{detail:{uid,status:'pending',reason:error?.code||'transaction_failed'}}));throw error;}
    };
    setOwner.__garangDurabilityPatched=true;getOwner.__garangDurabilityPatched=true;firestorePatched=true;return true;
  }catch(error){console.warn('[GARANG] sync durability patch deferred',error);return false;}
}

async function exportVerifiedBackup(){
  const uid=currentUid(),key=uid?Core.stateKey(uid):Core.DEMO_KEY,state=readStateKey(key);if(!state)return toast('내보낼 저장 데이터를 찾지 못했습니다.');
  try{if(window.GarangSchema?.validateImport)window.GarangSchema.validateImport(state);}catch(error){console.warn('[GARANG] export validation failed',error);return toast('데이터 검증에 실패해 내보내기를 중단했습니다.');}
  const envelope=Core.createExportEnvelope(state,{scope:uid?'authenticated':'demo'});if(!Core.verifyExportEnvelope(envelope))return toast('백업 검증에 실패했습니다.');
  const blob=new Blob([nativeStringify(envelope,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`GARANG_BACKUP_${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);toast('검증된 GARANG 백업을 내보냈습니다.');
}

/* Bubble-only delegation: persistence must never capture or cancel unrelated app taps. */
document.addEventListener('click',event=>{const button=event.target?.closest?.('#exportData');if(!button)return;event.preventDefault();exportVerifiedBackup().catch(error=>{console.warn('[GARANG] export failed',error);toast('데이터 내보내기에 실패했습니다.');});});

function authWatch(){if(authWatching)return true;try{if(!window.firebase?.apps?.length)return false;authWatching=true;window.firebase.auth().onAuthStateChanged(user=>{const before=activeAuthUid;activeAuthUid=user?.uid||null;if(before&&before!==activeAuthUid&&retryTimer){clearTimeout(retryTimer);retryTimer=null;}if(activeAuthUid&&readPending(activeAuthUid))scheduleRetry(activeAuthUid,{immediate:true});});return true;}catch{authWatching=false;return false;}}
function bootFirebaseGuards(){if(!patchFirestore())setTimeout(patchFirestore,250);if(!authWatch())setTimeout(authWatch,300);}
window.addEventListener('online',()=>{document.documentElement.dataset.garangNetwork='online';const uid=currentUid();if(uid){markPending(uid,'network_restored',{increment:false});scheduleRetry(uid,{immediate:true});}});
window.addEventListener('offline',()=>{document.documentElement.dataset.garangNetwork='offline';const uid=currentUid();if(uid)markPending(uid,'offline',{increment:false});});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false){const uid=currentUid();if(uid&&readPending(uid))scheduleRetry(uid,{immediate:true});}});
setTimeout(bootFirebaseGuards,0);setTimeout(patchFirestore,700);window.addEventListener('load',()=>{patchFirestore();authWatch();},{once:true});
window.GarangSyncDurabilityRuntime=Object.freeze({version:'garang-sync-durability-runtime-v1.3',status:()=>({uid:currentUid(),online:navigator.onLine!==false,firestorePatched,pending:currentUid()?readPending(currentUid()):null}),forceSync:()=>{const uid=currentUid();if(uid){markPending(uid,'manual',{increment:false});scheduleRetry(uid,{immediate:true});}},exportVerifiedBackup});
})();
