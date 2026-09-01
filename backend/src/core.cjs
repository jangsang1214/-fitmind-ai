'use strict';
const crypto=require('node:crypto');
const DOMAINS=new Set(['profile','workouts','meals','runs','body','planner','memory','aiChats','scoreHistory','settings']);
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
function createService({store=new MemoryStore(),rateLimiter=new MemoryRateLimiter(),now=()=>Date.now()}={}){
 async function handle(req={}){const traceId=String(req.traceId||trace()),method=String(req.method||'GET').toUpperCase(),path=String(req.path||'/'),size=Buffer.byteLength(JSON.stringify(req.body??null));try{
  if(path==='/v1/health'&&method==='GET')return reply(200,{status:'ok',version:'v1',time:new Date(now()).toISOString()},traceId);
  const uid=req.user?.uid;if(!uid)throw new ApiError('UNAUTHORIZED','Authentication required.',401);if(!rateLimiter.check(uid,now()))throw new ApiError('RATE_LIMITED','Too many requests.',429,true);if(size>1024*1024)throw new ApiError('PAYLOAD_TOO_LARGE','Payload exceeds 1 MB.',413);
  const key=req.headers?.['idempotency-key']||req.headers?.['Idempotency-Key'];if(method!=='GET'&&key){const cacheKey=`${uid}:${key}`;if(store.idempotency.has(cacheKey))return structuredClone(store.idempotency.get(cacheKey));const response=await route({req,uid,method,path,traceId,store});if(response.status<500)store.idempotency.set(cacheKey,structuredClone(response));return response;}
  return await route({req,uid,method,path,traceId,store});
 }catch(error){const e=error instanceof ApiError?error:new ApiError('INTERNAL_ERROR','The request could not be completed.',500,true);return reply(e.status,{code:e.code,message:e.message,retryable:e.retryable},traceId);}}
 return {handle,store,rateLimiter};
}
async function route({req,uid,method,path,traceId,store}){
 const domainMatch=path.match(/^\/v1\/data\/([A-Za-z]+)$/);if(domainMatch){const domain=domainMatch[1];if(!DOMAINS.has(domain))throw new ApiError('INVALID_DOMAIN','Unknown data domain.');if(method==='GET')return reply(200,{domain,value:store.read(uid,domain)},traceId);if(method==='PUT'){if(!req.body||!Object.hasOwn(req.body,'value'))throw new ApiError('INVALID_PAYLOAD','value is required.');return reply(200,{domain,value:store.write(uid,domain,req.body.value)},traceId);}if(method==='DELETE'){store.remove(uid,domain);return reply(200,{deleted:true,domain},traceId);}}
 if(path==='/v1/migrations/local'&&method==='POST'){const b=req.body;if(!b||typeof b.migrationId!=='string'||!b.state||typeof b.state!=='object')throw new ApiError('INVALID_MIGRATION','Migration payload is invalid.');if(Number(b.schemaVersion)<1)throw new ApiError('INVALID_SCHEMA','Schema version is invalid.');for(const domain of DOMAINS)if(Object.hasOwn(b.state,domain))store.write(uid,domain,b.state[domain]);return reply(200,{migrationId:b.migrationId,accepted:true,domains:[...DOMAINS].filter(x=>Object.hasOwn(b.state,x))},traceId);}
 if(path==='/v1/user/export'&&method==='GET')return reply(200,{exportedAt:new Date().toISOString(),data:structuredClone(store.user(uid))},traceId);
 if(path==='/v1/account'&&method==='DELETE'){if(req.body?.confirmation!=='DELETE')throw new ApiError('CONFIRMATION_REQUIRED','Type DELETE to continue.');store.removeUser(uid);return reply(200,{deleted:true},traceId);}
 if(path==='/v1/analytics/events'&&method==='POST'){const events=req.body?.events;if(!Array.isArray(events)||events.length>100)throw new ApiError('INVALID_EVENTS','A batch of up to 100 events is required.');store.events.push(...events.map(x=>({...structuredClone(x),uid})));return reply(202,{accepted:events.length},traceId);}
 if(path==='/v1/errors'&&method==='POST'){store.errors.push({...structuredClone(req.body||{}),uid});return reply(202,{accepted:true},traceId);}
 if(path==='/v1/agent/actions'&&method==='POST'){const {tool,args}=req.body||{};if(!['createPlan','updatePlan','saveMemory','deleteRecord','updateGoal'].includes(tool))throw new ApiError('TOOL_NOT_ALLOWED','Agent tool is not allowed.');const action={id:crypto.randomUUID(),uid,tool,args:structuredClone(args||{}),status:'pending',createdAt:new Date().toISOString()};store.actions.set(action.id,action);return reply(201,action,traceId);}
 const confirm=path.match(/^\/v1\/agent\/actions\/([^/]+)\/confirm$/);if(confirm&&method==='POST'){const action=store.actions.get(confirm[1]);if(!action||action.uid!==uid)throw new ApiError('ACTION_NOT_FOUND','Action was not found.',404);if(action.status!=='pending')throw new ApiError('ACTION_RESOLVED','Action has already been resolved.',409);action.status=req.body?.confirmed===true?'confirmed':'rejected';action.resolvedAt=new Date().toISOString();return reply(200,structuredClone(action),traceId);}
 throw new ApiError('NOT_FOUND','Route was not found.',404);
}
module.exports={ApiError,MemoryStore,MemoryRateLimiter,createService,DOMAINS};
