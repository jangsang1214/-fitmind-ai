'use strict';
const assert=require('node:assert/strict');
const Server=require('../src/history-boundary.cjs');
const Browser=require('../../02_core/history-persistence-v2.js');

assert.deepEqual(Server.COLLECTIONS,Browser.COLLECTIONS,'Functions history collections must match browser history persistence');
const state={meta:{syncOwnerUid:'u1',syncTombstones:[{domain:'workouts',id:'w-deleted',explicit:true,deletedAt:'2026-09-14T12:00:00.000Z'}]},workouts:[{id:'w1',date:'2026-09-12',updatedAt:'2026-09-12T10:00:00.000Z'},{id:'w-deleted',date:'2026-09-13',updatedAt:'2026-09-13T10:00:00.000Z'}],meals:[],runs:[],body:[]};
const remote={workouts:[{id:'w1',date:'2026-09-12',updatedAt:'2026-09-14T10:00:00.000Z',name:'newer'},{id:'w2',date:'2026-09-14',updatedAt:'2026-09-14T11:00:00.000Z'}],meals:[],runs:[],body:[]};
const server=Server.mergeStateWithHistory(state,remote),browser=Browser.mergeStateWithHistory(state,remote);
assert.deepEqual(server.workouts,browser.workouts,'Functions durable-history merge must match browser semantics for stable-id/tombstone fixture');
assert.equal(Server.recordFromDoc({record:{id:'w1'}}).id,'w1');
console.log('history-boundary: PASS');
