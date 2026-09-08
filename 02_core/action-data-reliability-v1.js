(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GarangActionDataReliability=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';

const VERSION='garang-action-data-reliability-v1';
const ACTION_CONTRACT_VERSION='garang-data-action-v1';
const DOMAINS=Object.freeze(['workouts','meals','runs','body','planner','memory']);
const OPERATIONS=Object.freeze(['create','update','delete']);
const RECEIPT_LIMIT=160,ACTION_LOG_LIMIT=300,TOMBSTONE_LIMIT=600;
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const clean=value=>String(value??'').trim();
const rows=value=>Array.isArray(value)?value:[];
const numeric=value=>value==null||(typeof value==='string'&&!value.trim())?null:(Number.isFinite(Number(value))?Number(value):null);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const defaultId=prefix=>root.crypto?.randomUUID?.()||`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

class ActionDataError extends Error{
  constructor(code,message=code){super(message);this.name='ActionDataError';this.code=code;}
}
function fail(condition,code,message){if(!condition)throw new ActionDataError(code,message||code);}
function instant(clock){
  const raw=typeof clock==='function'?clock():(clock??Date.now());
  const date=raw instanceof Date?raw:new Date(raw);
  fail(Number.isFinite(date.getTime()),'INVALID_CLOCK');
  return date;
}
function stableStringify(value){
  const seen=new WeakSet();
  const walk=v=>{
    if(Array.isArray(v))return v.map(walk);
    if(object(v)){
      if(seen.has(v))return null;
      seen.add(v);
      return Object.fromEntries(Object.keys(v).sort().map(key=>[key,walk(v[key])]));
    }
    return v;
  };
  return JSON.stringify(walk(value));
}
function fnv1a(value){let hash=0x811c9dc5;for(const ch of String(value??'')){hash^=ch.charCodeAt(0);hash=Math.imul(hash,0x01000193)>>>0;}return hash.toString(16).padStart(8,'0');}
function fingerprint(value){return fnv1a(stableStringify(value));}
function ownerOf(state){return clean(state?.meta?.syncOwnerUid)||null;}
function enforceOwner(state,ownerUid){const current=ownerOf(state);if(ownerUid&&current&&current!==String(ownerUid))throw new ActionDataError('ACTION_OWNER_MISMATCH');}
function ensureState(input){
  fail(object(input),'INVALID_STATE');
  const state=clone(input);
  state.meta=object(state.meta)?state.meta:{};
  state.actionLog=rows(state.actionLog);
  for(const domain of DOMAINS.filter(x=>x!=='memory'))state[domain]=rows(state[domain]);
  state.memory=object(state.memory)?state.memory:{};
  state.memory.entries=rows(state.memory.entries);
  state.memory.deletedIds=rows(state.memory.deletedIds).map(String);
  state.meta.actionReceipts=rows(state.meta.actionReceipts);
  state.meta.syncTombstones=rows(state.meta.syncTombstones);
  return state;
}
function list(state,domain){return domain==='memory'?state.memory.entries:state[domain];}
function setList(state,domain,value){if(domain==='memory')state.memory.entries=value;else state[domain]=value;}
function validateDomain(domain){const value=clean(domain);fail(DOMAINS.includes(value),'INVALID_ACTION_DOMAIN',`Unsupported action domain: ${value||'(empty)'}`);return value;}
function validateOperation(operation){const value=clean(operation);fail(OPERATIONS.includes(value),'INVALID_ACTION_OPERATION');return value;}
function positiveOrZero(value,key,code='INVALID_RECORD'){const n=numeric(value);fail(n!==null&&n>=0,code,`${key} must be non-negative.`);return n;}
function normalizeNonnegative(target,keys,code='INVALID_RECORD'){for(const key of keys)if(target[key]!==undefined&&target[key]!==null)target[key]=positiveOrZero(target[key],key,code);return target;}
function normalizeRecord(domain,input,{ownerUid=null,clock=Date.now(),idFactory=defaultId}={}){
  fail(object(input),'INVALID_RECORD');
  const at=instant(clock).toISOString(),row=clone(input);
  row.id=clean(row.id)||idFactory(domain==='memory'?'mem':domain.slice(0,3));
  row.createdAt=clean(row.createdAt)||at;
  row.updatedAt=at;
  row.revision=Math.max(1,Math.floor(numeric(row.revision)||1));
  if(ownerUid)row.ownerUid=String(ownerUid);
  if(domain==='workouts'){
    row.name=clean(row.name);fail(row.name,'INVALID_RECORD','Workout name is required.');
    normalizeNonnegative(row,['sets','reps','weight','rpe','duration','body','met','kcal','volume']);
    if(row.rpe!==undefined)fail(row.rpe<=10,'INVALID_RECORD','rpe must be at most 10.');
  }else if(domain==='meals'){
    row.items=rows(row.items).map(item=>clone(item));row.name=clean(row.name);
    fail(row.name||row.items.length>0,'INVALID_RECORD','Meal name or items are required.');
    normalizeNonnegative(row,['grams','kcal','protein','carbs','fat']);
  }else if(domain==='runs'){
    normalizeNonnegative(row,['distance','duration','kcal']);
    row.coords=Array.isArray(row.coords)?clone(row.coords):[];
  }else if(domain==='body'){
    const weight=numeric(row.weight??row.bodyWeight);
    fail(weight!==null&&weight>0,'INVALID_RECORD','Body weight must be positive.');
    row.weight=weight;
    normalizeNonnegative(row,['muscle','fatPercent','bodyFat','fatMass','leanMass','bmi','bmr']);
  }else if(domain==='planner'){
    row.title=clean(row.title);fail(row.title,'INVALID_RECORD','Plan title is required.');
    if(row.duration!==undefined){const duration=numeric(row.duration);fail(duration!==null&&duration>=5&&duration<=240,'INVALID_RECORD','Plan duration is invalid.');row.duration=Math.round(duration);}
    for(const key of ['intensityScale','volumeScale'])if(row[key]!==undefined){const n=numeric(row[key]);fail(n!==null&&n>=.3&&n<=1.3,'INVALID_RECORD',`${key} is invalid.`);row[key]=n;}
    row.completed=row.completed===true||row.done===true;
  }else if(domain==='memory'){
    row.type=clean(row.type)||'note';
    row.key=clean(row.key);
    row.value=clean(row.value??row.text);
    fail(row.key&&row.value,'INVALID_RECORD','Memory key and value are required.');
    row.userConfirmed=row.userConfirmed!==false;
    row.importance=clamp(Math.round(numeric(row.importance)||3),1,5);
    row.confidence=clamp(numeric(row.confidence)??1,0,1);
  }
  return row;
}
function sanitizePatch(domain,input){
  fail(object(input)&&Object.keys(input).length>0,'INVALID_PATCH');
  const patch=clone(input);
  for(const key of ['id','ownerUid','createdAt'])delete patch[key];
  if(domain==='workouts'){
    if(patch.name!==undefined){patch.name=clean(patch.name);fail(patch.name,'INVALID_PATCH','Workout name is required.');}
    normalizeNonnegative(patch,['sets','reps','weight','rpe','duration','body','met','kcal','volume'],'INVALID_PATCH');
    if(patch.rpe!==undefined)fail(patch.rpe<=10,'INVALID_PATCH','rpe must be at most 10.');
  }else if(domain==='meals'){
    if(patch.name!==undefined)patch.name=clean(patch.name);
    if(patch.items!==undefined){fail(Array.isArray(patch.items),'INVALID_PATCH','Meal items must be an array.');patch.items=patch.items.filter(object).map(clone);}
    normalizeNonnegative(patch,['grams','kcal','protein','carbs','fat'],'INVALID_PATCH');
  }else if(domain==='runs'){
    normalizeNonnegative(patch,['distance','duration','kcal'],'INVALID_PATCH');
    if(patch.coords!==undefined){fail(Array.isArray(patch.coords),'INVALID_PATCH','Run coords must be an array.');patch.coords=clone(patch.coords);}
  }else if(domain==='body'){
    if(patch.weight!==undefined){const n=numeric(patch.weight);fail(n!==null&&n>0,'INVALID_PATCH','Body weight must be positive.');patch.weight=n;}
    normalizeNonnegative(patch,['muscle','fatPercent','bodyFat','fatMass','leanMass','bmi','bmr'],'INVALID_PATCH');
  }else if(domain==='planner'){
    if(patch.title!==undefined){patch.title=clean(patch.title);fail(patch.title,'INVALID_PATCH','Plan title is required.');}
    if(patch.duration!==undefined){const n=numeric(patch.duration);fail(n!==null&&n>=5&&n<=240,'INVALID_PATCH');patch.duration=Math.round(n);}
    for(const key of ['intensityScale','volumeScale'])if(patch[key]!==undefined){const n=numeric(patch[key]);fail(n!==null&&n>=.3&&n<=1.3,'INVALID_PATCH');patch[key]=n;}
    if(patch.done!==undefined&&patch.completed===undefined)patch.completed=!!patch.done;
    delete patch.done;
  }else if(domain==='memory'){
    if(patch.key!==undefined){patch.key=clean(patch.key);fail(patch.key,'INVALID_PATCH','Memory key is required.');}
    if(patch.value!==undefined||patch.text!==undefined){patch.value=clean(patch.value??patch.text);fail(patch.value,'INVALID_PATCH','Memory value is required.');}
    delete patch.text;
    if(patch.importance!==undefined)patch.importance=clamp(Math.round(numeric(patch.importance)||3),1,5);
    if(patch.confidence!==undefined){const n=numeric(patch.confidence);fail(n!==null&&n>=0&&n<=1,'INVALID_PATCH','Memory confidence is invalid.');patch.confidence=n;}
  }
  fail(Object.keys(patch).length>0,'INVALID_PATCH','Patch contains no mutable fields.');
  return patch;
}
function makeTombstone(domain,id,{ownerUid=null,clock=Date.now(),sync=null}={}){
  if(sync?.createExplicitTombstone)return sync.createExplicitTombstone(domain,id,{ownerUid,clock:instant(clock).getTime()});
  return {domain:String(domain),id:String(id),deletedAt:instant(clock).toISOString(),ownerUid:ownerUid?String(ownerUid):null,explicit:true};
}
function mergeTombstone(state,tombstone){
  const key=`${tombstone.domain}::${tombstone.id}`,map=new Map(state.meta.syncTombstones.map(item=>[`${item.domain}::${item.id}`,item]));
  map.set(key,tombstone);state.meta.syncTombstones=[...map.values()].slice(-TOMBSTONE_LIMIT);
}
function clearDeleteMarkers(state,domain,id){
  state.meta.syncTombstones=state.meta.syncTombstones.filter(item=>!(String(item?.domain)===domain&&String(item?.id)===String(id)));
  if(domain==='memory')state.memory.deletedIds=state.memory.deletedIds.filter(value=>String(value)!==String(id));
}
function receiptKey(action){return clean(action.idempotencyKey)||null;}
function actionFingerprint(action){return fingerprint({operation:action.operation,domain:action.domain,id:action.id||null,record:action.record||null,patch:action.patch||null,expectedRevision:action.expectedRevision??null,semanticUpsert:action.semanticUpsert===true,restore:action.restore===true});}
function existingReceipt(state,key){return key?state.meta.actionReceipts.find(item=>String(item?.key)===key)||null:null;}
function compactResult(result){
  if(!object(result))return clone(result);
  const out={};for(const key of ['id','domain','date','name','title','type','key','value','goal','revision','deleted'])if(result[key]!==undefined)out[key]=clone(result[key]);return out;
}
function appendReceipt(state,{key,fingerprint:fp,operation,domain,targetId,result,at}){
  if(!key)return null;
  const receipt={key,fingerprint:fp,operation,domain,targetId:String(targetId||''),result:compactResult(result),at};
  state.meta.actionReceipts.push(receipt);if(state.meta.actionReceipts.length>RECEIPT_LIMIT)state.meta.actionReceipts.splice(0,state.meta.actionReceipts.length-RECEIPT_LIMIT);return receipt;
}
function appendLog(state,{operation,domain,targetId,source,idempotencyKey,at,idFactory=defaultId}){
  state.actionLog.push({id:idFactory('action'),action:`${source||'action'}_${operation}_${domain}`,targetId:String(targetId||''),userConfirmed:true,idempotencyKey:idempotencyKey||null,at});
  if(state.actionLog.length>ACTION_LOG_LIMIT)state.actionLog.splice(0,state.actionLog.length-ACTION_LOG_LIMIT);
}
function semanticMemoryCreate(state,record,{ownerUid,clock,memory,idFactory}){
  const at=instant(clock).toISOString(),candidate=normalizeRecord('memory',record,{ownerUid,clock:()=>new Date(at),idFactory});
  if(memory?.upsertMemory){
    state.memory.entries=memory.upsertMemory(state.memory.entries,candidate,{now:new Date(at),deletedIds:state.memory.deletedIds,ownerUid});
    const semantic=memory.semanticKey?.(candidate);let active=null;
    if(semantic)active=state.memory.entries.find(row=>row?.status==='active'&&memory.semanticKey(row)===semantic)||null;
    return clone(active||state.memory.entries.at(-1)||candidate);
  }
  state.memory.entries.push(candidate);return clone(candidate);
}
function applyMutation(stateInput,actionInput,options={}){
  const action=object(actionInput)?clone(actionInput):{};
  const operation=validateOperation(action.operation),domain=validateDomain(action.domain),confirmed=action.userConfirmed===true||options.userConfirmed===true;
  fail(confirmed,'CONFIRMATION_REQUIRED','Write actions require explicit user confirmation.');
  const ownerUid=options.ownerUid?String(options.ownerUid):null,state=ensureState(stateInput);enforceOwner(state,ownerUid);
  const at=instant(options.clock).toISOString(),key=receiptKey(action),fp=actionFingerprint({...action,operation,domain}),oldReceipt=existingReceipt(state,key);
  if(oldReceipt){fail(oldReceipt.fingerprint===fp,'IDEMPOTENCY_KEY_REUSE','An idempotency key cannot be reused for a different action.');return {state,result:clone(oldReceipt.result),receipt:clone(oldReceipt),duplicate:true,inverse:null};}
  const current=list(state,domain),source=clean(action.source)||'agent';let result=null,inverse=null,targetId='';
  if(operation==='create'){
    let created;
    if(domain==='memory'&&action.semanticUpsert===true)created=semanticMemoryCreate(state,action.record||{}, {ownerUid,clock:()=>new Date(at),memory:options.memory,idFactory:options.idFactory||defaultId});
    else{
      created=normalizeRecord(domain,action.record||{}, {ownerUid,clock:()=>new Date(at),idFactory:options.idFactory||defaultId});
      fail(!current.some(row=>String(row?.id)===created.id),'RECORD_ALREADY_EXISTS');if(action.restore===true)clearDeleteMarkers(state,domain,created.id);current.push(created);setList(state,domain,current);
    }
    targetId=created.id;result=clone(created);inverse={operation:'delete',domain,id:targetId};
  }else if(operation==='update'){
    targetId=clean(action.id);fail(targetId,'INVALID_RECORD_ID');const index=current.findIndex(row=>String(row?.id)===targetId);fail(index>=0,'RECORD_NOT_FOUND');
    const before=clone(current[index]),expected=numeric(action.expectedRevision);if(expected!==null)fail(Math.max(1,Number(before.revision)||1)===expected,'REVISION_CONFLICT');
    const patch=sanitizePatch(domain,action.patch||{}),updated={...before,...patch,id:before.id,ownerUid:before.ownerUid||ownerUid||null,createdAt:before.createdAt,updatedAt:at,revision:Math.max(1,Number(before.revision)||1)+1};
    if(domain==='workouts')fail(clean(updated.name),'INVALID_RECORD');if(domain==='planner')fail(clean(updated.title),'INVALID_RECORD');if(domain==='memory')fail(clean(updated.key)&&clean(updated.value),'INVALID_RECORD');
    current[index]=updated;setList(state,domain,current);result=clone(updated);inverse={operation:'update',domain,id:targetId,patch:before};
  }else{
    targetId=clean(action.id);fail(targetId,'INVALID_RECORD_ID');const index=current.findIndex(row=>String(row?.id)===targetId);fail(index>=0,'RECORD_NOT_FOUND');const before=clone(current[index]);current.splice(index,1);setList(state,domain,current);
    if(domain==='memory'&&!state.memory.deletedIds.includes(targetId))state.memory.deletedIds.push(targetId);
    mergeTombstone(state,makeTombstone(domain,targetId,{ownerUid,clock:()=>new Date(at),sync:options.sync}));result={domain,id:targetId,deleted:true};inverse={operation:'create',domain,record:before,restore:true};
  }
  state.meta.updatedAt=at;if(ownerUid&&!state.meta.syncOwnerUid)state.meta.syncOwnerUid=ownerUid;
  appendLog(state,{operation,domain,targetId,source,idempotencyKey:key,at,idFactory:options.idFactory||defaultId});
  const receipt=appendReceipt(state,{key,fingerprint:fp,operation,domain,targetId,result,at});
  return {state,result,receipt:clone(receipt),duplicate:false,inverse};
}
function updateGoal(stateInput,args={},options={}){
  const confirmed=options.userConfirmed===true;fail(confirmed,'CONFIRMATION_REQUIRED');const goal=clean(args.goal);fail(goal,'INVALID_TOOL_ARGS','Goal is required.');
  const ownerUid=options.ownerUid?String(options.ownerUid):null,state=ensureState(stateInput);enforceOwner(state,ownerUid);const at=instant(options.clock).toISOString(),key=clean(options.idempotencyKey)||null,fp=fingerprint({tool:'updateGoal',goal}),oldReceipt=existingReceipt(state,key);
  if(oldReceipt){fail(oldReceipt.fingerprint===fp,'IDEMPOTENCY_KEY_REUSE');return {state,result:clone(oldReceipt.result),receipt:clone(oldReceipt),duplicate:true,inverse:null};}
  const previous=clean(state.profile?.goal||state.onboarding?.goal)||null;state.profile=object(state.profile)?state.profile:{};state.onboarding=object(state.onboarding)?state.onboarding:{};state.profile.goal=goal;state.onboarding.goal=goal;
  semanticMemoryCreate(state,{type:'goal',key:'primary_goal',value:goal,source:'agent',confidence:.99,importance:5,userConfirmed:true},{ownerUid,clock:()=>new Date(at),memory:options.memory,idFactory:options.idFactory||defaultId});
  state.meta.updatedAt=at;if(ownerUid&&!state.meta.syncOwnerUid)state.meta.syncOwnerUid=ownerUid;appendLog(state,{operation:'update',domain:'goal',targetId:'primary_goal',source:'agent',idempotencyKey:key,at,idFactory:options.idFactory||defaultId});
  const result={goal},receipt=appendReceipt(state,{key,fingerprint:fp,operation:'update',domain:'goal',targetId:'primary_goal',result,at});return {state,result,receipt:clone(receipt),duplicate:false,inverse:previous?{tool:'updateGoal',args:{goal:previous}}:null};
}
function executeTool(state,tool,args={},options={}){
  fail(options.userConfirmed===true,'CONFIRMATION_REQUIRED','Tool writes can execute only after explicit confirmation.');
  const name=clean(tool),base={ownerUid:options.ownerUid||null,clock:options.clock,idFactory:options.idFactory,memory:options.memory,sync:options.sync,userConfirmed:true};
  const idempotencyKey=clean(options.idempotencyKey||options.callId||args.idempotencyKey)||null;
  if(name==='createRecord')return applyMutation(state,{operation:'create',domain:args.domain,record:args.record,idempotencyKey,source:'agent',semanticUpsert:args.domain==='memory',userConfirmed:true},base);
  if(name==='updateRecord')return applyMutation(state,{operation:'update',domain:args.domain,id:args.id,patch:args.patch,expectedRevision:args.expectedRevision,idempotencyKey,source:'agent',userConfirmed:true},base);
  if(name==='deleteRecord')return applyMutation(state,{operation:'delete',domain:args.domain,id:args.id,idempotencyKey,source:'agent',userConfirmed:true},base);
  if(name==='createPlan')return applyMutation(state,{operation:'create',domain:'planner',record:{...clone(args),source:'ai',origin:'ai',status:'confirmed',completed:false},idempotencyKey,source:'agent',userConfirmed:true},base);
  if(name==='updatePlan'){const patch=clone(args);delete patch.id;delete patch.idempotencyKey;patch.source='ai';patch.origin='ai';return applyMutation(state,{operation:'update',domain:'planner',id:args.id,patch,expectedRevision:args.expectedRevision,idempotencyKey,source:'agent',userConfirmed:true},base);}
  if(name==='saveMemory')return applyMutation(state,{operation:'create',domain:'memory',record:{...clone(args),source:'agent',confidence:args.confidence??.95,userConfirmed:true},semanticUpsert:true,idempotencyKey,source:'agent',userConfirmed:true},base);
  if(name==='updateGoal')return updateGoal(state,args,{...base,idempotencyKey});
  throw new ActionDataError('TOOL_NOT_ALLOWED',`Tool ${name||'(empty)'} is not supported by Action Data Reliability.`);
}
function rollback(state,inverse,options={}){fail(object(inverse),'INVALID_INVERSE');if(inverse.tool==='updateGoal')return updateGoal(state,inverse.args,{...options,userConfirmed:true,idempotencyKey:options.idempotencyKey||`rollback:${fingerprint(inverse)}`});return applyMutation(state,{...clone(inverse),userConfirmed:true,idempotencyKey:options.idempotencyKey||`rollback:${fingerprint(inverse)}`,source:'rollback'},{...options,userConfirmed:true});}
function diagnostics(stateInput){const state=ensureState(stateInput);return {version:VERSION,contractVersion:ACTION_CONTRACT_VERSION,counts:Object.fromEntries(DOMAINS.map(domain=>[domain,list(state,domain).length])),receipts:state.meta.actionReceipts.length,tombstones:state.meta.syncTombstones.length,actions:state.actionLog.length,ownerUid:ownerOf(state)};}

return Object.freeze({VERSION,ACTION_CONTRACT_VERSION,DOMAINS,OPERATIONS,ActionDataError,normalizeRecord,applyMutation,executeTool,rollback,diagnostics,fingerprint,stableStringify});
});
