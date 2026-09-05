(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.GarangPrivacySecurity=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const POLICY_VERSION='2026-09-05';
const DEFAULT_CONSENT=Object.freeze({globalLearning:false,analytics:false});
const SENSITIVE_KEYS=/token|password|secret|authorization|cookie|email|phone|address|name/i;
function normalizeConsent(input={}){return {globalLearning:input.globalLearning===true,analytics:input.analytics===true};}
function canGlobalLearn(input){return normalizeConsent(input).globalLearning===true;}
function canAnalytics(input){return normalizeConsent(input).analytics===true;}
function redact(value,depth=0){
 if(depth>4)return '[TRUNCATED]';
 if(Array.isArray(value))return value.slice(0,30).map(v=>redact(v,depth+1));
 if(!value||typeof value!=='object')return typeof value==='string'?value.slice(0,500):value;
 const out={};for(const [k,v] of Object.entries(value)){if(SENSITIVE_KEYS.test(k))out[k]='[REDACTED]';else out[k]=redact(v,depth+1);}return out;
}
function freshAuth(authTime,nowSeconds=Math.floor(Date.now()/1000),maxAgeSeconds=300){const t=Number(authTime)||0;return t>0&&nowSeconds-t>=0&&nowSeconds-t<=maxAgeSeconds;}
function deleteLocalAccountKeys(storage,uid){
 const targets=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k&&(k===`garang_user_${uid}_v3`||k.includes(`garang_user_${uid}_v3`)||k===`garang_sync_pending_v1::${uid}`||k===`garang_last_sync_${uid}`||k===`garang_last_server_ack_${uid}`))targets.push(k);}targets.forEach(k=>storage.removeItem(k));return targets;
}
return Object.freeze({POLICY_VERSION,DEFAULT_CONSENT,normalizeConsent,canGlobalLearn,canAnalytics,redact,freshAuth,deleteLocalAccountKeys});
});
