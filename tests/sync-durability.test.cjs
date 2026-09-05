'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Sync=require('../02_core/sync-durability.js');
const root=path.resolve(__dirname,'..');
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};
const base=(overrides={})=>({
 meta:{schemaVersion:5,updatedAt:'2026-09-05T10:00:00.000Z',syncRevision:1,syncOwnerUid:'u1'},
 profile:{goal:'performance'},onboarding:{goal:'performance'},preferences:{language:'ko',unit:'metric'},
 workouts:[],meals:[],runs:[],body:[],planner:[],checkins:[],aiChat:[],
 memory:{entries:[],facts:[],preferences:[],goals:[],events:[],deletedIds:[]},actionLog:[],errors:[],analytics:{events:[]},...overrides
});

test('cloud/local merge preserves unique records from both sides',()=>{
 const local=base({workouts:[{id:'l1',name:'local',updatedAt:'2026-09-05T09:00:00Z'}]});
 const remote=base({meta:{...base().meta,updatedAt:'2026-09-05T10:01:00Z',syncRevision:2},workouts:[{id:'r1',name:'remote',updatedAt:'2026-09-05T09:30:00Z'}]});
 const merged=Sync.mergeActiveStates(local,remote,{ownerUid:'u1',clock:Date.parse('2026-09-05T10:02:00Z')});
 assert.deepEqual(new Set(merged.workouts.map(x=>x.id)),new Set(['l1','r1']));
});

test('same record resolves by record updatedAt rather than whole-state timestamp',()=>{
 const local=base({meta:{...base().meta,updatedAt:'2026-09-05T10:05:00Z'},workouts:[{id:'w1',name:'new-local',updatedAt:'2026-09-05T10:04:00Z'}]});
 const remote=base({meta:{...base().meta,updatedAt:'2026-09-05T10:06:00Z'},workouts:[{id:'w1',name:'old-remote',updatedAt:'2026-09-05T10:03:00Z'}]});
 assert.equal(Sync.mergeActiveStates(local,remote,{ownerUid:'u1'}).workouts[0].name,'new-local');
});

test('local deletion creates tombstone and remote stale copy cannot resurrect',()=>{
 const previous=base({workouts:[{id:'w1',name:'delete-me',updatedAt:'2026-09-05T09:00:00Z'}]});
 const next=base({meta:{...base().meta,updatedAt:'2026-09-05T10:10:00Z'},workouts:[]});
 const hardened=Sync.withLocalMetadata(previous,next,{ownerUid:'u1',deviceId:'d1',clock:Date.parse('2026-09-05T10:10:00Z')});
 assert.ok(hardened.meta.syncTombstones.some(x=>x.domain==='workouts'&&x.id==='w1'));
 const remote=base({workouts:[{id:'w1',name:'stale',updatedAt:'2026-09-05T09:30:00Z'}]});
 const merged=Sync.mergeActiveStates(hardened,remote,{ownerUid:'u1',clock:Date.parse('2026-09-05T10:11:00Z')});
 assert.equal(merged.workouts.length,0);
});

test('memory deletion also stays deleted across merge',()=>{
 const previous=base({memory:{entries:[{id:'m1',type:'goal',key:'g',value:'x',updatedAt:'2026-09-05T09:00:00Z'}],facts:[],preferences:[],goals:[],events:[],deletedIds:[]}});
 const next=base({memory:{entries:[],facts:[],preferences:[],goals:[],events:[],deletedIds:[]}});
 const hardened=Sync.withLocalMetadata(previous,next,{ownerUid:'u1',clock:Date.parse('2026-09-05T11:00:00Z')});
 const remote=base({memory:{entries:[{id:'m1',type:'goal',key:'g',value:'old',updatedAt:'2026-09-05T09:30:00Z'}],facts:[],preferences:[],goals:[],events:[],deletedIds:[]}});
 assert.equal(Sync.mergeActiveStates(hardened,remote,{ownerUid:'u1',clock:Date.parse('2026-09-05T11:01:00Z')}).memory.entries.length,0);
});

test('account owner mismatch is blocked before merge or write metadata',()=>{
 assert.throws(()=>Sync.mergeActiveStates(base(),base({meta:{...base().meta,syncOwnerUid:'u2'}}),{ownerUid:'u1'}),/SYNC_OWNER_MISMATCH/);
 assert.throws(()=>Sync.withLocalMetadata(base(),base({meta:{...base().meta,syncOwnerUid:'u2'}}),{ownerUid:'u1'}),/SYNC_OWNER_MISMATCH/);
});

test('local metadata increments revision and preserves a device marker',()=>{
 const out=Sync.withLocalMetadata(base(),base(),{ownerUid:'u1',deviceId:'device-A',clock:Date.parse('2026-09-05T12:00:00Z')});
 assert.equal(out.meta.syncRevision,2);assert.equal(out.meta.syncOwnerUid,'u1');assert.equal(out.meta.syncDeviceId,'device-A');
});

test('cloud compaction keeps newest bounded records without mutating input',()=>{
 const workouts=Array.from({length:360},(_,i)=>({id:`w${i}`,updatedAt:new Date(Date.parse('2026-01-01T00:00:00Z')+i*1000).toISOString()}));
 const state=base({workouts});const compact=Sync.compactForCloud(state);
 assert.equal(compact.workouts.length,350);assert.equal(compact.workouts.at(-1).id,'w359');assert.equal(state.workouts.length,360);
});

test('retry backoff grows and is capped at one minute',()=>{
 assert.equal(Sync.retryDelay(0),1200);assert.equal(Sync.retryDelay(1),2400);assert.equal(Sync.retryDelay(10),60000);
});

test('verified export envelope detects count corruption',()=>{
 const envelope=Sync.createExportEnvelope(base({meals:[{id:'meal1'}]}),{scope:'authenticated',exportedAt:'2026-09-05T12:00:00Z'});
 assert.equal(Sync.verifyExportEnvelope(envelope),true);envelope.manifest.counts.meals=99;assert.equal(Sync.verifyExportEnvelope(envelope),false);
});

test('live runtime sanitizes state before app and never captures unrelated taps',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),runtime=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-sync-durability-v1.js'),'utf8'),sw=fs.readFileSync(path.join(root,'02_core/sw-runtime.js'),'utf8');
 const syncCore=html.indexOf('./02_core/sync-durability.js'),sanitizer=html.indexOf('./06_features/ui/runtime/garang-state-sanitizer-v1.js'),syncRuntime=html.indexOf('./06_features/ui/runtime/garang-sync-durability-v1.js'),agentHook=html.indexOf('./06_features/final/agent-state-hook-v1.js'),app=html.indexOf('./01_app/app.js');
 assert.ok(syncCore>0&&sanitizer>syncCore&&sanitizer<syncRuntime&&syncRuntime<agentHook&&agentHook<app);
 for(const token of ['runTransaction','STALE_ACCOUNT_WRITE','STALE_ACCOUNT_READ','navigator.onLine','garang_sync_pending_v1::','syncTombstones','exportVerifiedBackup','safeCloudState(snapshot.data(),uid)'])assert.ok(runtime.includes(token),token);
 assert.equal(runtime.includes('stopImmediatePropagation'),false,'sync runtime must not swallow app taps');
 for(const token of ['./02_core/sync-durability.js','./06_features/ui/runtime/garang-state-sanitizer-v1.js','./06_features/ui/runtime/garang-sync-durability-v1.js',"const CACHE='garang-"])assert.ok(sw.includes(token),token);
});

console.log(`${passed} sync durability tests passed`);
