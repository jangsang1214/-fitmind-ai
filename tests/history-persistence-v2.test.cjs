'use strict';
const assert=require('node:assert/strict');
const History=require('../02_core/history-persistence-v2.js');
const Sync=require('../02_core/sync-durability.js');

const day=i=>new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10);
const workouts=Array.from({length:620},(_,i)=>({id:`w${i}`,date:day(i),name:`Workout ${i}`,sets:3,reps:5,weight:60+i%40}));
const meals=Array.from({length:620},(_,i)=>({id:`m${i}`,date:day(i),name:`Meal ${i}`,items:[{id:`f${i}`,name:'food',grams:100,kcal:200}]}));
const runs=Array.from({length:210},(_,i)=>({id:`r${i}`,date:day(i),distance:5,duration:30,coords:Array.from({length:250},(__,j)=>[37+j/100000,127+j/100000,Date.now()+j])}));
const body=Array.from({length:300},(_,i)=>({id:`b${i}`,date:day(i),weight:70+i/100}));
const state={meta:{syncOwnerUid:'u1',updatedAt:'2026-09-06T00:00:00Z'},workouts,meals,runs,body};

const shell=History.compactShell(state);
assert.equal(shell.workouts.length,History.SHELL_LIMITS.workouts);
assert.equal(shell.meals.length,History.SHELL_LIMITS.meals);
assert.equal(shell.runs.length,History.SHELL_LIMITS.runs);
assert.equal(shell.body.length,History.SHELL_LIMITS.body);
assert.ok(shell.runs.every(r=>Array.isArray(r.coords)&&r.coords.length===0),'GPS arrays must not live in app/state shell');
assert.ok(History.estimateJsonBytes(shell)<350000,'bounded state shell should remain far below Firestore 1 MiB limit');

const hydrated=History.mergeStateWithHistory(shell,{workouts,meals,runs,body});
assert.equal(hydrated.workouts.length,620);
assert.equal(hydrated.meals.length,620);
assert.equal(hydrated.runs.length,210);
assert.equal(hydrated.body.length,300);
assert.equal(hydrated.runs.at(-1).coords.length,250,'history hydration restores full GPS route');
assert.ok(History.rowStamp({date:'2026-09-06'})>0,'date-only legacy rows must have a deterministic timestamp');

const normalized=History.normalizeRecord('workouts',{date:'2026-09-06',name:'legacy row'},'u1');
assert.ok(normalized.id&&normalized.createdAt&&normalized.updatedAt&&normalized.revision===1);
assert.equal(normalized.ownerUid,'u1');

const envelope=Sync.createExportEnvelope(hydrated,{scope:'authenticated'});
assert.equal(Sync.verifyExportEnvelope(envelope),true);
envelope.payload.workouts[0].name='tampered';
assert.equal(Sync.verifyExportEnvelope(envelope),false,'checksum must detect same-count payload corruption');

console.log('history-persistence-v2: PASS');
