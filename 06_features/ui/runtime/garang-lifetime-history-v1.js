/* GARANG lifetime workout + meal history runtime v1
   Mirrors workout/meal records into per-user Firestore history collections.
   The existing app/state snapshot remains unchanged for compatibility.
*/
(() => {
'use strict';

const Core=window.GarangLifetimeHistory;
if(!Core||window.__garangLifetimeHistoryRuntime)return;
window.__garangLifetimeHistoryRuntime=true;

const nativeParse=JSON.parse.bind(JSON),nativeStringify=JSON.stringify.bind(JSON);
const stateSetItem=Storage.prototype.setItem,baseGetItem=Storage.prototype.getItem;
const PENDING_PREFIX='garang_lifetime_history_pending_v1::';
const BACKFILL_PREFIX='garang_lifetime_history_backfill_v1::';
let activeUid=null,flushTimer=null,flushing=false,firestorePatched=false,authWatching=false,logoutBypass=false;

const safeParse=raw=>{try{return raw?nativeParse(raw):null;}catch{return null;}};
const now=()=>new Date().toISOString();
const currentUid=()=>{try{return window.firebase?.auth?.().currentUser?.uid||activeUid||null;}catch{return activeUid||null;}};
const pendingKey=uid=>`${PENDING_PREFIX}${uid}`;
const backfillKey=uid=>`${BACKFILL_PREFIX}${uid}`;
const readRaw=key=>{try{return baseGetItem.call(localStorage,key);}catch{return null;}};
const readState=uid=>safeParse(readRaw(Core.stateKey(uid)));
const readPending=uid=>safeParse(readRaw(pendingKey(uid)))||{ops:{}};
const writePending=(uid,value)=>stateSetItem.call(localStorage,pendingKey(uid),nativeStringify(value));
const opKey=(domain,id)=>`${domain}::${String(id)}`;

function queueDiff(uid,diff){
  if(!uid||!diff)return;
  const queue=readPending(uid);queue.ops=queue.ops&&typeof queue.ops==='object'?queue.ops:{};
  for(const item of diff.upserts||[]){
    if(!item?.record?.id)continue;
    queue.ops[opKey(item.domain,item.record.id)]={type:'upsert',domain:item.domain,id:String(item.record.id),record:item.record,queuedAt:now()};
  }
  for(const item of diff.deletes||[]){
    if(!item?.id)continue;
    queue.ops[opKey(item.domain,item.id)]={type:'delete',domain:item.domain,id:String(item.id),deletedAt:item.deletedAt||now(),queuedAt:now()};
  }
  queue.updatedAt=now();writePending(uid,queue);scheduleFlush(uid);
}
function queueFullState(uid,state){queueDiff(uid,Core.diffForArchive({},state||{}));}
function scheduleFlush(uid,{immediate=false}={}){
  if(!uid||uid!==currentUid()||navigator.onLine===false)return;
  clearTimeout(flushTimer);flushTimer=setTimeout(()=>flush(uid),immediate?80:500);
}
async function flush(uid){
  if(flushing||!uid||uid!==currentUid()||navigator.onLine===false||!window.firebase?.apps?.length)return false;
  const queue=readPending(uid),entries=Object.entries(queue.ops||{});if(!entries.length)return true;
  flushing=true;
  const selected=entries.slice(0,400),db=window.firebase.firestore(),batch=db.batch();
  try{
    for(const [,op] of selected){
      const collection=Core.collectionFor(op.domain);if(!collection)continue;
      const ref=db.collection('users').doc(uid).collection(collection).doc(Core.encodeRecordId(op.id));
      if(op.type==='delete')batch.delete(ref);
      else batch.set(ref,Core.archivePayload(op.domain,op.record,uid,{archivedAt:op.queuedAt||now()}),{merge:true});
    }
    await batch.commit();
    const latest=readPending(uid);latest.ops=latest.ops&&typeof latest.ops==='object'?latest.ops:{};
    for(const [key,committed] of selected){const current=latest.ops[key];if(current&&current.type===committed.type&&current.queuedAt===committed.queuedAt)delete latest.ops[key];}
    latest.updatedAt=now();writePending(uid,latest);
    flushing=false;
    if(Object.keys(latest.ops).length)return flush(uid);
    return true;
  }catch(error){
    flushing=false;console.warn('[GARANG] lifetime history sync deferred',error);setTimeout(()=>scheduleFlush(uid,{immediate:true}),2500);return false;
  }
}

/* Capture the final persisted state after the durability layer has added tombstones/metadata. */
Storage.prototype.setItem=function(key,value){
  if(this!==localStorage||!Core.isStateKey(key))return stateSetItem.call(this,key,value);
  const previous=safeParse(readRaw(key));
  const result=stateSetItem.call(this,key,value);
  const persisted=safeParse(readRaw(key)),uid=Core.ownerFromKey(key);
  if(uid&&persisted)queueDiff(uid,Core.diffForArchive(previous,persisted));
  return result;
};

function methodOwner(object,name){let current=object;while(current){if(Object.prototype.hasOwnProperty.call(current,name)&&typeof current[name]==='function')return current;current=Object.getPrototypeOf(current);}return null;}
function statePathUid(ref){const match=String(ref?.path||'').match(/^users\/([^/]+)\/app\/state$/);return match?match[1]:null;}
function snapshotWithData(snapshot,data,exists=true){return {exists,id:snapshot?.id||'state',ref:snapshot?.ref,metadata:snapshot?.metadata,data:()=>data,get:field=>data?.[field]};}
async function loadHistory(uid){
  const db=window.firebase.firestore(),out={workouts:[],meals:[]};
  for(const domain of Core.DOMAINS){
    const collection=Core.collectionFor(domain);if(!collection)continue;
    const snap=await db.collection('users').doc(uid).collection(collection).get();
    out[domain]=snap.docs.map(doc=>Core.hydrateArchiveDoc(doc.data())).filter(Boolean);
  }
  return out;
}
function patchFirestore(){
  if(firestorePatched)return true;
  try{
    if(!window.firebase?.apps?.length)return false;
    const db=window.firebase.firestore(),probe=db.collection('__garang_history_probe__').doc('__probe__'),getOwner=methodOwner(probe,'get');
    if(!getOwner)return false;if(getOwner.get.__garangLifetimeHistoryPatched){firestorePatched=true;return true;}
    const originalGet=getOwner.get;
    getOwner.get=async function(...args){
      const uid=statePathUid(this);if(!uid)return originalGet.apply(this,args);
      const snapshot=await originalGet.apply(this,args),auth=currentUid();
      if(auth&&auth!==uid)return snapshot;
      try{
        const history=await loadHistory(uid),hasHistory=Core.DOMAINS.some(domain=>history[domain]?.length);
        if(!hasHistory)return snapshot;
        const merged=Core.mergeStateWithHistory(snapshot?.exists?snapshot.data():{},history);
        return snapshotWithData(snapshot,merged,true);
      }catch(error){console.warn('[GARANG] lifetime history restore deferred',error);return snapshot;}
    };
    getOwner.get.__garangLifetimeHistoryPatched=true;firestorePatched=true;return true;
  }catch(error){console.warn('[GARANG] lifetime history patch deferred',error);return false;}
}
function backfillIfNeeded(uid){
  const state=readState(uid);if(!state)return;
  const signature=Core.historySignature(state),previous=readRaw(backfillKey(uid));
  if(previous===signature)return;
  queueFullState(uid,state);stateSetItem.call(localStorage,backfillKey(uid),signature);scheduleFlush(uid,{immediate:true});
}
function authWatch(){
  if(authWatching)return true;
  try{
    if(!window.firebase?.apps?.length)return false;
    authWatching=true;window.firebase.auth().onAuthStateChanged(user=>{
      activeUid=user?.uid||null;
      if(!activeUid){clearTimeout(flushTimer);flushTimer=null;return;}
      setTimeout(()=>{backfillIfNeeded(activeUid);scheduleFlush(activeUid,{immediate:true});},700);
    });return true;
  }catch{authWatching=false;return false;}
}

/* A save followed immediately by logout must still reach account history before auth is cleared. */
document.addEventListener('click',event=>{
  const button=event.target?.closest?.('#logoutBtn,#settingsLogout');
  if(!button||logoutBypass)return;
  const uid=currentUid();if(!uid)return;
  event.preventDefault();event.stopImmediatePropagation();
  backfillIfNeeded(uid);
  flush(uid).catch(()=>false).finally(()=>{
    logoutBypass=true;
    try{button.click();}finally{logoutBypass=false;}
  });
},true);

function boot(){if(!patchFirestore())setTimeout(patchFirestore,220);if(!authWatch())setTimeout(authWatch,260);}
window.addEventListener('online',()=>{const uid=currentUid();if(uid){backfillIfNeeded(uid);scheduleFlush(uid,{immediate:true});}});
window.addEventListener('load',()=>{patchFirestore();authWatch();const uid=currentUid();if(uid)backfillIfNeeded(uid);},{once:true});
setTimeout(boot,0);setTimeout(patchFirestore,650);

window.GarangLifetimeHistoryRuntime=Object.freeze({
  version:Core.VERSION,
  status:()=>({uid:currentUid(),online:navigator.onLine!==false,firestorePatched,pending:Object.keys(readPending(currentUid()||'').ops||{}).length}),
  forceSync:async()=>{const uid=currentUid();if(!uid)return false;backfillIfNeeded(uid);return flush(uid);},
  loadAll:async()=>{const uid=currentUid();return uid?loadHistory(uid):{workouts:[],meals:[]};}
});
})();
