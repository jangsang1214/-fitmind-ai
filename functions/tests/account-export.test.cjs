'use strict';
const assert=require('node:assert/strict');
const {createAccountExportHandler}=require('../src/account-export.cjs');
function response(){return {statusCode:0,body:null,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};}
(async()=>{
 const handler=createAccountExportHandler({verifyIdToken:async token=>{assert.equal(token,'good');return {uid:'u1'};},readExport:async uid=>({uid,exportVersion:'garang-user-export-v1'})});
 const ok=response();await handler({headers:{authorization:'Bearer good'}},ok);assert.equal(ok.statusCode,200);assert.equal(ok.body.data.uid,'u1');
 const missing=response();await handler({headers:{}},missing);assert.equal(missing.statusCode,401);assert.equal(missing.body.error.code,'AUTH_REQUIRED');
 console.log('account-export: PASS');
})().catch(error=>{console.error(error);process.exit(1);});
