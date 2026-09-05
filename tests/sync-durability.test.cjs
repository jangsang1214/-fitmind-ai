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

test('state sanitizer removes malformed persisted rows without deleting valid records',()=>{
 const dirty={...base(),workouts:[null,'bad',{id:'w1'}],meals:[null,{id:'m1'}],checkins:[false,{id:'c1'}],memory:null,analytics:null,profile:'bad'};
 const safe=Sync.sanitizeState(dirty,{ownerUid:'u1'});
 assert.deepEqual(safe.workouts.map(x=>x.id),['w1']);
 assert.deepEqual(safe.meals.map(x=>x.id),['m1']);
 assert.deepEqual(safe.checkins.map(x=>x.id),['c1']);
 assert.deepEqual(safe.memory.entries,[]);assert.deepEqual(safe.analytics.events,[]);assert.equal(safe.profile,null);
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

test('malformed cloud rows are filtered before they can poison live state',()=>{
 const local=base({workouts:[{id:'local-ok'}]});
 const remote=base({meta:{...base().meta,updatedAt:'2026-09-05T10:06:00Z'},workouts:[null,{id:'remote-ok'}],meals:[null,{id:'meal-ok'}],memory:null,analytics:null});
 const merged=Sync.mergeActiveStates(local,remote,{ownerUid:'u1'});
 assert.deepEqual(new Set(merged.workouts.map(x=>x.id)),new Set(['local-ok','remote-ok']));
 assert.deepEqual(merged.meals.map(x=>x.id),['meal-ok']);
 assert.ok(merged.memory&&Array.isArray(merged.memory.entries));assert.ok(merged.analytics&&Array.isArray(merged.analytics.events));
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

test('boot safety runs before sync runtime and app while interaction guard is active',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),boot=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-boot-safety-v1.js'),'utf8'),css=fs.readFileSync(path.join(root,'03_styles/runtime/garang-interaction-safety-v1.css'),'utf8');
 const core=html.indexOf('./02_core/sync-durability.js'),bootIndex=html.indexOf('./06_features/ui/runtime/garang-boot-safety-v1.js'),syncRuntime=html.indexOf('./06_features/ui/runtime/garang-sync-durability-v1.js'),app=html.indexOf('./01_app/app.js');
 assert.ok(core>0&&bootIndex>core&&bootIndex<syncRuntime&&syncRuntime<app);
 for(const token of ['repairAll','invalid_json','invalid_shape','navigationReady'])assert.ok(boot.includes(token),token);
 assert.ok(css.includes('#menuBtn.icon-btn'));assert.ok(css.includes('display:grid!important'));
});

test('live runtime is wired before agent state hook and protects sync boundaries',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),runtime=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-sync-durability-v1.js'),'utf8'),sw=fs.readFileSync(path.join(root,'02_core/sw-runtime.js'),'utf8');
 const syncCore=html.indexOf('./02_core/sync-durability.js'),syncRuntime=html.indexOf('./06_features/ui/runtime/garang-sync-durability-v1.js'),agentHook=html.indexOf('./06_features/final/agent-state-hook-v1.js'),app=html.indexOf('./01_app/app.js');
 assert.ok(syncCore>0&&syncRuntime>syncCore&&syncRuntime<agentHook&&agentHook<app);
 for(const token of ['runTransaction','STALE_ACCOUNT_WRITE','STALE_ACCOUNT_READ','navigator.onLine','garang_sync_pending_v1::','syncTombstones','exportVerifiedBackup','stopImmediatePropagation'])assert.ok(runtime.includes(token),token);
 for(const token of ['./02_core/sync-durability.js','./06_features/ui/runtime/garang-boot-safety-v1.js','./03_styles/runtime/garang-interaction-safety-v1.css','./06_features/ui/runtime/garang-sync-durability-v1.js',"const CACHE='garang-"])assert.ok(sw.includes(token),token);
});

console.log(`${passed} sync durability tests passed`);
