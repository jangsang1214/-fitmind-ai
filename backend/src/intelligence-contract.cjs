'use strict';

const CONTRACT_VERSION='garang-personal-intelligence-v1';
class IntelligenceContractError extends Error{constructor(code){super(code);this.name='IntelligenceContractError';this.code=code;}}
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clean=v=>String(v??'').trim();
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
function assert(condition,code){if(!condition)throw new IntelligenceContractError(code);}
function compactMemory(memoryContext){
 const entries=Array.isArray(memoryContext?.entries)?memoryContext.entries:[];
 return entries.filter(x=>object(x)&&x.userConfirmed!==false&&x.status!=='expired').slice(0,20).map(x=>({id:clean(x.id),memoryClass:clean(x.memoryClass||x.type||'semantic'),type:clean(x.type||''),key:clean(x.key||''),value:clean(x.value??x.text??''),confidence:Number.isFinite(Number(x.confidence))?Number(x.confidence):null,importance:Number.isFinite(Number(x.importance))?Number(x.importance):null,status:clean(x.status||'active'),observedAt:x.observedAt||null,validFrom:x.validFrom||null,validTo:x.validTo||null}));
}
function createEnvelope({tenantId,subjectId,memoryContext=null,userState=null,decision=null,generatedAt=new Date().toISOString()}={}){
 const tenant=clean(tenantId),subject=clean(subjectId);assert(tenant,'TENANT_REQUIRED');assert(subject,'SUBJECT_REQUIRED');assert(object(userState),'USER_STATE_REQUIRED');assert(object(decision),'DECISION_REQUIRED');
 return {contractVersion:CONTRACT_VERSION,tenantId:tenant,subjectId:subject,generatedAt:String(generatedAt),intelligence:{memory:{entries:compactMemory(memoryContext)},userState:clone(userState),decision:clone(decision)},policy:{tenantIsolated:true,subjectScoped:true,requiresConfirmationForWrites:true,noSilentMutation:true,rawCrossUserLearning:false,piiMinimized:true}};
}
function assertScope(envelope,{tenantId,subjectId}={}){assert(object(envelope)&&envelope.contractVersion===CONTRACT_VERSION,'CONTRACT_MISMATCH');assert(clean(envelope.tenantId)===clean(tenantId),'TENANT_SCOPE_MISMATCH');assert(clean(envelope.subjectId)===clean(subjectId),'SUBJECT_SCOPE_MISMATCH');return true;}
module.exports=Object.freeze({CONTRACT_VERSION,IntelligenceContractError,createEnvelope,assertScope});
