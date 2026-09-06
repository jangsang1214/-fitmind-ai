/* GARANG sync durability runtime v2.1
   Transitional compatibility adapter for legacy app.js persistence.
   Long-term Workout/Meal/Run/Body records live in dedicated Firestore collections;
   users/<uid>/app/state is now a bounded shell. Existing local data is backed up and
   migrated before the shell is compacted. Ordinary app taps are never intercepted.
*/
(() => {
'use strict';

const Core=window.GarangSyncDurability,Sanitizer=window.GarangStateSanitizer,History=window.GarangHistoryPersistence;
if(!Core||!History||window.__garangSyncDurabilityRuntime)return;
window.__garangSyncDurabilityRuntime=true;

const nativeParse=JSON.parse.bind(JSON),nativeStringify=JSON.stringify.bind(JSON);
const baseSetItem=Storage.prototype.setItem,baseGetItem=Storage.prototype.getItem,baseRemoveItem=Storage.prototype.removeItem;
const DEVICE_KEY='garang_sync_device_v1',PENDING_PREFIX='garang_sync_pending_v1::',BACKUP_PREFIX='garang_sync_backup_v2::',CLOUD_BACKUP_PREFIX='garang_cloud_recovery_backup_v2::',HISTORY_INDEX_PREFIX='garang_history_index_v2::';
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
function historyIndexKey(uid){return `${HISTORY_INDEX_PREFIX}${uid}`;}
function readPending(uid){return safeParse(readRaw(pendingKey(uid)))||null;}
function writePending(uid,value){baseSetItem.call(localStorage,pendingKey(uid),nativeStringify(value));}
function clearPending(uid){if(!uid)return;try{baseRemoveItem.call(localStorage,pendingKey(uid));}catch{}if(retryTimer){clearTimeout(retryTimer);retryTimer=null;}}
function markPending(uid,reason,{increment=true}={}){if(!uid)return;const previous=readPending(uid)||{},attempt=increment?(Number(previous.attempt)||0)+1:(Number(previous.attempt)||0);writePending(uid,{uid,attempt,reason:String(reason||'pending'),updatedAt:new Date().toISOString()});scheduleRetry(uid);}
function scheduleRetry(uid,{immediate=false}={}){if(!uid||uid!==currentUid()||navigator.onLine===false)return;if(retryTimer)clearTimeout(retryTimer);const pending=readPending(uid);if(!pending)return;retryTimer=setTimeout(()=>{retryTimer=null;triggerRetry(uid);},immediate?180:Core.retryDelay(pending.attempt||0));}
function triggerRetry(uid){if(!uid||uid!==currentUid()||navigator.onLine===false)return;const badge=document.getElementById('syncBadge');if(!badge){retryTimer=setTimeout(()=>triggerRetry(uid),900);return;}badge.click();}
function syncError(code,message=code){const error=new Error(message);error.code=code;return error;}
function statePathUid(ref){const match=String(ref?.path||'').match(/^users\/([^/]+)\/app\/state$/);return match?match[1]:null;}
function stripCloudFields(value){if(!value||typeof value!=='object')return {};const out={...value};delete out.cloudUpdatedAt;return out;}
function backupCloudRaw(uid,value){try{const key=`${CLOUD_BACKUP_PREFIX}${uid}`;if(baseGetItem.call(localStorage,key)==null)baseSetItem.call(localStorage,key,nativeStringify(value));}catch{}}
function safeCloudState(value,uid){backupCloudRaw(uid,value);return sanitize(stripCloudFields(value),uid);}
function mergeSyncMeta(outgoing,persisted,uid){const out=safeCloudState(outgoing,uid);out.meta={...(out.meta||{})};const meta=persisted?.meta||{};for(const key of ['syncOwnerUid','syncDeviceId','syncRevision','syncLastLocalAt','syncLastMergeAt','syncTombstones'])if(meta[key]!==undefined)out.meta[key]=meta[key];if(!out.meta.syncOwnerUid)out.meta.syncOwnerUid=uid;return out;}
function snapshotWithData(snapshot,data){return {exists:snapshot.exists,id:snapshot.id,ref:snapshot.ref,metadata:snapshot.metadata,data:()=>data,get:field=>data?.[field]};}
function stateFingerprint(value){try{return Core.fingerprint(value);}catch{return '';}}
function onboardingReady(value){return !!(value?.onboarding?.complete||value?.onboarding?.skipped);}
function publishCloudStateReady(uid,before,after){const detail=Object.freeze({uid:String(uid),onboardingReady:onboardingReady(after),needsTodayRoute:onboardingReady(after)&&!onboardingReady(before),at:new Date().toISOString()});window.__garangCloudStateReady=detail;window.dispatchEvent(new CustomEvent('garang:cloud-state-ready',{detail}));}
function historyCollection(db,uid,domain){const name=History.COLLECTIONS[domain];return name?db.collection('users').doc(uid).collection(name):null;}
function readHistoryIndex(uid){const value=safeParse(readRaw(historyIndexKey(uid)));return value&&typeof value==='object'?value:{};}
function writeHistoryIndex(uid,index){try{baseSetItem.call(localStorage,historyIndexKey(uid),nativeStringify(index));}catch{}}

/* Preserve local full history and deletion metadata before app.js writes its local state. */
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

async function loadHistory(db,uid){
  const result={};
  for(const domain of History.DOMAINS){
    result[domain]=[];const collection=historyCollection(db,uid,domain);if(!collection||typeof collection.get!=='function')continue;
    try{const snapshot=await collection.get(),docs=Array.isArray(snapshot?.docs)?snapshot.docs:[];result[domain]=docs.map(doc=>History.recordFromDoc(doc.data())).filter(Boolean);}catch(error){console.warn(`[GARANG] history load deferred: ${domain}`,error?.code||error?.message||error);}
  }
  return result;
}
async function commitHistoryOps(db,ops){
  for(let offset=0;offset<ops.length;offset+=350){
    const chunk=ops.slice(offset,offset+350);
    if(typeof db.batch==='function'){
      const batch=db.batch();for(const op of chunk)op.type==='delete'?batch.delete(op.ref):batch.set(op.ref,op.data,{merge:false});await batch.commit();
    }else{
      for(const op of chunk){if(op.type==='delete'&&typeof op.ref.delete==='function')await op.ref.delete();else if(op.type==='set'&&typeof op.ref.set==='function')await op.ref.set(op.data,{merge:false});}
    }
  }
}
async function persistHistory(db,uid,state){
  if(!state||!uid)return;
  const previousIndex=readHistoryIndex(uid),nextIndex=History.historyIndex(state),mergedIndex={},ops=[];
  for(const domain of History.DOMAINS){
    const collection=historyCollection(db,uid,domain);if(!collection)continue;
    const old=previousIndex[domain]||{},next=nextIndex[domain]||{};mergedIndex[domain]={...old,...next};
    for(const row of History.rows(state[domain])){
      const normalized=History.normalizeRecord(domain,row,uid),fingerprint=next[normalized.id];if(old[normalized.id]===fingerprint)continue;
      const ref=collection.doc(encodeURIComponent(normalized.id)),data=History.docPayload(domain,normalized,uid);ops.push({type:'set',ref,data});
    }
    /* Absence from a local/shell snapshot is never interpreted as deletion. Only an explicit tombstone may delete durable history. */
    const deleted=new Set(History.tombstonesFor(state,domain).map(item=>String(item.id)));
    for(const id of deleted){ops.push({type:'delete',ref:collection.doc(encodeURIComponent(id))});delete mergedIndex[domain][id];}
  }
  if(ops.length)await commitHistoryOps(db,ops);
  writeHistoryIndex(uid,mergedIndex);
}
async function backupMigrationManifest(db,uid,state){
  if(state?.meta?.historyV2?.version===2)return;
  try{
    const manifest={migration:'history-v2',createdAt:new Date().toISOString(),ownerUid:uid,historyManifest:History.compactShell(state)?.meta?.historyV2||null,shell:History.compactShell(state)};
    const ref=db.collection('users').doc(uid).collection('recoverySnapshots').doc(`history-v2-${Date.now()}`);if(typeof ref.set==='function')await ref.set(manifest,{merge:false});
  }catch(error){console.warn('[GARANG] cloud recovery manifest deferred',error?.code||error?.message||error);}
}

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
      await backupMigrationManifest(db,uid,remote);
      await persistHistory(db,uid,local||remote);
      const history=await loadHistory(db,uid),hydratedRemote=History.mergeStateWithHistory(remote,history);
      if(!local){publishCloudStateReady(uid,null,hydratedRemote);return snapshotWithData(snapshot,hydratedRemote);}
      const merged=Core.mergeActiveStates(local,hydratedRemote,{ownerUid:uid,clock:Date.now()});
      publishCloudStateReady(uid,local,merged);
      if(stateFingerprint(History.compactShell(merged))!==stateFingerprint(History.compactShell(remote))){markPending(uid,'merge_needed',{increment:false});scheduleRetry(uid,{immediate:true});}
      return snapshotWithData(snapshot,merged);
    };

    setOwner.set=async function(data,options){
      const uid=statePathUid(this);if(!uid)return originalSet.call(this,data,options);
      const auth=currentUid();if(!auth||auth!==uid){markPending(uid,'stale_account_write');throw syncError('STALE_ACCOUNT_WRITE','Blocked a stale account sync write.');}
      if(navigator.onLine===false){markPending(uid,'offline_write');throw syncError('unavailable','Offline sync deferred.');}
      const persisted=readUserState(uid),outgoing=mergeSyncMeta(data,persisted,uid),full=Core.mergeActiveStates(persisted||{},outgoing,{ownerUid:uid,clock:Date.now()}),ref=this,firestore=this.firestore||db;
      try{
        await persistHistory(db,uid,full);
        await firestore.runTransaction(async transaction=>{
          const snapshot=await transaction.get(ref),remote=snapshot.exists?safeCloudState(snapshot.data(),uid):null;
          await backupMigrationManifest(db,uid,remote||{});
          const merged=Core.mergeActiveStates(full,remote,{ownerUid:uid,clock:Date.now()}),payload=History.compactShell(Core.compactForCloud(merged));
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
  const envelope=Core.createExportEnvelope(state,{scope:uid?'authenticated':'demo'});if(!Core.verifyExportEnvelope(envelope))return toast('백업 무결성 검증에 실패했습니다.');
  const blob=new Blob([nativeStringify(envelope,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`GARANG_BACKUP_${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);toast('체크섬 검증된 GARANG 백업을 내보냈습니다.');
}

function authWatch(){if(authWatching)return true;try{if(!window.firebase?.apps?.length)return false;authWatching=true;window.firebase.auth().onAuthStateChanged(user=>{const before=activeAuthUid;activeAuthUid=user?.uid||null;if(before&&before!==activeAuthUid&&retryTimer){clearTimeout(retryTimer);retryTimer=null;}if(activeAuthUid&&readPending(activeAuthUid))scheduleRetry(activeAuthUid,{immediate:true});});return true;}catch{authWatching=false;return false;}}
function bootFirebaseGuards(){if(!patchFirestore())setTimeout(patchFirestore,250);if(!authWatch())setTimeout(authWatch,300);}
window.addEventListener('online',()=>{document.documentElement.dataset.garangNetwork='online';const uid=currentUid();if(uid){markPending(uid,'network_restored',{increment:false});scheduleRetry(uid,{immediate:true});}});
window.addEventListener('offline',()=>{document.documentElement.dataset.garangNetwork='offline';const uid=currentUid();if(uid)markPending(uid,'offline',{increment:false});});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false){const uid=currentUid();if(uid&&readPending(uid))scheduleRetry(uid,{immediate:true});}});
setTimeout(bootFirebaseGuards,0);setTimeout(patchFirestore,700);window.addEventListener('load',()=>{patchFirestore();authWatch();},{once:true});
window.GarangSyncDurabilityRuntime=Object.freeze({version:'garang-sync-durability-runtime-v2.1',status:()=>({uid:currentUid(),online:navigator.onLine!==false,firestorePatched,pending:currentUid()?readPending(currentUid()):null}),forceSync:()=>{const uid=currentUid();if(uid){markPending(uid,'manual',{increment:false});scheduleRetry(uid,{immediate:true});}},exportVerifiedBackup,loadHistory:async()=>{const uid=currentUid();return uid&&window.firebase?.apps?.length?loadHistory(window.firebase.firestore(),uid):{};}});
})();
