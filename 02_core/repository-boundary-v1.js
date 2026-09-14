(function(root,factory){
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.GarangRepositories=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';

const VERSION='garang-repository-boundary-v1';
const HISTORY_DOMAINS=Object.freeze(['workouts','meals','runs','body']);
const HISTORY_COLLECTIONS=Object.freeze({workouts:'workoutHistory',meals:'mealHistory',runs:'runHistory',body:'bodyHistory'});
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);

function firebaseUser(){
 try{return root.firebase?.auth?.().currentUser||null;}catch{return null;}
}
function storageKey(){
 try{const key=root.GarangAgentStateBridge?.getStorageKey?.();if(key)return String(key);}catch{}
 const uid=firebaseUser()?.uid;
 return uid?`garang_user_${uid}_v3`:'garang_demo_state_v3';
}
function readState(){
 try{const bridge=root.GarangAgentStateBridge;if(bridge?.ready?.())return clone(bridge.getState());}catch{}
 try{const raw=root.localStorage?.getItem?.(storageKey());return raw?JSON.parse(raw):null;}catch{return null;}
}
function canonicalState(){
 const state=readState();
 if(!state)return null;
 return root.GarangSchema?.toTransport?clone(root.GarangSchema.toTransport(state)):clone(state);
}

const StateRepository=Object.freeze({
 version:VERSION,
 storageKey,
 read:readState,
 canonical:canonicalState,
 async syncNow(){
  if(typeof root.cloudSaveNow==='function')return !!(await root.cloudSaveNow());
  return false;
 }
});

const HistoryRepository=Object.freeze({
 version:VERSION,
 domains:HISTORY_DOMAINS,
 collections:HISTORY_COLLECTIONS,
 read(domain){
  if(!HISTORY_DOMAINS.includes(domain))throw new Error('INVALID_HISTORY_DOMAIN');
  const state=readState();
  return clone(Array.isArray(state?.[domain])?state[domain]:[]);
 },
 canonical(domain){
  if(!HISTORY_DOMAINS.includes(domain))throw new Error('INVALID_HISTORY_DOMAIN');
  const state=canonicalState();
  return clone(Array.isArray(state?.[domain])?state[domain]:[]);
 }
});

const AuthService=Object.freeze({
 version:VERSION,
 currentUser:firebaseUser,
 uid:()=>firebaseUser()?.uid||null,
 isAuthenticated:()=>!!firebaseUser(),
 async getIdToken(forceRefresh=false){
  const user=firebaseUser();
  if(!user||typeof user.getIdToken!=='function'){const error=new Error('AUTH_REQUIRED');error.code='AUTH_REQUIRED';throw error;}
  return user.getIdToken(!!forceRefresh);
 },
 providerId(){return (firebaseUser()?.providerData||[])[0]?.providerId||'';},
 async reauthenticate(password=''){
  const user=firebaseUser();if(!user){const error=new Error('AUTH_REQUIRED');error.code='AUTH_REQUIRED';throw error;}
  const provider=(user.providerData||[])[0]?.providerId||'';
  if(provider==='password'){
   if(!password){const error=new Error('REAUTH_PASSWORD_REQUIRED');error.code='REAUTH_PASSWORD_REQUIRED';throw error;}
   const credential=root.firebase.auth.EmailAuthProvider.credential(user.email,password);
   return user.reauthenticateWithCredential(credential);
  }
  if(provider==='google.com')return user.reauthenticateWithPopup(new root.firebase.auth.GoogleAuthProvider());
  if(provider==='apple.com')return user.reauthenticateWithPopup(new root.firebase.auth.OAuthProvider('apple.com'));
  const error=new Error('REAUTH_PROVIDER_UNSUPPORTED');error.code='REAUTH_PROVIDER_UNSUPPORTED';throw error;
 }
});

function diagnostics(){
 const state=readState();
 return {version:VERSION,authenticated:AuthService.isAuthenticated(),storageKey:storageKey(),stateReady:object(state),historyCounts:Object.fromEntries(HISTORY_DOMAINS.map(domain=>[domain,Array.isArray(state?.[domain])?state[domain].length:0]))};
}

return Object.freeze({VERSION,StateRepository,HistoryRepository,AuthService,diagnostics});
});
