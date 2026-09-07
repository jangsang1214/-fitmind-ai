/* GARANG Error System v1
   Canonical error taxonomy and normalization boundary.
   This module does not change existing feature UX; it classifies, deduplicates and publishes
   errors so every feature can converge on one stable contract without leaking internals.
*/
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GarangErrors=api;
  if(typeof window!=='undefined'&&root===window)api.installGlobalHandlers();
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';

const VERSION='garang-error-v1';
const CATEGORY=Object.freeze({
  VALIDATION:'validation',AUTH:'auth',NETWORK:'network',FIRESTORE:'firestore',
  PERSISTENCE:'persistence',MIGRATION:'migration',AGENT:'agent',UI:'ui',RUNTIME:'runtime',UNKNOWN:'unknown'
});
const STABLE_CODE=Object.freeze({
  validation:'GARANG_VALIDATION',auth:'GARANG_AUTH',network:'GARANG_NETWORK',firestore:'GARANG_FIRESTORE',
  persistence:'GARANG_PERSISTENCE',migration:'GARANG_MIGRATION',agent:'GARANG_AGENT',ui:'GARANG_UI',
  runtime:'GARANG_RUNTIME',unknown:'GARANG_UNKNOWN'
});
const USER_MESSAGE=Object.freeze({
  ko:Object.freeze({
    validation:'입력 내용을 확인해 주세요.',auth:'로그인 상태를 확인해 주세요.',network:'네트워크 연결을 확인해 주세요.',
    firestore:'클라우드 연결을 확인 중입니다. 기록은 기기에 안전하게 저장됩니다.',persistence:'기기 저장 공간을 확인해 주세요.',
    migration:'저장된 데이터 형식을 확인할 수 없습니다. 데이터 복구에서 다시 확인해 주세요.',agent:'AI 응답을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    ui:'화면을 표시하는 중 문제가 발생했습니다. 다시 시도해 주세요.',runtime:'앱 동작 중 문제가 발생했습니다. 다시 시도해 주세요.',
    unknown:'문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  }),
  en:Object.freeze({
    validation:'Please check your input.',auth:'Please check your sign-in status.',network:'Please check your network connection.',
    firestore:'Checking the cloud connection. Your records remain safely stored on this device.',persistence:'Please check available device storage.',
    migration:'The saved data format could not be verified. Please check Data Recovery.',agent:'GARANG could not prepare the AI response. Please try again.',
    ui:'GARANG could not render this screen. Please try again.',runtime:'GARANG encountered a runtime issue. Please try again.',
    unknown:'Something went wrong. Please try again shortly.'
  })
});
const RETRYABLE=Object.freeze({validation:false,auth:false,network:true,firestore:true,persistence:false,migration:false,agent:true,ui:true,runtime:true,unknown:true});
const recentErrors=[];
const dedupe=new Map();
let installed=false,globalCleanup=null;

const text=value=>String(value??'');
const lower=value=>text(value).toLowerCase();
function fnv1a(value){let hash=0x811c9dc5;for(const ch of text(value)){hash^=ch.charCodeAt(0);hash=Math.imul(hash,0x01000193)>>>0;}return hash.toString(16).padStart(8,'0');}
function sourceCode(error){return text(error?.code||error?.name||'').trim()||null;}
function safeContext(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return {};
  const out={};
  for(const [key,value] of Object.entries(input)){
    if(/password|token|secret|authorization|cookie/i.test(key))continue;
    if(['string','number','boolean'].includes(typeof value)||value===null)out[key]=typeof value==='string'?value.slice(0,240):value;
  }
  return out;
}
function classify(error,context={}){
  const code=lower(sourceCode(error)),message=lower(error?.message||error),feature=lower(context.feature||context.source||context.layer);
  if(/invalid_data|invalid_contract|invalid_tombstone|validation|required|malformed|bad[_ -]?input/.test(`${code} ${message}`))return CATEGORY.VALIDATION;
  if(/future_schema|foreign_contract|migration|recovery_scan_cancelled/.test(`${code} ${message} ${feature}`))return CATEGORY.MIGRATION;
  if(/^auth\//.test(code)||/firebase.?auth|sign.?in|login|credential|user.?disabled|wrong.?password|email.?already/.test(`${code} ${message} ${feature}`))return CATEGORY.AUTH;
  if(/firestore|permission-denied|failed-precondition|aborted|resource-exhausted/.test(`${code} ${message} ${feature}`))return CATEGORY.FIRESTORE;
  if(/network|offline|unavailable|deadline-exceeded|timeout|failed to fetch|load failed|connection/.test(`${code} ${message} ${feature}`))return CATEGORY.NETWORK;
  if(/quota|storage|local_save|persistence|indexeddb|serialize|deserialize/.test(`${code} ${message} ${feature}`))return CATEGORY.PERSISTENCE;
  if(/agent|assistant|llm|proposal|tool/.test(feature))return CATEGORY.AGENT;
  if(/ui|screen|render|dom|touch|gesture/.test(feature))return CATEGORY.UI;
  if(/runtime|lifecycle|observer|bootstrap/.test(feature))return CATEGORY.RUNTIME;
  return CATEGORY.UNKNOWN;
}
function userMessage(category,lang='ko'){const resolved=lang==='en'?'en':'ko';return USER_MESSAGE[resolved][category]||USER_MESSAGE[resolved].unknown;}
function normalizeError(error,context={}){
  const category=classify(error,context),at=new Date().toISOString(),internalMessage=text(error?.message||error||'unknown').slice(0,1000),srcCode=sourceCode(error);
  const cleanContext=safeContext(context),fingerprint=fnv1a(`${category}|${srcCode||''}|${internalMessage}|${cleanContext.feature||cleanContext.source||''}`);
  return Object.freeze({
    version:VERSION,category,code:STABLE_CODE[category]||STABLE_CODE.unknown,sourceCode:srcCode,
    retryable:RETRYABLE[category]!==false,userMessageKo:userMessage(category,'ko'),userMessageEn:userMessage(category,'en'),
    internalMessage,at,fingerprint,context:Object.freeze(cleanContext)
  });
}
function dispatch(record){
  try{if(root?.dispatchEvent&&typeof root.CustomEvent==='function')root.dispatchEvent(new root.CustomEvent('garang:error',{detail:record}));}catch{}
}
function report(error,context={},options={}){
  const record=normalizeError(error,context),now=Date.now(),windowMs=Math.max(0,Number(options.dedupeWindowMs??1500));
  const previous=dedupe.get(record.fingerprint)||0;if(windowMs&&now-previous<windowMs)return record;dedupe.set(record.fingerprint,now);
  recentErrors.push(record);if(recentErrors.length>100)recentErrors.splice(0,recentErrors.length-100);dispatch(record);return record;
}
function recent(limit=20){return recentErrors.slice(-Math.max(0,Math.min(100,Number(limit)||20)));}
function clear(){recentErrors.length=0;dedupe.clear();}
function guard(source,fn,context={}){try{return fn();}catch(error){report(error,{...context,source});throw error;}}
async function guardAsync(source,fn,context={}){try{return await fn();}catch(error){report(error,{...context,source});throw error;}}
function installGlobalHandlers(){
  if(installed||!root?.addEventListener)return globalCleanup||(()=>{});
  const onError=event=>report(event?.error||event?.message||'window error',{source:'window.error',feature:'runtime'});
  const onReject=event=>report(event?.reason||'unhandled rejection',{source:'window.unhandledrejection',feature:'runtime'});
  root.addEventListener('error',onError);root.addEventListener('unhandledrejection',onReject);installed=true;
  globalCleanup=()=>{try{root.removeEventListener('error',onError);root.removeEventListener('unhandledrejection',onReject);}catch{}installed=false;globalCleanup=null;};
  return globalCleanup;
}

return Object.freeze({VERSION,CATEGORY,STABLE_CODE,RETRYABLE,classify,userMessage,normalizeError,report,capture:report,recent,clear,guard,guardAsync,installGlobalHandlers});
});