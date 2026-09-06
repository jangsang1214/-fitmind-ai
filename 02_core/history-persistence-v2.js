(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GarangHistoryPersistence=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='garang-history-persistence-v2.2';
const DOMAINS=Object.freeze(['workouts','meals','runs','body']);
const COLLECTIONS=Object.freeze({workouts:'workoutHistory',meals:'mealHistory',runs:'runHistory',body:'bodyHistory'});
const SHELL_LIMITS=Object.freeze({workouts:40,meals:40,runs:20,body:40});
const TARGET_SHELL_BYTES=700000;
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const rows=value=>Array.isArray(value)?value.filter(object):[];
const iso=value=>{const n=Date.parse(value||0);return Number.isFinite(n)&&n>0?n:0;};
const dateStamp=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return 0;return iso(`${value}T00:00:00.000Z`);};
const rowStamp=row=>Math.max(iso(row?.updatedAt),iso(row?.createdAt),dateStamp(row?.date),Number(row?.updatedAtMs)||0,Number(row?.revision)||0);
const stableStringify=value=>{const seen=new WeakSet();const walk=v=>{if(Array.isArray(v))return v.map(walk);if(object(v)){if(seen.has(v))return null;seen.add(v);return Object.fromEntries(Object.keys(v).sort().map(k=>[k,walk(v[k])]));}return v;};return JSON.stringify(walk(value));};
function fnv1a(value){let hash=0x811c9dc5;const text=String(value??'');for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193)>>>0;}return hash.toString(16).padStart(8,'0');}
function recordId(domain,row){if(row?.id)return String(row.id);const seed=stableStringify({domain,date:row?.date||'',name:row?.name||'',sessionId:row?.sessionId||'',distance:row?.distance||0,weight:row?.weight||0,bodyFat:row?.bodyFat??row?.fatPercent??null});return `${domain.slice(0,3)}_${fnv1a(seed)}`;}
function fallbackTime(row){if(iso(row?.updatedAt))return new Date(iso(row.updatedAt)).toISOString();if(iso(row?.createdAt))return new Date(iso(row.createdAt)).toISOString();if(dateStamp(row?.date))return new Date(dateStamp(row.date)).toISOString();return new Date(0).toISOString();}
function normalizeRecord(domain,input,ownerUid){if(!DOMAINS.includes(domain)||!object(input))return null;const row=clone(input),id=recordId(domain,row),baseTime=fallbackTime(row);row.id=id;row.createdAt=iso(row.createdAt)?new Date(iso(row.createdAt)).toISOString():baseTime;row.updatedAt=iso(row.updatedAt)?new Date(iso(row.updatedAt)).toISOString():baseTime;row.revision=Math.max(1,Number(row.revision)||1);if(ownerUid)row.ownerUid=String(ownerUid);return row;}
function tombstonesFor(state,domain){return rows(state?.meta?.syncTombstones).filter(item=>String(item.domain||'')===domain&&item.id);}
function deletedBy(state,domain,row){const id=recordId(domain,row),hit=tombstonesFor(state,domain).find(item=>String(item.id)===id);return !!hit&&iso(hit.deletedAt)>=rowStamp(row);}
function mergeRows(domain,a,b,state={}){const map=new Map();for(const row of [...rows(a),...rows(b)]){if(deletedBy(state,domain,row))continue;const normalized=normalizeRecord(domain,row,row.ownerUid||state?.meta?.syncOwnerUid||null);if(!normalized)continue;const old=map.get(normalized.id);if(!old||rowStamp(normalized)>=rowStamp(old))map.set(normalized.id,normalized);}return [...map.values()].sort((x,y)=>rowStamp(x)-rowStamp(y));}
function mergeStateWithHistory(stateInput,historyByDomain={}){const state=clone(object(stateInput)?stateInput:{});state.meta=object(state.meta)?state.meta:{};for(const domain of DOMAINS)state[domain]=mergeRows(domain,state[domain],historyByDomain?.[domain],state);return state;}
function estimateJsonBytes(value){try{return new TextEncoder().encode(JSON.stringify(value)).length;}catch{return JSON.stringify(value||{}).length*2;}}
function trimAuxiliary(out){
  if(Array.isArray(out.aiChat))out.aiChat=out.aiChat.slice(-30);
  if(Array.isArray(out.actionLog))out.actionLog=out.actionLog.slice(-120);
  if(Array.isArray(out.errors))out.errors=out.errors.slice(-40);
  if(Array.isArray(out.planner))out.planner=out.planner.slice(-160);
  if(Array.isArray(out.checkins))out.checkins=out.checkins.slice(-120);
  if(object(out.analytics)&&Array.isArray(out.analytics.events))out.analytics.events=out.analytics.events.slice(-120);
  if(object(out.memory)){if(Array.isArray(out.memory.entries))out.memory.entries=out.memory.entries.slice(-180);if(Array.isArray(out.memory.events))out.memory.events=out.memory.events.slice(-120);}
}
function historyUpdatedAt(input){
  const stamps=[iso(input?.meta?.updatedAt),iso(input?.clientUpdatedAt),Number(input?.updatedAtMs)||0];
  for(const domain of DOMAINS)for(const row of rows(input?.[domain]))stamps.push(rowStamp(row));
  const latest=Math.max(0,...stamps);return latest?new Date(latest).toISOString():null;
}
function compactShell(input){
  const out=clone(object(input)?input:{});
  for(const domain of DOMAINS){const limit=SHELL_LIMITS[domain],list=rows(out[domain]).slice().sort((a,b)=>rowStamp(a)-rowStamp(b)).slice(-limit);out[domain]=domain==='runs'?list.map(run=>({...run,coords:[]})):list;}
  out.meta=object(out.meta)?out.meta:{};
  out.meta.historyV2={version:2,collections:{...COLLECTIONS},counts:Object.fromEntries(DOMAINS.map(d=>[d,rows(input?.[d]).length])),updatedAt:historyUpdatedAt(input)};
  if(estimateJsonBytes(out)>TARGET_SHELL_BYTES)trimAuxiliary(out);
  out.meta.historyV2.shellBytes=estimateJsonBytes(out);
  return out;
}
function docPayload(domain,record,ownerUid){const normalized=normalizeRecord(domain,record,ownerUid);if(!normalized)return null;return {historyVersion:2,ownerUid:String(ownerUid||''),domain,recordId:normalized.id,record:normalized,recordUpdatedAt:normalized.updatedAt,revision:normalized.revision};}
function recordFromDoc(value){if(!object(value))return null;if(object(value.record))return clone(value.record);return value.id?clone(value):null;}
function fingerprint(domain,row){const normalized=normalizeRecord(domain,row,row?.ownerUid||null);return normalized?fnv1a(stableStringify(normalized)):'';}
function historyIndex(state){const out={};for(const domain of DOMAINS)out[domain]=Object.fromEntries(rows(state?.[domain]).map(row=>{const normalized=normalizeRecord(domain,row,state?.meta?.syncOwnerUid||row?.ownerUid||null);return [normalized.id,fingerprint(domain,normalized)];}));return out;}
return Object.freeze({VERSION,DOMAINS,COLLECTIONS,SHELL_LIMITS,TARGET_SHELL_BYTES,rows,rowStamp,recordId,normalizeRecord,tombstonesFor,mergeRows,mergeStateWithHistory,compactShell,docPayload,recordFromDoc,fingerprint,historyIndex,estimateJsonBytes,stableStringify,fnv1a,historyUpdatedAt});
});
