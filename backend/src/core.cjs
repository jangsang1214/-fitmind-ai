'use strict';
const crypto=require('node:crypto');
const {MockAIAdapter}=require('./mock-ai.cjs');
const {AI_CONTRACT_VERSION,TOOL_CONTRACT_VERSION,TOOL_SPECS,validateToolCall,normalizeCoachRequest,normalizeProviderResult}=require('./ai-contract.cjs');
const CONTRACT_VERSION='garang-state-v1',SCHEMA_VERSION=8;
const DOMAINS=new Set(['profile','userModel','workouts','meals','runs','body','planner','dailyCheckins','memory','aiChats','scoreHistory','settings']);
const ARRAY_DOMAINS=new Set(['workouts','meals','runs','body','planner','dailyCheckins','aiChats','scoreHistory']);
const OBJECT_DOMAINS=new Set(['memory','settings']);
const NULLABLE_OBJECT_DOMAINS=new Set(['profile','userModel']);
class ApiError extends Error{constructor(code,message,status=400,retryable=false){super(message);this.code=code;this.status=status;this.retryable=retryable;}}
class MemoryStore{
 constructor(){this.users=new Map();this.actions=new Map();this.idempotency=new Map();this.events=[];this.errors=[];}
 user(uid){if(!this.users.has(uid))this.users.set(uid,{});return this.users.get(uid);}
 read(uid,domain){return structuredClone(this.user(uid)[domain]??null);}
 write(uid,domain,value){this.user(uid)[domain]=structuredClone(value);return this.read(uid,domain);}
 remove(uid,domain){delete this.user(uid)[domain];}
 removeUser(uid){this.users.delete(uid);for(const [id,x] of this.actions)if(x.uid===uid)this.actions.delete(id);}
}
class MemoryRateLimiter{constructor(limit=120,windowMs=60000){this.limit=limit;this.windowMs=windowMs;this.rows=new Map();}check(key,now=Date.now()){const row=this.rows.get(key);if(!row||now-row.started>=this.windowMs){this.rows.set(key,{started:now,count:1});return true;}row.count++;return row.count<=this.limit;}}
const trace=()=>crypto.randomUUID(),reply=(status,data,traceId)=>({status,body:{ok:status<400,...(status<400?{data}:{error:data}),traceId}});
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
function validDomainValue(domain,value){if(ARRAY_DOMAINS.has(domain))return Array.isArray(value);if(OBJECT_DOMAINS.has(domain))return object(value);if(NULLABLE_OBJECT_DOMAINS.has(domain))return value===null||object(value);return false;}
function createService({store=new MemoryStore(),rateLimiter=new MemoryRateLimiter(),now=()=>Date.now(),aiProvider=new MockAIAdapter()}={}){
 async function handle(req={}){const traceId=String(req.traceId||trace()),method=String(req.method||'GET').toUpperCase(),path=String(req.path||'/'),size=Buffer.byteLength(JSON.stringify(req.body??null));try{
  if(path==='/v1/health'&&method==='GET')return reply(200,{status:'ok',version:'v1',contractVersion:CONTRACT_VERSION,schemaVersion:SCHEMA_VERSION,aiContractVersion:AI_CONTRACT_VERSION,toolContractVersion:TOOL_CONTRACT_VERSION,time:new Date(now()).toISOString()},traceId);
  const uid=req.user?.uid;if(!uid)throw new ApiError('UNAUTHORIZED','Authentication required.',401);if(!rateLimiter.check(uid,now()))throw new ApiError('RATE_LIMITED','Too many requests.',429,true);if(size>1024*1024)throw new ApiError('PAYLOAD_TOO_LARGE','Payload exceeds 1 MB.',413);
  const key=req.headers?.['idempotency-key']||req.headers?.['Idempotency-Key'];if(method!=='GET'&&key){const cacheKey=`${uid}:${key}`;if(store.idempotency.has(cacheKey))return structuredClone(store.idempotency.get(cacheKey));const response=await route({req,uid,method,path,traceId,store,now,aiProvider});if(response.status<500)store.idempotency.set(cacheKey,structuredClone(response));return response;}
  return await route({req,uid,method,path,traceId,store,now,aiProvider});
 }catch(error){const e=error instanceof ApiError?error:new ApiError('INTERNAL_ERROR','The request could not be completed.',500,true);return reply(e.status,{code:e.code,message:e.message,retryable:e.retryable},traceId);}}
 return {handle,store,rateLimiter,aiProvider};
}
function proposeAction({uid,tool,args,store,now}){
 const checked=validateToolCall({tool,args});if(!checked.ok)throw new ApiError('INVALID_TOOL_ARGS',checked.errors.join(' '),400);
 const action={id:crypto.randomUUID(),uid,tool,args:structuredClone(checked.args),status:'pending',requiresConfirmation:TOOL_SPECS[tool].requiresConfirmation,createdAt:new Date(now()).toISOString()};
 store.actions.set(action.id,action);return action;
}
function executeAction({action,store,now}){
 const at=new Date(now()).toISOString();
 if(action.tool==='createPlan'){
  const current=store.read(action.uid,'planner'),list=Array.isArray(current)?current:[];
  const item={id:`plan_${crypto.randomUUID()}`,title:action.args.title,date:action.args.date,time:action.args.time,type:action.args.type,details:action.args.details,done:false,origin:'ai',createdAt:at,updatedAt:at};
  list.push(item);store.write(action.uid,'planner',list);return {domain:'planner',record:item};
 }
 if(action.tool==='updatePlan'){
  const current=store.read(action.uid,'planner'),list=Array.isArray(current)?current:[],index=list.findIndex(item=>String(item?.id)===action.args.id);
  if(index<0)throw new ApiError('ACTION_TARGET_NOT_FOUND','Planner item was not found.',404);
  list[index]={...list[index],...action.args.patch,updatedAt:at};store.write(action.uid,'planner',list);return {domain:'planner',record:structuredClone(list[index])};
 }
 if(action.tool==='saveMemory'){
  const current=store.read(action.uid,'memory'),memory=object(current)?current:{},entries=Array.isArray(memory.entries)?memory.entries:[];
  const same=entries.find(item=>String(item?.type||'')===action.args.type&&String(item?.key||'')===String(action.args.key||'')&&String(item?.value||item?.text||'')===action.args.value);
  if(same){same.importance=Math.max(Number(same.importance)||1,action.args.importance);same.confidence=Math.max(Number(same.confidence)||0,action.args.confidence);same.userConfirmed=action.args.userConfirmed;same.updatedAt=at;same.lastSeenAt=at;}
  else entries.push({id:`mem_${crypto.randomUUID()}`,type:action.args.type,key:action.args.key,value:action.args.value,importance:action.args.importance,confidence:action.args.confidence,expiresAt:action.args.expiresAt,userConfirmed:action.args.userConfirmed,source:'ai_action',createdAt:at,updatedAt:at,lastSeenAt:at,evidenceCount:1});
  memory.entries=entries;store.write(action.uid,'memory',memory);return {domain:'memory',saved:true,count:entries.length};
 }
 if(action.tool==='deleteRecord'){
  const current=store.read(action.uid,action.args.domain),list=Array.isArray(current)?current:[],index=list.findIndex(item=>String(item?.id)===action.args.id);
  if(index<0)throw new ApiError('ACTION_TARGET_NOT_FOUND','Record was not found.',404);
  const [removed]=list.splice(index,1);store.write(action.uid,action.args.domain,list);return {domain:action.args.domain,deletedId:action.args.id,record:removed};
 }
 if(action.tool==='updateGoal'){
  const current=store.read(action.uid,'profile'),profile=object(current)?current:{};profile.goal=action.args.goal;profile.updatedAt=at;store.write(action.uid,'profile',profile);return {domain:'profile',goal:action.args.goal};
 }
 throw new ApiError('TOOL_NOT_ALLOWED','Agent tool is not allowed.',400);
}
async function route({req,uid,method,path,traceId,store,now,aiProvider}){
 const domainMatch=path.match(/^\/v1\/data\/([A-Za-z]+)$/);if(domainMatch){const domain=domainMatch[1];if(!DOMAINS.has(domain))throw new ApiError('INVALID_DOMAIN','Unknown data domain.');if(method==='GET')return reply(200,{domain,value:store.read(uid,domain),contractVersion:CONTRACT_VERSION,schemaVersion:SCHEMA_VERSION},traceId);if(method==='PUT'){if(!req.body||!Object.hasOwn(req.body,'value'))throw new ApiError('INVALID_PAYLOAD','value is required.');if(!validDomainValue(domain,req.body.value))throw new ApiError('INVALID_PAYLOAD','Domain value does not match the GARANG data contract.');return reply(200,{domain,value:store.write(uid,domain,req.body.value),contractVersion:CONTRACT_VERSION,schemaVersion:SCHEMA_VERSION},traceId);}if(method==='DELETE'){store.remove(uid,domain);return reply(200,{deleted:true,domain},traceId);}}
 if(path==='/v1/migrations/local'&&method==='POST'){const b=req.body;if(!b||typeof b.migrationId!=='string'||!b.state||typeof b.state!=='object')throw new ApiError('INVALID_MIGRATION','Migration payload is invalid.');if(b.contractVersion&&b.contractVersion!==CONTRACT_VERSION)throw new ApiError('INVALID_CONTRACT','Contract version is not supported.');if(Number(b.schemaVersion)<1||Number(b.schemaVersion)>SCHEMA_VERSION)throw new ApiError('INVALID_SCHEMA','Schema version is invalid.');for(const domain of DOMAINS)if(Object.hasOwn(b.state,domain)){if(!validDomainValue(domain,b.state[domain]))throw new ApiError('INVALID_PAYLOAD',`Invalid ${domain} domain.`);store.write(uid,domain,b.state[domain]);}return reply(200,{migrationId:b.migrationId,accepted:true,contractVersion:CONTRACT_VERSION,schemaVersion:SCHEMA_VERSION,domains:[...DOMAINS].filter(x=>Object.hasOwn(b.state,x))},traceId);}
 if(path==='/v1/user/export'&&method==='GET')return reply(200,{exportedAt:new Date(now()).toISOString(),contractVersion:CONTRACT_VERSION,schemaVersion:SCHEMA_VERSION,data:structuredClone(store.user(uid))},traceId);
 if(path==='/v1/account'&&method==='DELETE'){if(req.body?.confirmation!=='DELETE')throw new ApiError('CONFIRMATION_REQUIRED','Type DELETE to continue.');store.removeUser(uid);return reply(200,{deleted:true},traceId);}
 if(path==='/v1/analytics/events'&&method==='POST'){const events=req.body?.events;if(!Array.isArray(events)||events.length>100)throw new ApiError('INVALID_EVENTS','A batch of up to 100 events is required.');store.events.push(...events.map(x=>({...structuredClone(x),uid})));return reply(202,{accepted:events.length},traceId);}
 if(path==='/v1/errors'&&method==='POST'){store.errors.push({...structuredClone(req.body||{}),uid});return reply(202,{accepted:true},traceId);}
 if(path==='/v1/coach/respond'&&method==='POST'){
  const request=normalizeCoachRequest(req.body);if(!request.ok)throw new ApiError('INVALID_AI_REQUEST',request.errors.join(' '),400);
  let raw;try{raw=await aiProvider.generate({...request.args,userId:uid,state:structuredClone(store.user(uid))});}catch{throw new ApiError('AI_PROVIDER_ERROR','AI provider failed.',502,true);}
  const normalized=normalizeProviderResult(raw);if(!normalized.ok)throw new ApiError('AI_TOOL_CONTRACT_VIOLATION',normalized.errors.join(' '),502);
  const actions=normalized.args.toolCalls.map(call=>proposeAction({uid,tool:call.tool,args:call.args,store,now}));
  return reply(200,{aiContractVersion:AI_CONTRACT_VERSION,toolContractVersion:TOOL_CONTRACT_VERSION,provider:aiProvider.name||'adapter',text:normalized.args.text,actions:actions.map(x=>structuredClone(x)),usage:normalized.args.usage},traceId);
 }
 if(path==='/v1/agent/actions'&&method==='POST'){const {tool,args}=req.body||{};return reply(201,proposeAction({uid,tool,args,store,now}),traceId);}
 const confirm=path.match(/^\/v1\/agent\/actions\/([^/]+)\/confirm$/);if(confirm&&method==='POST'){
  const action=store.actions.get(confirm[1]);if(!action||action.uid!==uid)throw new ApiError('ACTION_NOT_FOUND','Action was not found.',404);if(action.status!=='pending')throw new ApiError('ACTION_RESOLVED','Action has already been resolved.',409);
  if(req.body?.confirmed!==true){action.status='rejected';action.resolvedAt=new Date(now()).toISOString();return reply(200,structuredClone(action),traceId);}
  const execution=executeAction({action,store,now});action.status='confirmed';action.resolvedAt=new Date(now()).toISOString();action.appliedAt=action.resolvedAt;action.result=structuredClone(execution);return reply(200,structuredClone(action),traceId);
 }
 throw new ApiError('NOT_FOUND','Route was not found.',404);
}
module.exports={ApiError,MemoryStore,MemoryRateLimiter,createService,DOMAINS,CONTRACT_VERSION,SCHEMA_VERSION,AI_CONTRACT_VERSION,TOOL_CONTRACT_VERSION,validDomainValue,proposeAction,executeAction};
