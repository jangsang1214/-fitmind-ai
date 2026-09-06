'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const History=require('../02_core/history-persistence-v2.js');
const Sync=require('../02_core/sync-durability.js');
const runtimePath=path.join(root,'06_features/ui/runtime/garang-data-migration-v2.js'),runtime=fs.readFileSync(runtimePath,'utf8');

for(const token of ["const PROTECTED=Object.freeze(['workouts','meals','runs','body'])",'recoverySnapshots','garang_state_backup_v3::','garang_cloud_recovery_backup_v3::','garang_recovery_backup_v3::','guardedPersistHistory','History.rowStamp(item.remote)>History.rowStamp(item.local)','데이터 복구 확인','누락 기록 안전 복구','계정 미확인 구버전 검토','item?.trusted===false&&!includeUnverified'])assert.ok(runtime.includes(token),`missing recovery contract: ${token}`);
assert.equal(runtime.includes('구버전 로컬 데이터를 찾지 못했습니다.'),false,'recovery UX must not equate one missing legacy key with missing user history');
assert.ok(runtime.includes('const active=activeKey()')&&runtime.includes('key===active||key===LEGACY_KEY'),'local scan must include active state and the legacy key');
assert.ok(runtime.includes('return key.includes(active)'),'same-account backup filtering must be present');
assert.ok(runtime.includes("const trusted=!!owner&&owner===String(u)"),'authenticated legacy data must require owner proof before automatic recovery');

const storage=new Map();
const localStorage={get length(){return storage.size;},key(i){return [...storage.keys()][i]||null;},getItem(k){return storage.has(k)?storage.get(k):null;},setItem(k,v){storage.set(String(k),String(v));},removeItem(k){storage.delete(k);}};
const window={GarangStateSanitizer:{sanitizeState:v=>JSON.parse(JSON.stringify(v))},GarangSyncDurability:Sync,GarangHistoryPersistence:History,addEventListener(){},firebase:null,confirm:()=>false};
const document={getElementById(){return null;},querySelector(){return null;},createElement(){throw new Error('UI creation not expected in pure recovery merge test');},body:{appendChild(){}}};
const context={window,document,localStorage,MutationObserver:function(){this.observe=()=>{};},setTimeout(){return 0;},clearTimeout(){},console,JSON,Date,Math,Object,Array,String,Number,Map,Set,Promise,encodeURIComponent,confirm:()=>false,location:{reload(){}}};
vm.createContext(context);vm.runInContext(runtime,context,{filename:'garang-data-migration-v2.js'});
const Recovery=window.GarangDataMigrationV2;assert.ok(Recovery&&Recovery.version==='v3.1');
const current={meta:{schemaVersion:5,syncTombstones:[{domain:'workouts',id:'w1',deletedAt:'2040-01-01T00:00:00Z'}]},workouts:[],meals:[],runs:[],body:[]};
const backup={meta:{schemaVersion:5},workouts:[{id:'w1',date:'2026-08-01',name:'Bench'}],meals:[{id:'m1',date:'2026-08-01',name:'Meal'}],runs:[],body:[]};
const cloudHistory={workouts:[{id:'w2',date:'2026-08-02',name:'Squat'}],meals:[],runs:[{id:'r1',date:'2026-08-03',distance:5}],body:[]};
const trustedMerged=Recovery.combineHistory(current,[{state:backup,trusted:true}],cloudHistory,null),trustedCounts=Recovery.counts(trustedMerged);
assert.equal(trustedCounts.workouts,2,'trusted recovery sources must restore unique workout records');
assert.equal(trustedCounts.meals,1);assert.equal(trustedCounts.runs,1);assert.equal(trustedCounts.body,0);
assert.equal(trustedMerged.workouts.some(x=>x.id==='w1'),true,'legacy inferred tombstone must not block recovery');
assert.equal(current.workouts.length,0,'recovery preview must not mutate current state');

const unverified=Recovery.combineHistory(current,[{state:backup,trusted:false}],cloudHistory,'u1');
const unverifiedCounts=Recovery.counts(unverified);
assert.equal(unverifiedCounts.workouts,1,'unverified legacy records must stay out of automatic recovery');
assert.equal(unverifiedCounts.meals,0,'unverified legacy meal records must stay out of automatic recovery');
const explicitlyIncluded=Recovery.combineHistory(current,[{state:backup,trusted:false}],cloudHistory,'u1',{includeUnverified:true});
assert.equal(Recovery.counts(explicitlyIncluded).workouts,2,'explicit user review may include unowned legacy data');
assert.equal(Recovery.counts(explicitlyIncluded).meals,1);
console.log('data-recovery-v3: PASS');
