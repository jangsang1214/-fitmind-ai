(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GarangRecordPersistenceCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='garang-record-persistence-v2';
const DOMAINS=Object.freeze(['workouts','meals','runs','body','planner','checkins']);
const COLLECTIONS=Object.freeze({
  workouts:'workoutRecords',
  meals:'mealRecords',
  runs:'runRecords',
  body:'bodyRecords',
  planner:'plannerRecords',
  checkins:'checkinRecords'
});
const LEGACY_COLLECTIONS=Object.freeze({workouts:'workoutHistory',meals:'mealHistory'});
const STATE_PREVIEW_LIMIT=20;
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const rows=value=>Array.isArray(value)?value.filter(object):[];
const iso=value=>{const n=Date.parse(value||0);return Number.isFinite(n)&&n>0?n:0;};
const fallbackStamp=(record,clock=Date.now())=>{
  if(record?.date&&/^\d{4}-\d{2}-\d{2}$/.test(String(record.date))){const n=Date.parse(`${record.date}T12:00:00.000Z`);if(Number.isFinite(n))return n;}
  return Number(clock)||Date.now();
};
const recordStamp=record=>Math.max(iso(record?.updatedAt),iso(record?.createdAt),Number(record?.updatedAtMs)||0,Number(record?.revision)||0);
const stateKey=uid=>`garang_user_${uid}_v3`;
const collectionFor=domain=>COLLECTIONS[domain]||null;
const legacyCollectionFor=domain=>LEGACY_COLLECTIONS[domain]||null;
const encodeId=id=>encodeURIComponent(String(id||''));

function normalizeRecord(domain,input,{ownerUid=null,clock=Date.now()}={}){
  if(!DOMAINS.includes(domain)||!object(input))return null;
  const record=clone(input),id=String(record.id||'').trim();
  if(!id)return null;
  const fallback=new Date(fallbackStamp(record,clock)).toISOString();
  const createdAt=iso(record.createdAt)?new Date(iso(record.createdAt)).toISOString():fallback;
  const updatedAt=iso(record.updatedAt)?new Date(iso(record.updatedAt)).toISOString():createdAt;
  const revision=Math.max(1,Math.floor(Number(record.revision)||1));
  return {...record,id,createdAt,updatedAt,revision,ownerUid:ownerUid?String(ownerUid):(record.ownerUid?String(record.ownerUid):null)};
}

function normalizeStateRecords(input,{ownerUid=null,clock=Date.now()}={}){
  const state=object(input)?clone(input):{};
  for(const domain of DOMAINS)state[domain]=rows(state[domain]).map(record=>normalizeRecord(domain,record,{ownerUid,clock})).filter(Boolean);
  return state;
}

function newest(a,b){
  const ar=Number(a?.revision)||0,br=Number(b?.revision)||0,at=recordStamp(a),bt=recordStamp(b);
  if(br!==ar)return br>ar?b:a;
  if(bt!==at)return bt>at?b:a;
  return b;
}

function tombstones(state,domain){
  return rows(state?.meta?.syncTombstones).filter(item=>String(item.domain||'')===domain&&item.id&&iso(item.deletedAt));
}
function isDeleted(state,domain,record){
  const hit=tombstones(state,domain).find(item=>String(item.id)===String(record?.id));
  return !!hit&&iso(hit.deletedAt)>=recordStamp(record);
}

function mergeDomain(domain,current,archived,{state={},ownerUid=null,clock=Date.now()}={}){
  const map=new Map();
  for(const source of [current,archived])for(const raw of rows(source)){
    const record=normalizeRecord(domain,raw,{ownerUid,clock});if(!record||isDeleted(state,domain,record))continue;
    const old=map.get(record.id);map.set(record.id,old?clone(newest(old,record)):record);
  }
  return [...map.values()].sort((a,b)=>recordStamp(a)-recordStamp(b));
}

function mergeIntoState(input,historyByDomain,{ownerUid=null,clock=Date.now()}={}){
  const state=normalizeStateRecords(input,{ownerUid,clock});
  for(const domain of DOMAINS)state[domain]=mergeDomain(domain,state[domain],historyByDomain?.[domain],{state,ownerUid,clock});
  state.meta=object(state.meta)?state.meta:{};
  state.meta.recordPersistenceVersion=2;
  return state;
}

function compactStateDocument(input){
  const state=object(input)?clone(input):{};
  const counts={};
  for(const domain of DOMAINS){
    const list=rows(state[domain]);counts[domain]=list.length;state[domain]=list.slice(-STATE_PREVIEW_LIMIT);
  }
  state.meta=object(state.meta)?state.meta:{};
  state.meta.recordPersistenceVersion=2;
  state.meta.recordCounts=counts;
  return state;
}

function manifestFingerprint(record){
  const normalized=object(record)?record:{};
  const parts=[String(normalized.id||''),String(normalized.revision||1),String(normalized.updatedAt||''),JSON.stringify(normalized)];
  let h=2166136261;
  const text=parts.join('|');
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,'0');
}

return Object.freeze({VERSION,DOMAINS,COLLECTIONS,LEGACY_COLLECTIONS,STATE_PREVIEW_LIMIT,stateKey,collectionFor,legacyCollectionFor,encodeId,recordStamp,normalizeRecord,normalizeStateRecords,mergeDomain,mergeIntoState,compactStateDocument,manifestFingerprint});
});
