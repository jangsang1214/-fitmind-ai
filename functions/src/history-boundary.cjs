'use strict';

const COLLECTIONS=Object.freeze({workouts:'workoutHistory',meals:'mealHistory',runs:'runHistory',body:'bodyHistory'});
const DOMAINS=Object.freeze(Object.keys(COLLECTIONS));
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const rows=value=>Array.isArray(value)?value.filter(object):[];
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const iso=value=>{const n=Date.parse(value||0);return Number.isFinite(n)&&n>0?n:0;};
const dateStamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?iso(`${value}T00:00:00.000Z`):0;
const rowStamp=row=>Math.max(iso(row?.updatedAt),iso(row?.createdAt),dateStamp(row?.date),Number(row?.updatedAtMs)||0,Number(row?.revision)||0);
function recordId(domain,row,index=0){return String(row?.id||`server_${domain}_${index}`);}
function tombstonesFor(state,domain){return rows(state?.meta?.syncTombstones).filter(item=>String(item.domain||'')===domain&&item.id&&item.explicit===true);}
function deletedBy(state,domain,row){const id=recordId(domain,row),hit=tombstonesFor(state,domain).find(item=>String(item.id)===id);return !!hit&&iso(hit.deletedAt)>=rowStamp(row);}
function mergeRows(domain,a,b,state={}){const map=new Map();for(const [index,row] of [...rows(a),...rows(b)].entries()){if(deletedBy(state,domain,row))continue;const normalized={...clone(row),id:recordId(domain,row,index)};const old=map.get(normalized.id);if(!old||rowStamp(normalized)>=rowStamp(old))map.set(normalized.id,normalized);}return [...map.values()].sort((x,y)=>rowStamp(x)-rowStamp(y));}
function mergeStateWithHistory(stateInput,historyByDomain={}){const state=clone(object(stateInput)?stateInput:{});state.meta=object(state.meta)?state.meta:{};for(const domain of DOMAINS)state[domain]=mergeRows(domain,state[domain],historyByDomain?.[domain],state);return state;}
function recordFromDoc(value){if(!object(value))return null;if(object(value.record))return clone(value.record);return value.id?clone(value):null;}
module.exports={COLLECTIONS,DOMAINS,rowStamp,tombstonesFor,mergeRows,mergeStateWithHistory,recordFromDoc};
