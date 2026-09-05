'use strict';
const assert=require('node:assert/strict');
const Policy=require('../02_core/privacy-security.js');
assert.deepEqual(Policy.normalizeConsent({}),{globalLearning:false,analytics:false});
assert.equal(Policy.canGlobalLearn({globalLearning:true}),true);
assert.equal(Policy.canAnalytics({analytics:false}),false);
const redacted=Policy.redact({token:'abc',profile:{email:'x@y.com',goal:'run'},message:'ok'});
assert.equal(redacted.token,'[REDACTED]');
assert.equal(redacted.profile.email,'[REDACTED]');
assert.equal(redacted.profile.goal,'run');
assert.equal(Policy.freshAuth(1000,1200,300),true);
assert.equal(Policy.freshAuth(1000,1400,300),false);
class Store{constructor(){this.map=new Map([['garang_user_u1_v3','{}'],['garang_sync_pending_v1::u1','{}'],['garang_user_u2_v3','{}'],['other','1']]);}get length(){return this.map.size;}key(i){return [...this.map.keys()][i]??null;}removeItem(k){this.map.delete(k);}getItem(k){return this.map.get(k)||null;}}
const store=new Store();const removed=Policy.deleteLocalAccountKeys(store,'u1');
assert.ok(removed.includes('garang_user_u1_v3'));assert.ok(!store.map.has('garang_sync_pending_v1::u1'));assert.ok(store.map.has('garang_user_u2_v3'));assert.ok(store.map.has('other'));
console.log('privacy-security: PASS');
