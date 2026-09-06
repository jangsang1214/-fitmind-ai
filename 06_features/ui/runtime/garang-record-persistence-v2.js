/* GARANG record persistence v2
   Explicit long-term record repository. No Storage/Firestore prototype patches and no global click interception.
*/
(() => {
'use strict';
const Core=window.GarangRecordPersistenceCore;
if(!Core||window.__garangRecordPersistenceV2)return;
window.__garangRecordPersistenceV2=true;
const MANIFEST_PREFIX='garang_record_manifest_v2::';
const DB_NAME='garang_records_v2';
const DB_VERSION=1;
const STORE='records';
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const manifestKey=uid=>`${MANIFEST_PREFIX}${uid}`;
const rawGet=key=>{try{return localStorage.getItem(key);}catch{return null;}};
const rawSet=(key,value)=>{try{localStorage.setItem(key,value);return true;}catch{return false;}};
function readManifest(uid){try{return JSON.parse(rawGet(manifestKey(uid))||'{}')||{};}catch{return {};}}
function writeManifest(uid,value){rawSet(manifestKey(uid),JSON.stringify(value||{}));}
function firestore(){try{return window.firebase?.apps?.length?window.firebase.firestore():null;}catch{return null;}}
function docRef(uid,domain,id){const db=firestore(),collection=Core.collectionFor(domain);return db&&collection?db.collection('users').doc(uid).collection(collection).doc(Core.encodeId(id)):null;}

function openLocalDb(){return new Promise((resolve,reject)=>{
  if(!window.indexedDB)return resolve(null);
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE)){const store=db.createObjectStore(STORE,{keyPath:'key'});store.createIndex('ownerUid','ownerUid',{unique:false});}};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});}
async function cacheLocal(uid,state){
  if(!uid)return state;
  const db=await openLocalDb().catch(()=>null);if(!db)return state;
  const safe=Core.normalizeStateRecords(state,{ownerUid:uid});
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);
    for(const domain of Core.DOMAINS)for(const record of safe[domain]||[])store.put({key:`${uid}::${domain}::${record.id}`,ownerUid:uid,domain,id:record.id,record});
    for(const tombstone of safe.meta?.syncTombstones||[]){if(Core.DOMAINS.includes(tombstone?.domain)&&tombstone?.id)store.delete(`${uid}::${tombstone.domain}::${tombstone.id}`);}
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('LOCAL_RECORD_CACHE_ABORTED'));
  }).catch(error=>console.warn('[GARANG] local record cache failed',error));
  db.close();return safe;
}
async function hydrateLocal(uid,state){
  if(!uid)return state;
  const db=await openLocalDb().catch(()=>null);if(!db)return state;
  const all=await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);}).catch(()=>[]);
  db.close();const history={};for(const domain of Core.DOMAINS)history[domain]=[];
  for(const item of all)if(item?.ownerUid===uid&&Core.DOMAINS.includes(item.domain)&&object(item.record))history[item.domain].push(item.record);
  return Core.mergeIntoState(state,history,{ownerUid:uid});
}

async function queryRecords(uid,collection){
  const db=firestore();if(!db)return [];
  const snap=await db.collection('users').doc(uid).collection(collection).get();const out=[];
  snap.forEach?.(doc=>out.push({id:doc.id,data:doc.data()}));
  if(Array.isArray(snap.docs)&&!out.length)for(const doc of snap.docs)out.push({id:doc.id,data:doc.data()});
  return out;
}
async function loadAll(uid,state){
  if(!uid)return state;
  let merged=await hydrateLocal(uid,state);const history={};for(const domain of Core.DOMAINS)history[domain]=[];
  const db=firestore();if(!db)return merged;
  for(const domain of Core.DOMAINS){
    const collection=Core.collectionFor(domain);if(!collection)continue;
    try{const docs=await queryRecords(uid,collection);for(const doc of docs){const data=doc.data||{},record=object(data.record)?data.record:data;if(object(record))history[domain].push(record);}}catch(error){console.warn(`[GARANG] ${domain} history load failed`,error);}
    const legacy=Core.legacyCollectionFor(domain);if(legacy)try{const docs=await queryRecords(uid,legacy);for(const doc of docs){const data=doc.data||{},record=object(data.record)?data.record:data;if(object(record))history[domain].push(record);}}catch(error){console.warn(`[GARANG] ${domain} legacy history load failed`,error);}
  }
  merged=Core.mergeIntoState(merged,history,{ownerUid:uid});await cacheLocal(uid,merged);return merged;
}

async function commitOperations(db,ops){
  if(!ops.length)return;
  for(let i=0;i<ops.length;i+=400){const chunk=ops.slice(i,i+400);
    if(typeof db.batch==='function'){
      const batch=db.batch();for(const op of chunk){if(op.type==='set')batch.set(op.ref,op.data,{merge:false});else batch.delete(op.ref);}await batch.commit();
    }else{
      for(const op of chunk){if(op.type==='set')await op.ref.set(op.data,{merge:false});else if(typeof op.ref.delete==='function')await op.ref.delete();}
    }
  }
}
async function persistAll(uid,state){
  if(!uid)return {cached:false,cloud:false};
  const normalized=await cacheLocal(uid,state);const db=firestore();if(!db)return {cached:true,cloud:false};
  const manifest=readManifest(uid),next=clone(manifest)||{},ops=[];
  for(const domain of Core.DOMAINS){next[domain]=object(next[domain])?next[domain]:{};
    for(const record of normalized[domain]||[]){const fingerprint=Core.manifestFingerprint(record);if(next[domain][record.id]===fingerprint)continue;const ref=docRef(uid,domain,record.id);if(!ref)continue;ops.push({type:'set',ref,data:{record,ownerUid:uid,domain,recordId:record.id,revision:record.revision,updatedAt:record.updatedAt,persistenceVersion:2}});next[domain][record.id]=fingerprint;}
  }
  for(const tombstone of normalized.meta?.syncTombstones||[]){const domain=String(tombstone?.domain||''),id=String(tombstone?.id||'');if(!Core.DOMAINS.includes(domain)||!id)continue;const ref=docRef(uid,domain,id);if(ref)ops.push({type:'delete',ref});if(next[domain])delete next[domain][id];}
  await commitOperations(db,ops);writeManifest(uid,next);return {cached:true,cloud:true,writes:ops.length};
}

async function deleteCollection(uid,collection){const db=firestore();if(!db)return;const docs=await queryRecords(uid,collection);const ops=[];for(const doc of docs)ops.push({type:'delete',ref:db.collection('users').doc(uid).collection(collection).doc(doc.id)});await commitOperations(db,ops);}
async function purgeIndexedDb(uid,state){
  const db=await openLocalDb().catch(()=>null);if(db){await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),req=store.openCursor();req.onsuccess=()=>{const c=req.result;if(!c)return;if(c.value?.ownerUid===uid)c.delete();c.continue();};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);}).catch(()=>{});db.close();}
  const attachmentIds=(state?.body||[]).map(x=>x?.attachmentId).filter(Boolean);if(!attachmentIds.length||!window.indexedDB)return;
  await new Promise(resolve=>{const req=indexedDB.open('garang_media_v1',1);req.onsuccess=()=>{const media=req.result;if(!media.objectStoreNames.contains('bodyReports')){media.close();resolve();return;}const tx=media.transaction('bodyReports','readwrite'),store=tx.objectStore('bodyReports');attachmentIds.forEach(id=>store.delete(id));tx.oncomplete=()=>{media.close();resolve();};tx.onerror=()=>{media.close();resolve();};};req.onerror=resolve;});
}
async function purgeUserData(uid,state){
  if(!uid)throw new Error('UID_REQUIRED');
  for(const collection of [...Object.values(Core.COLLECTIONS),...Object.values(Core.LEGACY_COLLECTIONS)])await deleteCollection(uid,collection);
  await purgeIndexedDb(uid,state);try{localStorage.removeItem(manifestKey(uid));}catch{}
  return true;
}

window.GarangRecordPersistenceRuntime=Object.freeze({version:'garang-record-persistence-v2',loadAll,persistAll,cacheLocal,hydrateLocal,purgeUserData,status:uid=>({uid,manifest:readManifest(uid)})});
})();
