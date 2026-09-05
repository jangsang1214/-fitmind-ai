/* GARANG lifetime workout + meal history runtime v1.1
   Non-invasive persistence: never replaces Storage, Firestore, or document click handlers.
   Observes authenticated local state, archives workout/meal records, and restores history on login.
*/
(() => {
'use strict';

const Core=window.GarangLifetimeHistory;
if(!Core||window.__garangLifetimeHistoryRuntime)return;
window.__garangLifetimeHistoryRuntime=true;

const nativeParse=JSON.parse.bind(JSON),nativeStringify=JSON.stringify.bind(JSON);
const PENDING_PREFIX='garang_lifetime_history_pending_v1::';
const BACKFILL_PREFIX='garang_lifetime_history_backfill_v1::';
const RELOAD_PREFIX='garang_lifetime_history_restore_reload_v1::';
let activeUid=null,flushTimer=null,flushing=false,authWatching=false;
const observed=new Map();

const safeParse=raw=>{try{return raw?nativeParse(raw):null;}catch{return null;}};
const now=()=>new Date().toISOString();
const currentUid=()=>{try{return window.firebase?.auth?.().currentUser?.uid||activeUid||null;}catch{return activeUid||null;}};
const pendingKey=uid=>`${PENDING_PREFIX}${uid}`;
const backfillKey=uid=>`${BACKFILL_PREFIX}${uid}`;
const reloadKey=uid=>`${RELOAD_PREFIX}${uid}`;
const readRaw=key=>{try{return localStorage.getItem(key);}catch{return null;}};
const readState=uid=>safeParse(readRaw(Core.stateKey(uid)));
const readPending=uid=>safeParse(readRaw(pendingKey(uid)))||{ops:{}};
const writePending=(uid,value)=>{try{localStorage.setItem(pendingKey(uid),nativeStringify(value));}catch(error){console.warn('[GARANG] lifetime pending queue unavailable',error);}};
const opKey=(domain,id)=>`${domain}::${String(id)}`;
const archiveFingerprint=state=>nativeStringify({workouts:Array.isArray(state?.workouts)?state.workouts:[],meals:Array.isArray(state?.meals)?state.meals:[],syncTombstones:Array.isArray(state?.meta?.syncTombstones)?state.meta.syncTombstones.filter(item=>Core.DOMAINS.includes(String(item?.domain||''))):[]});

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
function scheduleFlush(uid,{immediate=false}={}){
  if(!uid||uid!==currentUid()||navigator.onLine===false)return;
  clearTimeout(flushTimer);flushTimer=setTimeout(()=>flush(uid),immediate?40:450);
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
    latest.updatedAt=now();writePending(uid,latest);flushing=false;
    if(Object.keys(latest.ops).length)scheduleFlush(uid,{immediate:true});
    return true;
  }catch(error){
    flushing=false;console.warn('[GARANG] lifetime history sync deferred',error);setTimeout(()=>scheduleFlush(uid,{immediate:true}),2500);return false;
  }
}

function observeLocal(uid,{force=false}={}){
  if(!uid)return false;
  const state=readState(uid);if(!state)return false;
  const prior=observed.get(uid)||null,signature=Core.historySignature(state),backfill=readRaw(backfillKey(uid));
  if(!prior){
    observed.set(uid,state);
    if(force||backfill!==signature){queueDiff(uid,Core.diffForArchive({},state));try{localStorage.setItem(backfillKey(uid),signature);}catch{}}
    return true;
  }
  const diff=Core.diffForArchive(prior,state);
  observed.set(uid,state);
  if((diff.upserts||[]).length||(diff.deletes||[]).length)queueDiff(uid,diff);
  return true;
}

async function loadHistory(uid){
  const db=window.firebase.firestore(),out={workouts:[],meals:[]};
  for(const domain of Core.DOMAINS){
    const collection=Core.collectionFor(domain);if(!collection)continue;
    const snap=await db.collection('users').doc(uid).collection(collection).get();
    out[domain]=snap.docs.map(doc=>Core.hydrateArchiveDoc(doc.data())).filter(Boolean);
  }
  return out;
}
async function restoreLocal(uid){
  if(!uid||uid!==currentUid()||navigator.onLine===false||!window.firebase?.apps?.length)return false;
  const history=await loadHistory(uid),local=readState(uid)||{},merged=Core.mergeStateWithHistory(local,history);
  if(archiveFingerprint(local)===archiveFingerprint(merged)){try{sessionStorage.removeItem(reloadKey(uid));}catch{}return false;}
  const stamp=now();merged.meta={...(merged.meta||{}),updatedAt:stamp,lifetimeHistoryRestoredAt:stamp};
  try{localStorage.setItem(Core.stateKey(uid),nativeStringify(merged));}catch(error){console.warn('[GARANG] lifetime restore local write failed',error);return false;}
  observed.set(uid,merged);
  let reloads=0;try{reloads=Number(sessionStorage.getItem(reloadKey(uid))||0)||0;sessionStorage.setItem(reloadKey(uid),String(reloads+1));}catch{}
  if(reloads<2)setTimeout(()=>location.reload(),0);
  return true;
}

function authWatch(){
  if(authWatching)return true;
  try{
    if(!window.firebase?.apps?.length)return false;
    authWatching=true;window.firebase.auth().onAuthStateChanged(user=>{
      const previous=activeUid;activeUid=user?.uid||null;
      if(previous&&previous!==activeUid)observed.delete(previous);
      if(!activeUid){clearTimeout(flushTimer);flushTimer=null;return;}
      setTimeout(()=>{observeLocal(activeUid,{force:false});scheduleFlush(activeUid,{immediate:true});restoreLocal(activeUid).catch(error=>console.warn('[GARANG] lifetime restore deferred',error));},120);
    });return true;
  }catch{authWatching=false;return false;}
}
function boot(){if(!authWatch())setTimeout(authWatch,120);}

/* No event cancellation: interaction remains owned by the app. */
window.addEventListener('online',()=>{const uid=currentUid();if(uid){observeLocal(uid);scheduleFlush(uid,{immediate:true});restoreLocal(uid).catch(()=>false);}});
window.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){const uid=currentUid();if(uid){observeLocal(uid);scheduleFlush(uid,{immediate:true});}}});
window.addEventListener('pagehide',()=>{const uid=currentUid();if(uid)observeLocal(uid);});
setInterval(()=>{const uid=currentUid();if(uid){observeLocal(uid);if(navigator.onLine!==false)scheduleFlush(uid);}},900);
setTimeout(boot,0);setTimeout(authWatch,280);setTimeout(authWatch,900);window.addEventListener('load',authWatch,{once:true});

window.GarangLifetimeHistoryRuntime=Object.freeze({
  version:'garang-lifetime-history-v1.1',
  status:()=>({uid:currentUid(),online:navigator.onLine!==false,pending:currentUid()?Object.keys(readPending(currentUid()).ops||{}).length:0,nonInvasive:true}),
  forceSync:async()=>{const uid=currentUid();if(!uid)return false;observeLocal(uid,{force:true});return flush(uid);},
  restore:async()=>{const uid=currentUid();return uid?restoreLocal(uid):false;},
  loadAll:async()=>{const uid=currentUid();return uid?loadHistory(uid):{workouts:[],meals:[]};}
});
})();
