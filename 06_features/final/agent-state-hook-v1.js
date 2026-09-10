/* GARANG Agent State Hook v1.6
   Captures the live application state without changing app.js internals.
   Account safety:
   - authenticated sessions are pinned to garang_user_<uid>_v3
   - stale demo/other-account JSON can never steal the Agent bridge
   - generic JSON.parse never changes the active Agent state
   - a live object is adopted only when its serialized value is written to the
     storage key belonging to the current Firebase identity
   - bridge reads rebind immediately when Firebase auth identity changes
   - Memory writes/reads inherit the verified account scope and frozen memory contract
*/
(() => {
'use strict';

const nativeParse=JSON.parse.bind(JSON);
const nativeStringify=JSON.stringify.bind(JSON);
const nativeSetItem=Storage.prototype.setItem;
const nativeGetItem=Storage.prototype.getItem;
const Memory=window.GarangMemoryIntelligence||null;
const StateIntelligence=window.GarangStateIntelligence||null;
const DecisionIntelligence=window.GarangDecisionIntelligence||null;
let liveState=null;
let activeKey=null;
let pendingStateWrite=null;
let syncTimer=null;
let lastStampMs=0;

const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const isState=value=>isObject(value)&&Array.isArray(value.planner)&&Array.isArray(value.workouts)&&Array.isArray(value.meals)&&isObject(value.memory)&&isObject(value.preferences);
const isStateKey=key=>/^garang_(?:demo_state_v3|user_.+_v3)$/.test(String(key||''));
const clone=value=>value===undefined?undefined:nativeParse(nativeStringify(value));
const id=prefix=>globalThis.crypto?.randomUUID?.()||`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const now=()=>{const wall=Date.now(),ms=Math.max(wall,lastStampMs+1);lastStampMs=ms;return new Date(ms).toISOString();};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

function currentAuthUid(){
 try{return String(window.firebase?.auth?.().currentUser?.uid||'').trim()||null;}catch{return null;}
}
function preferredKey(){const uid=currentAuthUid();return uid?`garang_user_${uid}_v3`:'garang_demo_state_v3';}
function readPreferred(){
 const key=preferredKey();
 try{const parsed=nativeParse(nativeGetItem.call(localStorage,key)||'null');return isState(parsed)?parsed:null;}catch{return null;}
}
function stateOwnedByCurrentAccount(value){
 if(!isState(value))return false;
 const uid=currentAuthUid();if(!uid)return true;
 const owner=String(value?.meta?.syncOwnerUid||'').trim();
 return owner===uid;
}
function refreshBinding(){
 const wanted=preferredKey();
 if(activeKey!==wanted){activeKey=wanted;liveState=readPreferred();pendingStateWrite=null;return;}
 if(!liveState){const stored=readPreferred();if(stored)liveState=stored;}
}
function captureForCurrentAccount(value){
 if(!isState(value))return value;
 const uid=currentAuthUid();
 if(!uid||stateOwnedByCurrentAccount(value)){activeKey=preferredKey();liveState=value;}
 return value;
}

/* Keep the exact object only until its matching localStorage write identifies which
   account it belongs to. This replaces the old global "last parsed JSON wins" rule. */
JSON.parse=function(...args){return nativeParse(...args);};
JSON.stringify=function(value,...args){
 const serialized=nativeStringify(value,...args);
 if(isState(value))pendingStateWrite={value,serialized,key:preferredKey()};
 return serialized;
};
Storage.prototype.setItem=function(key,value){
 if(this===localStorage&&isStateKey(key)){
  const wanted=preferredKey(),actual=String(key),serialized=String(value),pending=pendingStateWrite;
  if(actual===wanted){
   activeKey=actual;
   if(pending&&pending.key===wanted&&pending.serialized===serialized&&isState(pending.value))liveState=pending.value;
   else{try{const parsed=nativeParse(serialized);if(isState(parsed))liveState=parsed;}catch{}}
  }
  if(pending&&pending.serialized===serialized)pendingStateWrite=null;
 }
 return nativeSetItem.call(this,key,value);
};

function resolveKey(){refreshBinding();return preferredKey();}
function persist(tool,args){
 const state=requireState();state.meta=isObject(state.meta)?state.meta:{};const authUid=currentAuthUid();if(authUid)state.meta.syncOwnerUid=authUid;state.meta.updatedAt=now();state.actionLog=Array.isArray(state.actionLog)?state.actionLog:[];state.actionLog.push({id:id('action'),action:`agent_${tool}`,args:clone(args||{}),userConfirmed:true,at:now()});if(state.actionLog.length>300)state.actionLog.splice(0,state.actionLog.length-300);const key=resolveKey();if(!key)throw new Error('AGENT_STORAGE_KEY_NOT_READY');nativeSetItem.call(localStorage,key,nativeStringify(state));window.dispatchEvent(new CustomEvent('garang:agent-write',{detail:{tool,args:clone(args||{}),at:state.meta.updatedAt,storageKey:key}}));clearTimeout(syncTimer);syncTimer=setTimeout(()=>{try{if(window.firebase?.auth?.().currentUser)document.getElementById('syncBadge')?.click();}catch{}},120);
}
function requireState(){refreshBinding();if(!liveState)throw new Error('AGENT_STATE_NOT_READY');return liveState;}
function removeById(list,idValue){const index=list.findIndex(row=>String(row?.id)===String(idValue));if(index<0)return false;list.splice(index,1);return true;}
function ensureMemory(state){
 state.memory=isObject(state.memory)?state.memory:{};
 state.memory.entries=Array.isArray(state.memory.entries)?state.memory.entries:[];
 state.memory.deletedIds=Array.isArray(state.memory.deletedIds)?state.memory.deletedIds:[];
 if(Memory?.migrateMemory)state.memory=Memory.migrateMemory(state.memory,{ownerUid:currentAuthUid()});
 return state.memory;
}
function intelligentUpsert(state,candidate,stamp){
 const memory=ensureMemory(state),ownerUid=currentAuthUid();
 if(Memory?.upsertMemory){
  memory.entries=Memory.upsertMemory(memory.entries,{...candidate,ownerUid:candidate.ownerUid||ownerUid||null,updatedAt:stamp,observedAt:candidate.observedAt||stamp,lastSeenAt:stamp},{now:new Date(stamp),deletedIds:memory.deletedIds,ownerUid});
  const key=Memory.semanticKey(candidate);
  return clone(memory.entries.find(row=>row.status==='active'&&Memory.semanticKey(row)===key)||memory.entries.at(-1));
 }
 const type=String(candidate.type||'note'),key=String(candidate.key||''),value=String(candidate.value||'');let row=memory.entries.find(item=>String(item?.type||'note')===type&&String(item?.key||'')===key);
 if(row)Object.assign(row,{value,ownerUid:ownerUid||row.ownerUid||null,source:candidate.source||'agent',confidence:Math.max(Number(row.confidence)||0,Number(candidate.confidence)||.95),importance:Math.max(Number(row.importance)||0,Number(candidate.importance)||3),userConfirmed:true,updatedAt:stamp,lastSeenAt:stamp});
 else{row={id:id('mem'),...candidate,type,key,value,ownerUid:ownerUid||null,source:candidate.source||'agent',confidence:Number(candidate.confidence)||.95,importance:Math.max(1,Math.min(5,Number(candidate.importance)||3)),evidenceCount:1,revision:1,userConfirmed:true,createdAt:stamp,updatedAt:stamp,lastSeenAt:stamp,expiresAt:candidate.expiresAt||null};memory.entries.push(row);}
 return clone(row);
}

function applyWrite(tool,args={}){
 const state=requireState(),stamp=now();
 switch(tool){
  case 'createPlan':{
   state.planner=Array.isArray(state.planner)?state.planner:[];
   const row={id:id('plan'),date:String(args.date||today()),time:String(args.time||''),type:String(args.type||'custom'),title:String(args.title||'').trim(),source:'ai',origin:'ai',status:'confirmed',completed:false,createdAt:stamp,updatedAt:stamp};
   if(!row.title)throw new Error('INVALID_TOOL_ARGS');
   const goal=String(state.profile?.goal||state.onboarding?.goal||'').trim();if(goal)row.goalLabel=goal;
   if(Number.isFinite(Number(args.duration)))row.duration=Math.max(5,Math.min(240,Math.round(Number(args.duration))));
   if(Number.isFinite(Number(args.intensityScale)))row.intensityScale=Math.max(.3,Math.min(1.3,Number(args.intensityScale)));
   if(Number.isFinite(Number(args.volumeScale)))row.volumeScale=Math.max(.3,Math.min(1.3,Number(args.volumeScale)));
   if(args.decisionEngineVersion)row.decisionEngineVersion=String(args.decisionEngineVersion);
   if(args.decisionMode)row.decisionMode=String(args.decisionMode);
   if(Array.isArray(args.reasonCodes))row.decisionReasonCodes=args.reasonCodes.map(String).slice(0,8);
   state.planner.push(row);persist(tool,args);return clone(row);
  }
  case 'updatePlan':{const row=(Array.isArray(state.planner)?state.planner:[]).find(item=>String(item.id)===String(args.id));if(!row)throw new Error('PLAN_NOT_FOUND');for(const key of ['title','date','time','type'])if(args[key]!==undefined)row[key]=String(args[key]);if(args.completed!==undefined)row.completed=!!args.completed;if(args.done!==undefined)row.completed=!!args.done;row.updatedAt=stamp;row.source='ai';row.origin='ai';persist(tool,args);return clone(row);}
  case 'saveMemory':{const type=String(args.type||'note').trim()||'note',key=String(args.key||'').trim(),value=String(args.value||'').trim();if(!key||!value)throw new Error('INVALID_TOOL_ARGS');const row=intelligentUpsert(state,{id:args.id||id('mem'),memoryClass:args.memoryClass||null,type,key,value,source:'agent',confidence:.95,utility:Number.isFinite(Number(args.utility))?Number(args.utility):.8,importance:Math.max(1,Math.min(5,Number(args.importance)||3)),revision:Math.max(1,Number.parseInt(args.revision,10)||1),userConfirmed:true,expiresAt:args.expiresAt||null},stamp);persist(tool,args);return row;}
  case 'deleteRecord':{const domain=String(args.domain||''),target=String(args.id||'');let removed=false;if(domain==='memory'){const memory=ensureMemory(state);removed=removeById(memory.entries,target);if(removed&&!memory.deletedIds.includes(target))memory.deletedIds.push(target);if(memory.deletedIds.length>500)memory.deletedIds.splice(0,memory.deletedIds.length-500);}else if(['workouts','meals','runs','body','planner'].includes(domain)){state[domain]=Array.isArray(state[domain])?state[domain]:[];removed=removeById(state[domain],target);}else throw new Error('INVALID_TOOL_ARGS');if(!removed)throw new Error('RECORD_NOT_FOUND');persist(tool,args);return {domain,id:target,deleted:true};}
  case 'updateGoal':{const goal=String(args.goal||'').trim();if(!goal)throw new Error('INVALID_TOOL_ARGS');state.profile=isObject(state.profile)?state.profile:{};state.profile.goal=goal;state.onboarding=isObject(state.onboarding)?state.onboarding:{};state.onboarding.goal=goal;intelligentUpsert(state,{id:id('mem'),memoryClass:'semantic',type:'goal',key:'primary_goal',value:goal,source:'agent',confidence:.99,utility:1,importance:5,userConfirmed:true},stamp);persist(tool,args);return {goal};}
  default:throw new Error('TOOL_NOT_ALLOWED');
 }
}
function stateForIntelligence(){
 const state=clone(requireState());
 const canonical=Array.isArray(state.dailyCheckins)&&state.dailyCheckins.length?state.dailyCheckins:(Array.isArray(state.checkins)?state.checkins:[]);
 state.dailyCheckins=canonical.map(item=>{
  const row=isObject(item)?{...item}:{};
  const scalarSoreness=Number(row.soreness);
  const soreness=isObject(row.soreness)?clone(row.soreness):(Number.isFinite(scalarSoreness)?{general:scalarSoreness}:{});
  return {...row,sleepHours:row.sleepHours??row.sleep??null,soreness,painCaution:row.painCaution===true};
 });
 return state;
}
function userState(){return StateIntelligence?.estimateState?StateIntelligence.estimateState(stateForIntelligence()):null;}
function memoryContext(query='',options={}){return Memory?.prepareMemoryContext?Memory.prepareMemoryContext(requireState().memory,requireState(),{query,...options,ownerUid:currentAuthUid()}):ensureMemory(requireState());}
function decision(){const stateResult=userState();return DecisionIntelligence?.decide?DecisionIntelligence.decide(stateResult,{memoryContext:memoryContext('',{limit:24,budgetChars:6000})}):null;}
window.GarangAgentStateBridge=Object.freeze({
 ready:()=>{refreshBinding();return !!liveState;},capture:captureForCurrentAccount,getState:()=>clone(requireState()),getLiveState:()=>requireState(),getStorageKey:()=>resolveKey(),
 getMemoryContext:(query='',options={})=>clone(memoryContext(query,options)),
 getMemoryDiagnostics:()=>{const memory=ensureMemory(requireState());return Memory?.diagnostics?clone(Memory.diagnostics(memory.entries,{deletedIds:memory.deletedIds,ownerUid:currentAuthUid()})):null;},
 getUserState:()=>clone(userState()),
 getUserStateContext:()=>StateIntelligence?.compactForContext?clone(StateIntelligence.compactForContext(userState())):clone(userState()),
 getUserStateDiagnostics:()=>StateIntelligence?.diagnostics?clone(StateIntelligence.diagnostics(stateForIntelligence())):null,
 getDecision:()=>clone(decision()),
 getDecisionContext:()=>DecisionIntelligence?.compactForContext?clone(DecisionIntelligence.compactForContext(decision())):clone(decision()),
 getDecisionDiagnostics:()=>DecisionIntelligence?.diagnostics?clone(DecisionIntelligence.diagnostics(userState(),{memoryContext:memoryContext('',{limit:24,budgetChars:6000})})):null,
 applyWrite
});
})();
