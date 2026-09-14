'use strict';
const assert=require('node:assert/strict');
const Repositories=require('../02_core/repository-boundary-v1.js');

const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value))};
globalThis.firebase={auth:()=>({currentUser:{uid:'u1',providerData:[{providerId:'password'}],getIdToken:async()=> 'token-1'}})};
globalThis.GarangAgentStateBridge={ready:()=>true,getStorageKey:()=> 'garang_user_u1_v3',getState:()=>({workouts:[{id:'w1'}],meals:[],runs:[],body:[]})};

assert.equal(Repositories.VERSION,'garang-repository-boundary-v1');
assert.equal(Repositories.AuthService.uid(),'u1');
assert.equal(Repositories.AuthService.isAuthenticated(),true);
assert.equal(await Repositories.AuthService.getIdToken(),'token-1');
assert.equal(Repositories.StateRepository.storageKey(),'garang_user_u1_v3');
assert.deepEqual(Repositories.HistoryRepository.read('workouts'),[{id:'w1'}]);
assert.throws(()=>Repositories.HistoryRepository.read('planner'),/INVALID_HISTORY_DOMAIN/);
assert.equal(Repositories.diagnostics().historyCounts.workouts,1);

console.log('repository-boundary-v1: PASS');
