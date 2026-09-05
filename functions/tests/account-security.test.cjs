'use strict';
const assert=require('node:assert/strict');
const {bearer,requireFresh,createDeleteAccountHandler}=require('../src/account-security.cjs');
assert.equal(bearer('Bearer abc'),'abc');assert.throws(()=>bearer('x'),/Bearer token required/);
assert.equal(requireFresh({uid:'u',auth_time:1000},1200).uid,'u');assert.throws(()=>requireFresh({uid:'u',auth_time:1000},1400),e=>e.code==='RECENT_LOGIN_REQUIRED');
function response(){return {statusCode:0,body:null,status(n){this.statusCode=n;return this;},json(x){this.body=x;return this;}};}
(async()=>{const calls=[];const handler=createDeleteAccountHandler({verifyIdToken:async()=>({uid:'u1',auth_time:1000}),deleteUserData:async uid=>calls.push('data:'+uid),deleteAuthUser:async uid=>calls.push('auth:'+uid),nowSeconds:()=>1100});const res=response();await handler({headers:{authorization:'Bearer token'}},res);assert.equal(res.statusCode,200);assert.deepEqual(calls,['data:u1','auth:u1']);console.log('account-security: PASS');})().catch(e=>{console.error(e);process.exitCode=1;});
