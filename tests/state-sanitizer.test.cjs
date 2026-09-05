'use strict';
const assert=require('node:assert/strict');
const Sanitizer=require('../06_features/ui/runtime/garang-state-sanitizer-v1.js');

const dirty={
  meta:{schemaVersion:5},profile:'broken',onboarding:null,preferences:null,
  workouts:[null,'bad',{id:'w1',date:'2026-09-06'}],
  meals:[null,{id:'m1',date:'2026-09-06',items:[null,'bad',{id:'f1',name:'egg'}]}],
  runs:[null],body:[false],planner:[null],checkins:[null,{id:'c1',date:'2026-09-06'}],aiChat:[null],actionLog:[null],errors:[null],
  memory:null,analytics:null
};
const safe=Sanitizer.sanitizeState(dirty,{ownerUid:'user-1'});
assert.deepEqual(safe.workouts.map(x=>x.id),['w1']);
assert.deepEqual(safe.meals.map(x=>x.id),['m1']);
assert.deepEqual(safe.meals[0].items.map(x=>x.id),['f1']);
assert.deepEqual(safe.checkins.map(x=>x.id),['c1']);
assert.deepEqual(safe.runs,[]);assert.deepEqual(safe.body,[]);assert.deepEqual(safe.planner,[]);
assert.ok(safe.memory&&Array.isArray(safe.memory.entries));
assert.ok(safe.analytics&&Array.isArray(safe.analytics.events));
assert.equal(safe.profile,null);assert.equal(safe.meta.syncOwnerUid,'user-1');

const store=new Map([['garang_demo_state_v3',JSON.stringify(dirty)]]);
const fakeStorage={
  get length(){return store.size;},key(i){return [...store.keys()][i]??null;},
  getItem(k){return store.has(k)?store.get(k):null;},setItem(k,v){store.set(k,String(v));}
};
const report=Sanitizer.repairLocalStorage(fakeStorage);
assert.equal(report.repaired,1);
assert.ok(store.has('garang_state_recovery_backup_v1::garang_demo_state_v3'),'original state must be backed up');
const repaired=JSON.parse(store.get('garang_demo_state_v3'));
assert.equal(repaired.workouts.length,1);assert.equal(repaired.meals[0].items.length,1);
console.log('state-sanitizer: PASS');
