'use strict';

const crypto=require('node:crypto');

const VERSION='autonomous-data-tools-v1.0.0';
const RECEIPT_LIMIT=80;
const ACTION_LOG_LIMIT=300;
const TOOL_NAMES=Object.freeze(['createPlan','updatePlan','saveMemory','updateGoal','recordWorkout','recordMeal','recordBody','recordCheckin']);
const FACTUAL_TOOLS=new Set(['recordWorkout','recordMeal','recordBody','recordCheckin']);
const DIRECT_IDENTIFIER=/email|phone|mobile|address|token|password|secret|credential|location|latitude|longitude|display_name|full_name/i;
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const list=value=>Array.isArray(value)?value:[];
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const clean=(value,limit=1000)=>String(value??'').trim().slice(0,limit);
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const hash=value=>crypto.createHash('sha256').update(String(value??'')).digest('hex').slice(0,20);
function fail(code,message=code,status=400){const error=new Error(message);error.code=code;error.status=status;throw error;}
function stableStringify(value){
 if(Array.isArray(value))return '['+value.map(stableStringify).join(',')+']';
 if(object(value))return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stableStringify(value[key])).join(',')+'}';
 return JSON.stringify(value);
}
function normalizeMessage(value){return clean(value,2400).replace(/\s+/g,' ').toLowerCase();}
function writeIntent(message){
 const text=normalizeMessage(message);
 return /(?:저장|기록|추가|넣어|만들어|생성|바꿔|변경|수정|설정|기억해|반영|등록|save|record|log|add|create|make|set|update|change|remember|put|schedule)/i.test(text);
}
function quoteGrounded(message,quote){
 const source=normalizeMessage(message),needle=normalizeMessage(quote);
 return needle.length>=2&&source.includes(needle);
}
function primitiveNumbers(value,out=[]){
 if(Array.isArray(value)){for(const item of value)primitiveNumbers(item,out);return out;}
 if(object(value)){for(const [key,item] of Object.entries(value)){if(/(?:id|revision|year|month|day)$/i.test(key))continue;primitiveNumbers(item,out);}return out;}
 const n=finite(value);if(n!==null)out.push(n);return out;
}
function numbersGrounded(message,args){
 const text=normalizeMessage(message),numbers=[...new Set(primitiveNumbers(args).map(n=>String(n)))];
 return numbers.every(raw=>{
  const escaped=raw.replace(/[.*+?^$()|[\]\\]/g,'\\$&');
  return new RegExp('(?:^|[^0-9.])'+escaped+'(?:$|[^0-9.])').test(text);
 });
}
function normalizeCall(input={}){
 if(!object(input))fail('TOOL_CALL_INVALID');
 const name=clean(input.name,80),callId=clean(input.callId||input.id,180),args=object(input.args)?clone(input.args):{},evidenceQuote=clean(input.evidenceQuote,500),evidenceSource=clean(input.evidenceSource,40).toLowerCase()||'inferred';
 if(!TOOL_NAMES.includes(name))fail('TOOL_NOT_ALLOWED','Tool '+(name||'(empty)')+' is not in the bounded GARANG registry.');
 if(!callId)fail('TOOL_CALL_ID_REQUIRED');
 if(!['explicit_user','verified_source','inferred'].includes(evidenceSource))fail('TOOL_EVIDENCE_SOURCE_INVALID');
 return {name,callId,args,evidenceQuote,evidenceSource,reason:clean(input.reason,500)||null};
}
function policyFor(callInput,{message='',verifiedSource=false}={}){
 let call;
 try{call=normalizeCall(callInput);}catch(error){return {status:'denied',code:error.code||'TOOL_CALL_INVALID',call:null};}
 if(!writeIntent(message))return {status:'confirmation_required',code:'EXPLICIT_WRITE_INTENT_REQUIRED',call};
 if(call.evidenceSource==='verified_source'&&verifiedSource!==true)return {status:'confirmation_required',code:'VERIFIED_SOURCE_REQUIRED',call};
 if(call.evidenceSource==='explicit_user'&&!quoteGrounded(message,call.evidenceQuote))return {status:'confirmation_required',code:'EVIDENCE_QUOTE_NOT_GROUNDED',call};
 if(call.evidenceSource==='inferred')return {status:'confirmation_required',code:'INFERRED_WRITE_REQUIRES_CONFIRMATION',call};
 if(FACTUAL_TOOLS.has(call.name)&&call.evidenceSource==='explicit_user'&&!numbersGrounded(message,call.args))return {status:'confirmation_required',code:'FACTUAL_VALUES_NOT_GROUNDED',call};
 if(call.name==='saveMemory'&&DIRECT_IDENTIFIER.test(clean(call.args.key,120)))return {status:'denied',code:'SENSITIVE_MEMORY_KEY_BLOCKED',call};
 return {status:'autonomous',code:'AUTONOMOUS_WRITE_ALLOWED',call};
}
function ensureState(stateInput,uid){
 if(!object(stateInput))fail('STATE_INVALID');
 const state=clone(stateInput),safeUid=clean(uid,180);
 state.meta=object(state.meta)?state.meta:{};
 const owner=clean(state.meta.syncOwnerUid,180);
 if(owner&&safeUid&&owner!==safeUid)fail('ACTION_OWNER_MISMATCH','State owner mismatch.',403);
 if(safeUid&&!owner)state.meta.syncOwnerUid=safeUid;
 state.meta.autonomousToolReceipts=list(state.meta.autonomousToolReceipts);
 state.actionLog=list(state.actionLog);
 for(const key of ['planner','workouts','meals','body','dailyCheckins'])state[key]=list(state[key]);
 state.memory=object(state.memory)?state.memory:{};
 state.memory.entries=list(state.memory.entries);
 state.profile=object(state.profile)?state.profile:{};
 state.onboarding=object(state.onboarding)?state.onboarding:{};
 return state;
}
function receiptFingerprint(call){return hash(stableStringify({name:call.name,args:call.args,evidenceQuote:call.evidenceQuote,evidenceSource:call.evidenceSource}));}
function existingReceipt(state,call){return state.meta.autonomousToolReceipts.find(row=>clean(row?.callId)===call.callId)||null;}
function stableId(call,prefix){return prefix+'_'+hash(call.callId);}
function nowIso(now){const date=now instanceof Date?now:new Date(now||Date.now());if(!Number.isFinite(date.getTime()))fail('INVALID_CLOCK');return date.toISOString();}
function normalizePlan(call,now,existing=null){
 const args=call.args,title=clean(args.title,160);if(!title)fail('PLAN_TITLE_REQUIRED');
 const duration=finite(args.duration),intensity=finite(args.intensityScale),volume=finite(args.volumeScale);
 if(duration!==null&&(duration<5||duration>240))fail('PLAN_DURATION_INVALID');
 if(intensity!==null&&(intensity<.3||intensity>1.3))fail('PLAN_INTENSITY_INVALID');
 if(volume!==null&&(volume<.3||volume>1.3))fail('PLAN_VOLUME_INVALID');
 return {
  ...(existing||{}),
  ...(clone(args)||{}),
  id:existing?.id||clean(args.id,180)||stableId(call,'plan'),
  title,
  duration:duration===null?(existing?.duration??null):Math.round(duration),
  intensityScale:intensity===null?(existing?.intensityScale??null):intensity,
  volumeScale:volume===null?(existing?.volumeScale??null):volume,
  type:clean(args.type,80)||existing?.type||'workout',
  origin:'ai',
  source:'ai',
  confirmed:true,
  status:clean(args.status,40)||existing?.status||'confirmed',
  completed:existing?.completed===true,
  createdAt:existing?.createdAt||now,
  updatedAt:now,
  revision:Math.max(1,Number(existing?.revision)||0)+1
 };
}
function normalizeFactualRecord(call,now){
 const args=clone(call.args||{}),record=object(args.record)?args.record:args;
 if(call.name==='recordWorkout'){
  const name=clean(record.name,160);if(!name)fail('WORKOUT_NAME_REQUIRED');
  for(const key of ['sets','reps','weight','rpe','duration','kcal','volume'])if(record[key]!==undefined&&finite(record[key])===null)fail('WORKOUT_VALUE_INVALID');
  if(finite(record.rpe)!==null&&(finite(record.rpe)<0||finite(record.rpe)>10))fail('WORKOUT_RPE_INVALID');
  return {domain:'workouts',row:{...record,id:clean(record.id,180)||stableId(call,'workout'),name,createdAt:clean(record.createdAt)||now,updatedAt:now,revision:Math.max(1,Number(record.revision)||1),source:'coach_agent'}};
 }
 if(call.name==='recordMeal'){
  const name=clean(record.name,160);if(!name&&!list(record.items).length)fail('MEAL_NAME_REQUIRED');
  for(const key of ['grams','kcal','protein','carbs','fat'])if(record[key]!==undefined&&finite(record[key])===null)fail('MEAL_VALUE_INVALID');
  return {domain:'meals',row:{...record,id:clean(record.id,180)||stableId(call,'meal'),name,items:list(record.items),createdAt:clean(record.createdAt)||now,updatedAt:now,revision:Math.max(1,Number(record.revision)||1),source:'coach_agent'}};
 }
 if(call.name==='recordBody'){
  const weight=finite(record.weight??record.bodyWeight);if(weight===null||weight<=0)fail('BODY_WEIGHT_REQUIRED');
  return {domain:'body',row:{...record,id:clean(record.id,180)||stableId(call,'body'),weight,createdAt:clean(record.createdAt)||now,updatedAt:now,revision:Math.max(1,Number(record.revision)||1),source:'coach_agent'}};
 }
 const sleepHours=finite(record.sleepHours??record.sleep),energy=finite(record.energy??record.energyLevel),stress=finite(record.stress??record.stressLevel);
 return {domain:'dailyCheckins',row:{...record,id:clean(record.id,180)||stableId(call,'checkin'),sleepHours,energy,stress,createdAt:clean(record.createdAt)||now,updatedAt:now,revision:Math.max(1,Number(record.revision)||1),source:'coach_agent'}};
}
function executeOnState(stateInput,callInput,{uid=null,message='',verifiedSource=false,now=new Date()}={}){
 const policy=policyFor(callInput,{message,verifiedSource});if(policy.status!=='autonomous')return {executed:false,policy,state:clone(stateInput),result:null,inverse:null,duplicate:false};
 const call=policy.call,state=ensureState(stateInput,uid),fp=receiptFingerprint(call),prior=existingReceipt(state,call);
 if(prior){if(prior.fingerprint!==fp)fail('IDEMPOTENCY_KEY_REUSE');return {executed:true,policy,state,result:clone(prior.result),inverse:clone(prior.inverse),duplicate:true};}
 const at=nowIso(now);let result=null,inverse=null;
 if(call.name==='createPlan'){
  const row=normalizePlan(call,at);if(state.planner.some(item=>clean(item?.id)===row.id))fail('RECORD_ALREADY_EXISTS');
  state.planner.push(row);result=clone(row);inverse={operation:'delete',domain:'planner',id:row.id};
 }else if(call.name==='updatePlan'){
  const id=clean(call.args.id,180);if(!id)fail('PLAN_ID_REQUIRED');const index=state.planner.findIndex(item=>clean(item?.id)===id);if(index<0)fail('PLAN_NOT_FOUND');
  const before=clone(state.planner[index]),expected=finite(call.args.expectedRevision);if(expected!==null&&Math.max(1,Number(before.revision)||1)!==expected)fail('REVISION_CONFLICT');
  state.planner[index]=normalizePlan({...call,args:{...call.args,id}},at,before);result=clone(state.planner[index]);inverse={operation:'replace',domain:'planner',id,before};
 }else if(call.name==='saveMemory'){
  const key=clean(call.args.key,160),value=clean(call.args.value??call.args.text,1200);if(!key||!value)fail('MEMORY_VALUE_REQUIRED');
  const id=clean(call.args.id,180)||stableId(call,'memory'),row={id,type:clean(call.args.type,80)||'preference',key,value,source:'coach_agent',userConfirmed:true,confidence:clamp(finite(call.args.confidence)??.95,0,1),importance:clamp(Math.round(finite(call.args.importance)??3),1,5),createdAt:at,updatedAt:at,revision:1,status:'active'};
  const same=state.memory.entries.findIndex(item=>clean(item?.key)===key&&clean(item?.status||'active')==='active');
  if(same>=0){const before=clone(state.memory.entries[same]);state.memory.entries[same]={...before,...row,id:before.id,createdAt:before.createdAt||at,revision:Math.max(1,Number(before.revision)||1)+1};result=clone(state.memory.entries[same]);inverse={operation:'replace',domain:'memory',id:before.id,before};}
  else{state.memory.entries.push(row);result=clone(row);inverse={operation:'delete',domain:'memory',id:row.id};}
 }else if(call.name==='updateGoal'){
  const goal=clean(call.args.goal,240);if(!goal)fail('GOAL_REQUIRED');const before={profileGoal:state.profile.goal??null,onboardingGoal:state.onboarding.goal??null};
  state.profile.goal=goal;state.onboarding.goal=goal;result={goal};inverse={operation:'restoreGoal',before};
 }else{
  const normalized=normalizeFactualRecord(call,at),rows=state[normalized.domain];
  if(rows.some(item=>clean(item?.id)===normalized.row.id))fail('RECORD_ALREADY_EXISTS');
  rows.push(normalized.row);result=clone(normalized.row);inverse={operation:'delete',domain:normalized.domain,id:normalized.row.id};
 }
 state.meta.updatedAt=at;
 const receipt={callId:call.callId,fingerprint:fp,tool:call.name,result:clone(result),inverse:clone(inverse),at,autonomous:true,evidenceSource:call.evidenceSource};
 state.meta.autonomousToolReceipts.push(receipt);if(state.meta.autonomousToolReceipts.length>RECEIPT_LIMIT)state.meta.autonomousToolReceipts.splice(0,state.meta.autonomousToolReceipts.length-RECEIPT_LIMIT);
 state.actionLog.push({id:'autonomous_'+hash(call.callId),event:'autonomous_tool_executed',tool:call.name,callId:call.callId,targetId:clean(result?.id)||null,decisionId:clean(call.args?.decisionId)||null,recommendationId:clean(call.args?.recommendationId)||null,evidenceSource:call.evidenceSource,at,status:'success'});
 if(state.actionLog.length>ACTION_LOG_LIMIT)state.actionLog.splice(0,state.actionLog.length-ACTION_LOG_LIMIT);
 return {executed:true,policy,state,result,inverse,duplicate:false};
}
function rollbackState(stateInput,callId,{uid=null,now=new Date()}={}){
 const state=ensureState(stateInput,uid),id=clean(callId,180),receipt=state.meta.autonomousToolReceipts.find(row=>clean(row?.callId)===id);if(!receipt)fail('ROLLBACK_RECEIPT_NOT_FOUND');
 const inverse=receipt.inverse;if(!object(inverse))fail('ROLLBACK_NOT_AVAILABLE');const at=nowIso(now);
 const domain=clean(inverse.domain),rows=domain==='memory'?state.memory.entries:state[domain];
 if(inverse.operation==='delete'){
  if(!Array.isArray(rows))fail('ROLLBACK_DOMAIN_INVALID');const index=rows.findIndex(item=>clean(item?.id)===clean(inverse.id));if(index>=0)rows.splice(index,1);
 }else if(inverse.operation==='replace'){
  if(!Array.isArray(rows))fail('ROLLBACK_DOMAIN_INVALID');const index=rows.findIndex(item=>clean(item?.id)===clean(inverse.id));if(index<0)fail('ROLLBACK_TARGET_NOT_FOUND');rows[index]=clone(inverse.before);
 }else if(inverse.operation==='restoreGoal'){
  state.profile.goal=inverse.before?.profileGoal??null;state.onboarding.goal=inverse.before?.onboardingGoal??null;
 }else fail('ROLLBACK_OPERATION_INVALID');
 state.meta.updatedAt=at;state.actionLog.push({id:'rollback_'+hash(id+at),event:'autonomous_tool_rolled_back',callId:id,tool:receipt.tool,at,status:'success'});
 if(state.actionLog.length>ACTION_LOG_LIMIT)state.actionLog.splice(0,state.actionLog.length-ACTION_LOG_LIMIT);
 return {state,rolledBack:true,callId:id,tool:receipt.tool};
}
function publicToolRegistry(){
 return TOOL_NAMES.map(name=>({name,autonomousPossible:true,factual:FACTUAL_TOOLS.has(name),destructive:false}));
}
module.exports=Object.freeze({VERSION,TOOL_NAMES,FACTUAL_TOOLS,normalizeCall,policyFor,executeOnState,rollbackState,publicToolRegistry,writeIntent,quoteGrounded,numbersGrounded});
