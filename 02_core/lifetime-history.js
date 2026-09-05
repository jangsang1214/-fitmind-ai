(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GarangLifetimeHistory=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='garang-lifetime-history-v1';
const USER_KEY_RE=/^garang_user_(.+)_v3$/;
const DOMAINS=Object.freeze(['workouts','meals']);
const COLLECTIONS=Object.freeze({workouts:'workoutHistory',meals:'mealHistory'});
const jsonParse=JSON.parse.bind(JSON),jsonStringify=JSON.stringify.bind(JSON);

const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>value===undefined?undefined:jsonParse(jsonStringify(value));
const iso=value=>{const n=Date.parse(value||0);return Number.isFinite(n)&&n>0?n:0;};
const rowStamp=row=>Math.max(iso(row?.updatedAt),iso(row?.createdAt),iso(row?.date),Number(row?.updatedAtMs)||0,Number(row?.revision)||0);
const ownerFromKey=key=>{const match=String(key||'').match(USER_KEY_RE);return match?match[1]:null;};
const isStateKey=key=>USER_KEY_RE.test(String(key||''));
const stateKey=uid=>`garang_user_${uid}_v3`;
const collectionFor=domain=>COLLECTIONS[domain]||null;
const encodeRecordId=id=>encodeURIComponent(String(id||''));
const rows=value=>Array.isArray(value)?value.filter(object):[];
const fingerprint=value=>{try{return jsonStringify(value||null);}catch{return '';}};

function tombstonesFor(state,domain){
  return rows(state?.meta?.syncTombstones).filter(item=>String(item.domain||'')===domain&&item.id);
}
function deletedBy(tombstones,id,record){
  const hit=tombstones.find(item=>String(item.id)===String(id));
  return !!hit&&iso(hit.deletedAt)>=rowStamp(record);
}
function mergeRows(current,archived,{tombstones=[]}={}){
  const byId=new Map();
  const feed=list=>{
    for(const row of rows(list)){
      const id=String(row.id||'');if(!id||deletedBy(tombstones,id,row))continue;
      const previous=byId.get(id);
      if(!previous||rowStamp(row)>=rowStamp(previous))byId.set(id,clone(row));
    }
  };
  feed(current);feed(archived);
  return [...byId.values()].sort((a,b)=>rowStamp(a)-rowStamp(b));
}
function mergeStateWithHistory(stateInput,historyByDomain={}){
  const out=clone(object(stateInput)?stateInput:{});out.meta=object(out.meta)?out.meta:{};
  for(const domain of DOMAINS)out[domain]=mergeRows(out[domain],historyByDomain?.[domain],{tombstones:tombstonesFor(out,domain)});
  return out;
}
function archivePayload(domain,record,ownerUid,{archivedAt=new Date().toISOString()}={}){
  if(!DOMAINS.includes(domain)||!object(record)||!record.id||!ownerUid)throw new Error('INVALID_HISTORY_RECORD');
  return {historyVersion:1,ownerUid:String(ownerUid),domain,recordId:String(record.id),record:clone(record),recordUpdatedAt:record.updatedAt||record.createdAt||record.date||null,archivedAt};
}
function hydrateArchiveDoc(value){
  if(!object(value))return null;
  if(object(value.record)&&value.record.id)return clone(value.record);
  if(value.id)return clone(value);
  return null;
}
function diffForArchive(previousInput,nextInput){
  const previous=object(previousInput)?previousInput:{},next=object(nextInput)?nextInput:{};
  const upserts=[],deletes=[];
  for(const domain of DOMAINS){
    const before=new Map(rows(previous[domain]).filter(row=>row.id).map(row=>[String(row.id),row]));
    for(const row of rows(next[domain])){
      if(!row.id)continue;
      const old=before.get(String(row.id));
      if(!old||fingerprint(old)!==fingerprint(row))upserts.push({domain,record:clone(row)});
    }
    const previousDeletes=new Set(tombstonesFor(previous,domain).map(item=>`${item.id}:${item.deletedAt}`));
    for(const item of tombstonesFor(next,domain)){
      const key=`${item.id}:${item.deletedAt}`;
      if(!previousDeletes.has(key))deletes.push({domain,id:String(item.id),deletedAt:String(item.deletedAt||'')});
    }
  }
  return {upserts,deletes};
}
function historySignature(state){
  const parts=[];
  for(const domain of DOMAINS){
    const list=rows(state?.[domain]),latest=list.reduce((max,row)=>Math.max(max,rowStamp(row)),0);
    parts.push(`${domain}:${list.length}:${latest}`);
  }
  const deletes=DOMAINS.reduce((sum,domain)=>sum+tombstonesFor(state,domain).length,0);
  return `${parts.join('|')}|deletes:${deletes}`;
}

return Object.freeze({VERSION,DOMAINS,COLLECTIONS,isStateKey,stateKey,ownerFromKey,collectionFor,encodeRecordId,rowStamp,tombstonesFor,mergeRows,mergeStateWithHistory,archivePayload,hydrateArchiveDoc,diffForArchive,historySignature});
});
