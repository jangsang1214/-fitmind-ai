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
const Memory=window.GarangMemoryIntelligence||null;
const StateIntelligence=window.GarangStateIntelligence||null;
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
 candidates.sort((a,b)=>b.updated.localeCompare(a.updated));if(candidates[0])activeKey=candidates[0].key;return activeKey;
}
function persist(tool,args){
 if(!liveState)throw new Error('AGENT_STATE_NOT_READY');liveState.meta=isObject(liveState.meta)?liveState.meta:{};liveState.meta.updatedAt=now();liveState.actionLog=Array.isArray(liveState.actionLog)?liveState.actionLog:[];liveState.actionLog.push({id:id('action'),action:`agent_${tool}`,args:clone(args||{}),userConfirmed:true,at:now()});if(liveState.actionLog.length>300)liveState.actionLog.splice(0,liveState.actionLog.length-300);const key=resolveKey();if(!key)throw new Error('AGENT_STORAGE_KEY_NOT_READY');nativeSetItem.call(localStorage,key,nativeStringify(liveState));window.dispatchEvent(new CustomEvent('garang:agent-write',{detail:{tool,args:clone(args||{}),at:liveState.meta.updatedAt}}));clearTimeout(syncTimer);syncTimer=setTimeout(()=>{try{if(window.firebase?.auth?.().currentUser)document.getElementById('syncBadge')?.click();}catch{}},120);
}
function requireState(){if(!liveState)throw new Error('AGENT_STATE_NOT_READY');return liveState;}
function removeById(list,idValue){const index=list.findIndex(row=>String(row?.id)===String(idValue));if(index<0)return false;list.splice(index,1);return true;}
function ensureMemory(state){state.memory=isObject(state.memory)?state.memory:{};state.memory.entries=Array.isArray(state.memory.entries)?state.memory.entries:[];state.memory.deletedIds=Array.isArray(state.memory.deletedIds)?state.memory.deletedIds:[];return state.memory;}
function intelligentUpsert(state,candidate,stamp){const memory=ensureMemory(state);if(Memory?.upsertMemory){memory.entries=Memory.upsertMemory(memory.entries,{...candidate,updatedAt:stamp,observedAt:candidate.observedAt||stamp,lastSeenAt:stamp},{now:new Date(stamp)});const key=Memory.semanticKey(candidate);return clone(memory.entries.find(row=>row.status==='active'&&Memory.semanticKey(row)===key)||memory.entries.at(-1));}const type=String(candidate.type||'note'),key=String(candidate.key||''),value=String(candidate.value||'');let row=memory.entries.find(item=>String(item?.type||'note')===type&&String(item?.key||'')===key);if(row)Object.assign(row,{value,source:candidate.source||'agent',confidence:Math.max(Number(row.confidence)||0,Number(candidate.confidence)||.95),importance:Math.max(Number(row.importance)||0,Number(candidate.importance)||3),userConfirmed:true,updatedAt:stamp,lastSeenAt:stamp});else{row={id:id('mem'),...candidate,type,key,value,source:candidate.source||'agent',confidence:Number(candidate.confidence)||.95,importance:Math.max(1,Math.min(5,Number(candidate.importance)||3)),evidenceCount:1,userConfirmed:true,createdAt:stamp,updatedAt:stamp,lastSeenAt:stamp,expiresAt:candidate.expiresAt||null};memory.entries.push(row);}return clone(row);}

function applyWrite(tool,args={}){
 const state=requireState(),stamp=now();
 switch(tool){
  case 'createPlan':{state.planner=Array.isArray(state.planner)?state.planner:[];const row={id:id('plan'),date:String(args.date||today()),time:String(args.time||''),type:String(args.type||'custom'),title:String(args.title||'').trim(),source:'ai',origin:'ai',status:'confirmed',completed:false,createdAt:stamp,updatedAt:stamp};if(!row.title)throw new Error('INVALID_TOOL_ARGS');state.planner.push(row);persist(tool,args);return clone(row);}
  case 'updatePlan':{const row=(Array.isArray(state.planner)?state.planner:[]).find(item=>String(item.id)===String(args.id));if(!row)throw new Error('PLAN_NOT_FOUND');for(const key of ['title','date','time','type'])if(args[key]!==undefined)row[key]=String(args[key]);if(args.completed!==undefined)row.completed=!!args.completed;if(args.done!==undefined)row.completed=!!args.done;row.updatedAt=stamp;row.source='ai';row.origin='ai';persist(tool,args);return clone(row);}
  case 'saveMemory':{const type=String(args.type||'note').trim()||'note',key=String(args.key||'').trim(),value=String(args.value||'').trim();if(!key||!value)throw new Error('INVALID_TOOL_ARGS');const row=intelligentUpsert(state,{id:args.id||id('mem'),memoryClass:args.memoryClass||null,type,key,value,source:'agent',confidence:.95,utility:Number.isFinite(Number(args.utility))?Number(args.utility):.8,importance:Math.max(1,Math.min(5,Number(args.importance)||3)),userConfirmed:true,expiresAt:args.expiresAt||null},stamp);persist(tool,args);return row;}
  case 'deleteRecord':{const domain=String(args.domain||''),target=String(args.id||'');let removed=false;if(domain==='memory'){const memory=ensureMemory(state);removed=removeById(memory.entries,target);if(removed&&!memory.deletedIds.includes(target))memory.deletedIds.push(target);if(memory.deletedIds.length>500)memory.deletedIds.splice(0,memory.deletedIds.length-500);}else if(['workouts','meals','runs','body','planner'].includes(domain)){state[domain]=Array.isArray(state[domain])?state[domain]:[];removed=removeById(state[domain],target);}else throw new Error('INVALID_TOOL_ARGS');if(!removed)throw new Error('RECORD_NOT_FOUND');persist(tool,args);return {domain,id:target,deleted:true};}
  case 'updateGoal':{const goal=String(args.goal||'').trim();if(!goal)throw new Error('INVALID_TOOL_ARGS');state.profile=isObject(state.profile)?state.profile:{};state.profile.goal=goal;state.onboarding=isObject(state.onboarding)?state.onboarding:{};state.onboarding.goal=goal;intelligentUpsert(state,{id:id('mem'),memoryClass:'semantic',type:'goal',key:'primary_goal',value:goal,source:'agent',confidence:.99,utility:1,importance:5,userConfirmed:true},stamp);persist(tool,args);return {goal};}
  default:throw new Error('TOOL_NOT_ALLOWED');
 }
}
function userState(){return StateIntelligence?.estimateState?StateIntelligence.estimateState(requireState()):null;}
window.GarangAgentStateBridge=Object.freeze({
 ready:()=>!!liveState,capture,getState:()=>clone(requireState()),getLiveState:()=>requireState(),getStorageKey:()=>resolveKey(),
 getMemoryContext:(query='',options={})=>Memory?.prepareMemoryContext?clone(Memory.prepareMemoryContext(requireState().memory,requireState(),{query,...options})):clone(ensureMemory(requireState())),
 getMemoryDiagnostics:()=>Memory?.diagnostics?clone(Memory.diagnostics(ensureMemory(requireState()).entries)):null,
 getUserState:()=>clone(userState()),
 getUserStateContext:()=>StateIntelligence?.compactForContext?clone(StateIntelligence.compactForContext(userState())):clone(userState()),
 getUserStateDiagnostics:()=>StateIntelligence?.diagnostics?clone(StateIntelligence.diagnostics(requireState())):null,
 applyWrite
});
})();
