'use strict';
const analyticsContract=require('./analytics-contract-v1.cjs');
const {parseBearer}=require('./agent-context.cjs');

const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clean=(value,limit=160)=>String(value??'').trim().slice(0,limit);
const SAFE_ERROR_CONTEXT_KEYS=new Set(['category','code','sourceCode','retryable','fingerprint','feature','source','layer']);
function canonicalEvent(name,properties={}){
 let key=clean(name,80),props=object(properties)?{...properties}:{};
 if(key==='screen_viewed'){
  const page=clean(props.page??props.screen,30);if(page)key=`screen_viewed:${page}`;
 }
 const legacy=analyticsContract.legacyEventMapping?.[key];
 if(legacy){key=legacy.canonical;props={...props,...Object.fromEntries(Object.entries(legacy).filter(([k])=>k!=='canonical'))};}
 const spec=analyticsContract.canonicalEvents?.[key];if(!spec)return null;
 const allowed=new Set(spec.allowedProperties||[]),safe={};for(const [k,v] of Object.entries(props)){if(!allowed.has(k))continue;if(['string','number','boolean'].includes(typeof v)||v===null)safe[k]=typeof v==='string'?clean(v,120):v;}
 return {name:key,stage:spec.stage,properties:safe,contractVersion:analyticsContract.version};
}
function safeError(payload={}){
 const source=object(payload)?payload:{},context=object(source.context)?source.context:{},safeContext={};
 for(const [k,v] of Object.entries(context)){if(!SAFE_ERROR_CONTEXT_KEYS.has(k))continue;if(['string','number','boolean'].includes(typeof v)||v===null)safeContext[k]=typeof v==='string'?clean(v,160):v;}
 return {category:clean(source.category,40)||'unknown',code:clean(source.code,80)||'GARANG_UNKNOWN',sourceCode:clean(source.sourceCode,80)||null,retryable:source.retryable===true,fingerprint:clean(source.fingerprint,80)||null,context:safeContext};
}
async function persistTelemetry(writeEvent,uid,payload,response){
 try{await writeEvent(uid,payload);return null;}catch{return response.status(503).json({ok:false,error:{code:'TELEMETRY_WRITE_FAILED',retryable:true}});}
}
function createTelemetryHandler({verifyIdToken,readConsent,writeEvent,clock=()=>new Date()}){
 if(typeof verifyIdToken!=='function'||typeof readConsent!=='function'||typeof writeEvent!=='function')throw new Error('TELEMETRY_DEPENDENCIES_REQUIRED');
 return async function telemetry(request,response){
  const token=parseBearer(request.headers?.authorization||request.get?.('authorization'));if(!token)return response.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});
  let decoded;try{decoded=await verifyIdToken(token);}catch{return response.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});}
  const uid=clean(decoded?.uid,180);if(!uid)return response.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});
  let consent=false;try{consent=(await readConsent(uid))===true;}catch{return response.status(503).json({ok:false,error:{code:'CONSENT_UNAVAILABLE',retryable:true}});}
  if(!consent)return response.status(202).json({ok:true,accepted:false,reason:'CONSENT_REQUIRED'});
  const kind=request.path?.includes('/errors')?'error':'analytics',receivedAt=clock().toISOString();
  if(kind==='analytics'){
   const rows=Array.isArray(request.body?.events)?request.body.events.slice(0,50):[request.body||{}],events=rows.map(row=>canonicalEvent(row?.name,row?.properties||row?.props)).filter(Boolean);
   if(!events.length)return response.status(400).json({ok:false,error:{code:'NO_VALID_EVENTS'}});
   const failed=await persistTelemetry(writeEvent,uid,{kind,events,receivedAt},response);if(failed)return failed;
   return response.status(202).json({ok:true,accepted:true,count:events.length});
  }
  const event=safeError(request.body||{}),failed=await persistTelemetry(writeEvent,uid,{kind,event,receivedAt},response);if(failed)return failed;
  return response.status(202).json({ok:true,accepted:true,count:1});
 };
}
module.exports={canonicalEvent,safeError,persistTelemetry,createTelemetryHandler};
