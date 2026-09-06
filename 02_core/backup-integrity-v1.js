(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GarangBackupIntegrity=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const FORMAT='GARANG_BACKUP_V2';
function stable(value){
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function checksum(value){
  const text=typeof value==='string'?value:stable(value);let h1=0x811c9dc5,h2=0x9e3779b9;
  for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);h1^=c;h1=Math.imul(h1,0x01000193);h2^=(c+i);h2=Math.imul(h2,0x85ebca6b);}
  return `${(h1>>>0).toString(16).padStart(8,'0')}${(h2>>>0).toString(16).padStart(8,'0')}`;
}
function counts(state){const out={};for(const key of ['workouts','meals','runs','body','planner','checkins','aiChat'])out[key]=Array.isArray(state?.[key])?state[key].length:0;out.memory=Array.isArray(state?.memory?.entries)?state.memory.entries.length:0;return out;}
function createEnvelope(state,{scope='local',exportedAt=new Date().toISOString()}={}){const payload=JSON.parse(JSON.stringify(state||{}));return {format:FORMAT,version:2,exportedAt,scope,checksumAlgorithm:'fnv1a-dual32',payloadChecksum:checksum(payload),manifest:{counts:counts(payload),updatedAt:payload?.meta?.updatedAt||null,schemaVersion:payload?.meta?.schemaVersion||payload?.schemaVersion||null},payload};}
function verifyEnvelope(envelope){if(!envelope||envelope.format!==FORMAT||envelope.version!==2||!envelope.payload)return false;if(checksum(envelope.payload)!==envelope.payloadChecksum)return false;const actual=counts(envelope.payload),expected=envelope.manifest?.counts||{};return Object.keys(actual).every(k=>Number(expected[k])===actual[k]);}
return Object.freeze({FORMAT,stable,checksum,counts,createEnvelope,verifyEnvelope});
});
