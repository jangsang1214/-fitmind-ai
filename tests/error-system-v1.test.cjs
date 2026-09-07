'use strict';
const assert=require('node:assert/strict');
const Errors=require('../02_core/error-system-v1.js');

assert.equal(Errors.VERSION,'garang-error-v1');
assert.equal(Errors.classify(Object.assign(new Error('bad'),{code:'INVALID_CONTRACT'})),Errors.CATEGORY.VALIDATION);
assert.equal(Errors.classify(Object.assign(new Error('future'),{code:'FUTURE_SCHEMA'})),Errors.CATEGORY.MIGRATION);
assert.equal(Errors.classify(Object.assign(new Error('offline'),{code:'unavailable'}),{feature:'sync'}),Errors.CATEGORY.NETWORK);
assert.equal(Errors.classify(Object.assign(new Error('denied'),{code:'permission-denied'}),{feature:'firestore'}),Errors.CATEGORY.FIRESTORE);
assert.equal(Errors.classify(Object.assign(new Error('bad auth'),{code:'auth/wrong-password'})),Errors.CATEGORY.AUTH);
assert.equal(Errors.classify(new Error('quota exceeded'),{source:'local_save'}),Errors.CATEGORY.PERSISTENCE);
assert.equal(Errors.classify(new Error('proposal failed'),{feature:'agent'}),Errors.CATEGORY.AGENT);
assert.equal(Errors.classify(new Error('dom'),{feature:'ui'}),Errors.CATEGORY.UI);

const normalized=Errors.normalizeError(Object.assign(new Error('token=secret internal detail'),{code:'unavailable'}),{feature:'sync',token:'do-not-copy',screen:'coach'});
assert.equal(normalized.code,'GARANG_NETWORK');
assert.equal(normalized.retryable,true);
assert.equal(normalized.context.token,undefined);
assert.equal(normalized.context.screen,'coach');
assert.match(normalized.userMessageKo,/네트워크/);
assert.doesNotMatch(normalized.userMessageKo,/secret|token/i);

Errors.clear();
const first=Errors.report(new Error('same failure'),{feature:'runtime'},{dedupeWindowMs:5000});
const second=Errors.report(new Error('same failure'),{feature:'runtime'},{dedupeWindowMs:5000});
assert.equal(first.fingerprint,second.fingerprint);
assert.equal(Errors.recent(10).length,1,'duplicate errors must not create a storm');

assert.throws(()=>Errors.guard('unit-test',()=>{throw Object.assign(new Error('invalid'),{code:'INVALID_DATA'});}),/invalid/);
assert.equal(Errors.recent(10).length,2,'guard must report and preserve throw semantics');

(async()=>{
  await assert.rejects(()=>Errors.guardAsync('async-test',async()=>{throw Object.assign(new Error('offline'),{code:'unavailable'});}),/offline/);
  const latest=Errors.recent(1)[0];
  assert.equal(latest.category,Errors.CATEGORY.NETWORK);
  console.log('error-system-v1: PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
