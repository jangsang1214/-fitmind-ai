(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GarangSyncDurability=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='garang-sync-durability-v1';
const USER_KEY_RE=/^garang_user_(.+)_v3$/;
const DEMO_KEY='garang_demo_state_v3';
const DOMAINS=Object.freeze(['workouts','meals','runs','body','planner','checkins','aiChat']);
const CLOUD_LIMITS=Object.freeze({workouts:350,meals:350,body:250,checkins:180,planner:300,actionLog:300,errors:80,runs:200,aiChat:80});
const TOMBSTONE_TTL_MS=180*24*60*60*1000;

const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const iso=value=>{const n=Date.parse(value||0);return Number.isFinite(n)&&n>0?n:0;};
const nowIso=clock=>new Date(typeof clock==='number'?clock:Date.now()).toISOString();
const error=(code,message=code)=>{const e=new Error(message);e.code=code;return e;};
const ownerFromKey=key=>{const m=String(key||'').match(USER_KEY_RE);return m?m[1]:null;};
const isStateKey=key=>String(key||'')===DEMO_KEY||USER_KEY_RE.test(String(key||''));
const stateKey=uid=>uid?`garang_user_${uid}_v3`:DEMO_KEY;
const rowStamp=row=>Math.max(iso(row?.updatedAt),iso(row?.createdAt),Number(row?.updatedAtMs)||0,Number(row?.revision)||0);
const stateStamp=state=>Math.max(iso(state?.meta?.updatedAt),iso(state?.clientUpdatedAt),Number(state?.updatedAtMs)||0,Number(state?.meta?.syncRevision)||0);

function rows(value){return Array.isArray(value)?value.filter(object):[];}
function itemsForDomain(state,domain){
  if(domain==='memory')return rows(state?.memory?.entries);
  return rows(state?.[domain]);
}
function tombstoneKey(x){return `${String(x?.domain||'')}::${String(x?.id||'')}`;}
function normalizeTombstones(input,clock=Date.now()){
  const cutoff=clock-TOMBSTONE_TTL_MS,byKey=new Map();
  for(const raw of rows(input)){
    const domain=String(raw.domain||''),id=String(raw.id||''),deletedAt=String(raw.deletedAt||'');
    if(!domain||!id||!iso(deletedAt)||iso(deletedAt)<cutoff)continue;
    const item={domain,id,deletedAt,ownerUid:raw.ownerUid?String(raw.ownerUid):null};
    const key=tombstoneKey(item),prev=byKey.get(key);
    if(!prev||iso(item.deletedAt)>iso(prev.deletedAt))byKey.set(key,item);
  }
  return [...byKey.values()].sort((a,b)=>iso(a.deletedAt)-iso(b.deletedAt));
}
function mergeTombstones(a,b,clock=Date.now()){return normalizeTombstones([...(a||[]),...(b||[])],clock);}
function deletedBy(tombstones,domain,id,record){
  const hit=tombstones.find(x=>x.domain===domain&&String(x.id)===String(id));
  return !!hit&&iso(hit.deletedAt)>=rowStamp(record);
}
function mergeRows(localRows,remoteRows,{preferRemote=false,tombstones=[],domain=''}={}){
  const result=[],positions=new Map();
  const feed=(list,source)=>{
    for(const item of rows(list)){
      const key=String(item.id||'');if(!key)continue;
      if(deletedBy(tombstones,domain,key,item))continue;
      if(!positions.has(key)){positions.set(key,result.length);result.push({...item,__source:source});continue;}
      const index=positions.get(key),current=result[index],a=rowStamp(current),b=rowStamp(item);
      if(b>a||(a===b&&((preferRemote&&source==='remote')||(!preferRemote&&source==='local'))))result[index]={...current,...item,__source:source};
    }
  };
  feed(localRows,'local');feed(remoteRows,'remote');
  return result.map(({__source,...item})=>item);
}
function collectNewTombstones(previous,next,{ownerUid=null,clock=Date.now()}={}){
  if(!object(previous)||!object(next))return [];
  const deletedAt=nowIso(clock),out=[];
  for(const domain of [...DOMAINS,'memory']){
    const before=new Map(itemsForDomain(previous,domain).filter(x=>x?.id).map(x=>[String(x.id),x]));
    const after=new Set(itemsForDomain(next,domain).filter(x=>x?.id).map(x=>String(x.id)));
    for(const id of before.keys())if(!after.has(id))out.push({domain,id,deletedAt,ownerUid});
  }
  return out;
}
function withLocalMetadata(previousInput,nextInput,{ownerUid=null,deviceId=null,clock=Date.now()}={}){
  const previous=object(previousInput)?previousInput:null,next=clone(nextInput||{});
  next.meta=object(next.meta)?next.meta:{};
  const existingOwner=next.meta.syncOwnerUid?String(next.meta.syncOwnerUid):null;
  if(ownerUid&&existingOwner&&existingOwner!==String(ownerUid))throw error('SYNC_OWNER_MISMATCH');
  const prevOwner=previous?.meta?.syncOwnerUid?String(previous.meta.syncOwnerUid):null;
  if(ownerUid&&prevOwner&&prevOwner!==String(ownerUid))throw error('SYNC_OWNER_MISMATCH');
  const newDeletes=collectNewTombstones(previous,next,{ownerUid,clock});
  next.meta.syncTombstones=mergeTombstones(previous?.meta?.syncTombstones,next.meta.syncTombstones,clock);
  next.meta.syncTombstones=mergeTombstones(next.meta.syncTombstones,newDeletes,clock);
  next.meta.syncOwnerUid=ownerUid||existingOwner||prevOwner||null;
  if(deviceId)next.meta.syncDeviceId=String(deviceId);
  next.meta.syncRevision=Math.max(Number(previous?.meta?.syncRevision)||0,Number(next.meta.syncRevision)||0)+1;
  next.meta.syncLastLocalAt=nowIso(clock);
  return next;
}
function enforceOwner(state,ownerUid){
  if(!ownerUid||!object(state))return;
  const existing=state?.meta?.syncOwnerUid;
  if(existing&&String(existing)!==String(ownerUid))throw error('SYNC_OWNER_MISMATCH');
}
function mergeUnique(a,b){
  const m=new Map();
  for(const item of [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])])m.set(typeof item==='string'?`s:${item}`:`o:${JSON.stringify(item)}`,item);
  return [...m.values()];
}
function mergeActiveStates(localInput,remoteInput,{ownerUid=null,clock=Date.now()}={}){
  const local=object(localInput)?clone(localInput):{},remote=object(remoteInput)?clone(remoteInput):{};
  enforceOwner(local,ownerUid);enforceOwner(remote,ownerUid);
  delete local.cloudUpdatedAt;delete remote.cloudUpdatedAt;
  const localStamp=stateStamp(local),remoteStamp=stateStamp(remote),preferRemote=remoteStamp>localStamp;
  const older=preferRemote?local:remote,newer=preferRemote?remote:local;
  const merged={...older,...newer};
  merged.meta={...(object(older.meta)?older.meta:{}),...(object(newer.meta)?newer.meta:{})};
  const tombstones=mergeTombstones(local?.meta?.syncTombstones,remote?.meta?.syncTombstones,clock);
  for(const domain of DOMAINS)merged[domain]=mergeRows(local[domain],remote[domain],{preferRemote,tombstones,domain});
  merged.memory={...(object(older.memory)?older.memory:{}),...(object(newer.memory)?newer.memory:{})};
  for(const bucket of ['facts','preferences','goals','events'])merged.memory[bucket]=mergeUnique(local?.memory?.[bucket],remote?.memory?.[bucket]);
  merged.memory.deletedIds=[...new Set([...(local?.memory?.deletedIds||[]),...(remote?.memory?.deletedIds||[])].map(String))];
  merged.memory.entries=mergeRows(local?.memory?.entries,remote?.memory?.entries,{preferRemote,tombstones,domain:'memory'}).filter(x=>!merged.memory.deletedIds.includes(String(x.id)));
  merged.actionLog=mergeRows(local.actionLog,remote.actionLog,{preferRemote,domain:'actionLog'});
  merged.errors=mergeRows(local.errors,remote.errors,{preferRemote,domain:'errors'});
  merged.analytics={...(object(older.analytics)?older.analytics:{}),...(object(newer.analytics)?newer.analytics:{})};
  merged.analytics.events=mergeRows(local?.analytics?.events,remote?.analytics?.events,{preferRemote,domain:'analytics'});
  const latestAt=Math.max(localStamp,remoteStamp,Date.parse(merged.meta.updatedAt||0)||0);
  if(latestAt)merged.meta.updatedAt=new Date(latestAt).toISOString();
  merged.meta.syncTombstones=tombstones;
  merged.meta.syncOwnerUid=ownerUid||merged.meta.syncOwnerUid||null;
  merged.meta.syncRevision=Math.max(Number(local?.meta?.syncRevision)||0,Number(remote?.meta?.syncRevision)||0);
  merged.meta.syncLastMergeAt=nowIso(clock);
  merged.clientUpdatedAt=merged.meta.updatedAt||merged.clientUpdatedAt||null;
  return merged;
}
function newestRows(list,limit){
  if(!Array.isArray(list)||list.length<=limit)return Array.isArray(list)?list:[];
  return list.slice().sort((a,b)=>rowStamp(a)-rowStamp(b)).slice(-limit);
}
function compactForCloud(input){
  const out=clone(input||{});delete out.syncState;delete out.cloudUpdatedAt;
  for(const [domain,limit] of Object.entries(CLOUD_LIMITS))out[domain]=newestRows(out[domain],limit);
  if(object(out.memory)){
    out.memory.entries=newestRows(out.memory.entries,400);
    out.memory.events=Array.isArray(out.memory.events)?out.memory.events.slice(-300):[];
  }
  if(object(out.analytics))out.analytics.events=newestRows(out.analytics.events,400);
  if(Array.isArray(out.runs))out.runs=out.runs.map(r=>({...r,coords:Array.isArray(r.coords)?r.coords.slice(-250):[]}));
  if(object(out.meta))out.meta.syncTombstones=normalizeTombstones(out.meta.syncTombstones);
  return out;
}
function retryDelay(attempt){return Math.min(60000,1200*Math.pow(2,Math.max(0,Math.min(6,Number(attempt)||0))));}
function counts(state){
  const result={};for(const d of DOMAINS)result[d]=Array.isArray(state?.[d])?state[d].length:0;
  result.memory=Array.isArray(state?.memory?.entries)?state.memory.entries.length:0;return result;
}
function createExportEnvelope(state,{scope='local',exportedAt=new Date().toISOString()}={}){
  const payload=clone(state||{});return {format:'GARANG_BACKUP_V1',version:1,exportedAt,scope,manifest:{schemaVersion:Number(payload?.meta?.schemaVersion||payload?.schemaVersion)||null,counts:counts(payload),updatedAt:payload?.meta?.updatedAt||null},payload};
}
function verifyExportEnvelope(envelope){
  if(!object(envelope)||envelope.format!=='GARANG_BACKUP_V1'||envelope.version!==1||!object(envelope.payload))return false;
  const expected=envelope.manifest?.counts||{},actual=counts(envelope.payload);
  return Object.keys(actual).every(k=>Number(expected[k])===actual[k]);
}
function fingerprint(state){
  const s=compactForCloud(state||{});delete s.cloudUpdatedAt;return JSON.stringify(s);
}

return Object.freeze({VERSION,DOMAINS,DEMO_KEY,isStateKey,stateKey,ownerFromKey,rowStamp,stateStamp,normalizeTombstones,mergeTombstones,collectNewTombstones,withLocalMetadata,mergeRows,mergeActiveStates,compactForCloud,retryDelay,createExportEnvelope,verifyExportEnvelope,fingerprint});
});
