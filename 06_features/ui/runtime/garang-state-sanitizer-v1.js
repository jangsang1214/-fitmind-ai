/* GARANG state sanitizer v1
   Data-only preboot repair. No DOM events, timers, Firebase hooks or prototype patches.
*/
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.GarangStateSanitizer=api;
    try{api.repairLocalStorage(root.localStorage);}catch(error){console.warn('[GARANG] state sanitizer deferred',error);}
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const DEMO_KEY='garang_demo_state_v3';
const USER_KEY_RE=/^garang_user_(.+)_v3$/;
const BACKUP_PREFIX='garang_state_recovery_backup_v1::';
const ROW_DOMAINS=['checkins','planner','workouts','meals','runs','body','aiChat','actionLog','errors'];
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>JSON.parse(JSON.stringify(value));
const rows=value=>Array.isArray(value)?value.filter(object):[];
const ownerFromKey=key=>{const hit=String(key||'').match(USER_KEY_RE);return hit?hit[1]:null;};
const isStateKey=key=>String(key||'')===DEMO_KEY||USER_KEY_RE.test(String(key||''));

function sanitizeState(input,{ownerUid=null}={}){
  let out={};
  try{out=object(input)?clone(input):{};}catch{out={};}
  out.meta=object(out.meta)?out.meta:{};
  if(ownerUid&&!out.meta.syncOwnerUid)out.meta.syncOwnerUid=String(ownerUid);
  for(const domain of ROW_DOMAINS)out[domain]=rows(out[domain]);
  out.meals=out.meals.map(meal=>({...meal,items:rows(meal.items)}));
  out.memory=object(out.memory)?out.memory:{};
  out.memory.entries=rows(out.memory.entries);
  for(const bucket of ['facts','preferences','goals','events'])out.memory[bucket]=Array.isArray(out.memory[bucket])?out.memory[bucket].filter(value=>value!=null):[];
  out.memory.deletedIds=Array.isArray(out.memory.deletedIds)?[...new Set(out.memory.deletedIds.filter(value=>value!=null).map(String))]:[];
  out.analytics=object(out.analytics)?out.analytics:{};
  out.analytics.events=rows(out.analytics.events);
  out.onboarding=object(out.onboarding)?out.onboarding:{};
  out.preferences=object(out.preferences)?out.preferences:{};
  if(out.profile!==null&&!object(out.profile))out.profile=null;
  return out;
}

function repairLocalStorage(storage){
  const report={checked:0,repaired:0,invalidJson:0,keys:[]};
  if(!storage)return report;
  const keys=[];
  try{for(let i=0;i<storage.length;i++){const key=storage.key(i);if(isStateKey(key))keys.push(key);}}catch{return report;}
  for(const key of keys){
    report.checked++;
    let raw=null,parsed=null;
    try{raw=storage.getItem(key);parsed=raw?JSON.parse(raw):null;}catch{report.invalidJson++;continue;}
    if(!object(parsed))continue;
    const safe=sanitizeState(parsed,{ownerUid:ownerFromKey(key)}),next=JSON.stringify(safe);
    if(next===JSON.stringify(parsed))continue;
    try{
      if(raw!=null&&!storage.getItem(`${BACKUP_PREFIX}${key}`))storage.setItem(`${BACKUP_PREFIX}${key}`,raw);
      storage.setItem(key,next);
      report.repaired++;report.keys.push(key);
    }catch{}
  }
  return report;
}

return Object.freeze({VERSION:'garang-state-sanitizer-v1',DEMO_KEY,USER_KEY_RE,BACKUP_PREFIX,ROW_DOMAINS,isStateKey,ownerFromKey,sanitizeState,repairLocalStorage});
});
