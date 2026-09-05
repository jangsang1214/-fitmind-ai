/* GARANG Agent State Hook v1
   Captures the live application state without changing app.js internals.
   Loaded before app.js so Agent writes can mutate the same state object,
   then persist through GARANG's existing storage/sync path.
*/
(() => {
'use strict';

const nativeParse=JSON.parse.bind(JSON);
const nativeStringify=JSON.stringify.bind(JSON);
const nativeSetItem=Storage.prototype.setItem;
let liveState=null;
let activeKey=null;
let syncTimer=null;

const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const isState=value=>isObject(value)&&Array.isArray(value.planner)&&Array.isArray(value.workouts)&&Array.isArray(value.meals)&&isObject(value.memory)&&isObject(value.preferences);
const isStateKey=key=>/^garang_(?:demo_state_v3|user_.+_v3)$/.test(String(key||''));
const clone=value=>value===undefined?undefined:nativeParse(nativeStringify(value));
const id=prefix=>globalThis.crypto?.randomUUID?.()||`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const now=()=>new Date().toISOString();
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

function capture(value){if(isState(value))liveState=value;return value;}

JSON.parse=function(...args){return capture(nativeParse(...args));};
JSON.stringify=function(value,...args){capture(value);return nativeStringify(value,...args);};
Storage.prototype.setItem=function(key,value){if(this===localStorage&&isStateKey(key))activeKey=String(key);return nativeSetItem.call(this,key,value);};

function resolveKey(){
 if(activeKey&&localStorage.getItem(activeKey)!==null)return activeKey;
 const candidates=[];
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i);if(!isStateKey(key))continue;
  try{const parsed=nativeParse(localStorage.getItem(key)||'null');if(isState(parsed))candidates.push({key,updated:String(parsed.meta?.updatedAt||'')});}catch{}
 }
 candidates.sort((a,b)=>b.updated.localeCompare(a.updated));
 if(candidates[0])activeKey=candidates[0].key;
 return activeKey;
}

function persist(tool,args){
 if(!liveState)throw new Error('AGENT_STATE_NOT_READY');
 liveState.meta=isObject(liveState.meta)?liveState.meta:{};
 liveState.meta.updatedAt=now();
 liveState.actionLog=Array.isArray(liveState.actionLog)?liveState.actionLog:[];
 liveState.actionLog.push({id:id('action'),action:`agent_${tool}`,args:clone(args||{}),userConfirmed:true,at:now()});
 if(liveState.actionLog.length>300)liveState.actionLog.splice(0,liveState.actionLog.length-300);
 const key=resolveKey();
 if(!key)throw new Error('AGENT_STORAGE_KEY_NOT_READY');
 nativeSetItem.call(localStorage,key,nativeStringify(liveState));
 window.dispatchEvent(new CustomEvent('garang:agent-write',{detail:{tool,args:clone(args||{}),at:liveState.meta.updatedAt}}));
 clearTimeout(syncTimer);
 syncTimer=setTimeout(()=>{
  try{if(window.firebase?.auth?.().currentUser)document.getElementById('syncBadge')?.click();}catch{}
 },120);
}

function requireState(){if(!liveState)throw new Error('AGENT_STATE_NOT_READY');return liveState;}
function removeById(list,idValue){const index=list.findIndex(row=>String(row?.id)===String(idValue));if(index<0)return false;list.splice(index,1);return true;}

function applyWrite(tool,args={}){
 const state=requireState(),stamp=now();
 switch(tool){
  case 'createPlan':{
   state.planner=Array.isArray(state.planner)?state.planner:[];
   const row={id:id('plan'),date:String(args.date||today()),time:String(args.time||''),type:String(args.type||'custom'),title:String(args.title||'').trim(),source:'ai',origin:'ai',status:'confirmed',completed:false,createdAt:stamp,updatedAt:stamp};
   if(!row.title)throw new Error('INVALID_TOOL_ARGS');
   state.planner.push(row);persist(tool,args);return clone(row);
  }
  case 'updatePlan':{
   const row=(Array.isArray(state.planner)?state.planner:[]).find(item=>String(item.id)===String(args.id));if(!row)throw new Error('PLAN_NOT_FOUND');
   for(const key of ['title','date','time','type'])if(args[key]!==undefined)row[key]=String(args[key]);
   if(args.completed!==undefined)row.completed=!!args.completed;if(args.done!==undefined)row.completed=!!args.done;row.updatedAt=stamp;row.source='ai';row.origin='ai';persist(tool,args);return clone(row);
  }
  case 'saveMemory':{
   state.memory=isObject(state.memory)?state.memory:{};state.memory.entries=Array.isArray(state.memory.entries)?state.memory.entries:[];
   const type=String(args.type||'note').trim()||'note',key=String(args.key||'').trim(),value=String(args.value||'').trim();if(!key||!value)throw new Error('INVALID_TOOL_ARGS');
   let row=state.memory.entries.find(item=>String(item?.type||'note')===type&&String(item?.key||'')===key);
   if(row){Object.assign(row,{value,source:'agent',confidence:Math.max(Number(row.confidence)||0,.95),importance:Math.max(Number(row.importance)||0,Number(args.importance)||3),userConfirmed:true,updatedAt:stamp,lastSeenAt:stamp});}
   else{row={id:id('mem'),type,key,value,source:'agent',confidence:.95,importance:Math.max(1,Math.min(5,Number(args.importance)||3)),evidenceCount:1,userConfirmed:true,createdAt:stamp,updatedAt:stamp,lastSeenAt:stamp,expiresAt:args.expiresAt||null};state.memory.entries.push(row);}
   persist(tool,args);return clone(row);
  }
  case 'deleteRecord':{
   const domain=String(args.domain||''),target=String(args.id||'');let removed=false;
   if(domain==='memory'){state.memory=isObject(state.memory)?state.memory:{};state.memory.entries=Array.isArray(state.memory.entries)?state.memory.entries:[];removed=removeById(state.memory.entries,target);}
   else if(['workouts','meals','runs','body','planner'].includes(domain)){state[domain]=Array.isArray(state[domain])?state[domain]:[];removed=removeById(state[domain],target);}
   else throw new Error('INVALID_TOOL_ARGS');
   if(!removed)throw new Error('RECORD_NOT_FOUND');persist(tool,args);return {domain,id:target,deleted:true};
  }
  case 'updateGoal':{
   const goal=String(args.goal||'').trim();if(!goal)throw new Error('INVALID_TOOL_ARGS');
   state.profile=isObject(state.profile)?state.profile:{};state.profile.goal=goal;
   state.onboarding=isObject(state.onboarding)?state.onboarding:{};state.onboarding.goal=goal;
   persist(tool,args);return {goal};
  }
  default:throw new Error('TOOL_NOT_ALLOWED');
 }
}

window.GarangAgentStateBridge=Object.freeze({
 ready:()=>!!liveState,
 capture,
 getState:()=>clone(requireState()),
 getLiveState:()=>requireState(),
 getStorageKey:()=>resolveKey(),
 applyWrite
});
})();
