'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const History=require('../02_core/history-persistence-v2.js');
const Sync=require('../02_core/sync-durability.js');
const runtimePath=path.join(root,'06_features/ui/runtime/garang-data-migration-v2.js');
const runtime=fs.readFileSync(runtimePath,'utf8');

for(const token of [
  "const VERSION='v4.0.0'",
  "const PROTECTED=Object.freeze(['workouts','meals','runs','body'])",
  'recoverySnapshots','garang_state_backup_v3::','garang_cloud_recovery_backup_v3::','garang_recovery_backup_v3::',
  'guardedPersistHistory','History.rowStamp(item.remote)>History.rowStamp(item.local)',
  '데이터 복구 확인','누락 기록 안전 복구','data-confirming','yieldToUI','scanGeneration','guardedAwait','cancelActiveScan','scanActive',
  'CLOUD_PAGE_SIZE=60','readHistoryCollection','startAfter(cursor)','PROCESS_YIELD_EVERY','MERGE_YIELD_EVERY',
  'isTouchWebKit','placeSurface','data-garang-webkit-flow'
])assert.ok(runtime.includes(token),`missing recovery contract: ${token}`);

assert.equal(runtime.includes('구버전 로컬 데이터를 찾지 못했습니다.'),false,'recovery UX must not equate one missing legacy key with missing user history');
assert.equal(runtime.includes('window.confirm('),false,'recovery must not use a blocking native confirmation dialog');
assert.equal(runtime.includes('Promise.race(['),false,'scan cancellation must not leave a rejected race branch attached to a late Firestore read');
assert.equal(runtime.includes('MutationObserver'),false,'single recovery owner must not observe and relocate its own DOM');
assert.equal(runtime.includes("document.documentElement.classList.add('garang-recovery-open')"),false,'recovery must not mutate global html touch/scroll state');
assert.equal(runtime.includes('html.garang-recovery-open,html.garang-recovery-open body{overflow:hidden'),false,'recovery must never globally lock iOS document scrolling');
assert.ok(runtime.includes('const active=activeKey()')&&runtime.includes('key===active||key===LEGACY_KEY'),'local scan must include active state and legacy key');
assert.ok(runtime.includes('return key.includes(active)'),'same-account backup filtering must be present');
assert.ok(runtime.includes("user.collection('app').doc('state').get()"),'cloud state must be scanned by the recovery owner');
assert.ok(runtime.includes('query=query.limit(CLOUD_PAGE_SIZE)'),'long-lived cloud history must use bounded Firestore pages');

const storage=new Map();
const localStorage={get length(){return storage.size;},key(i){return [...storage.keys()][i]||null;},getItem(k){return storage.has(k)?storage.get(k):null;},setItem(k,v){storage.set(String(k),String(v));},removeItem(k){storage.delete(k);}};
const window={GarangStateSanitizer:{sanitizeState:v=>JSON.parse(JSON.stringify(v))},GarangSyncDurability:Sync,GarangHistoryPersistence:History,addEventListener(){},firebase:null};
const document={
  getElementById(){return null;},querySelector(){return null;},
  createElement(){throw new Error('UI creation not expected in pure recovery merge test');},
  addEventListener(){},head:{appendChild(){}},body:{appendChild(){}}
};
const deferred=[];
const context={window,document,localStorage,
  setTimeout(fn){if(fn?.name==='start')return 0;deferred.push(fn);Promise.resolve().then(()=>fn());return deferred.length;},
  clearTimeout(){},requestAnimationFrame(){return 0;},console,JSON,Date,Math,Object,Array,String,Number,Map,Set,Promise,encodeURIComponent,location:{reload(){}}
};
vm.createContext(context);vm.runInContext(runtime,context,{filename:'garang-data-migration-v2.js'});

(async()=>{
  const Recovery=window.GarangDataMigrationV2;
  assert.ok(Recovery&&Recovery.version==='v4.0.0');
  const current={meta:{schemaVersion:5,syncTombstones:[{domain:'workouts',id:'w1',deletedAt:'2040-01-01T00:00:00Z'}]},workouts:[],meals:[],runs:[],body:[]};
  const backup={meta:{schemaVersion:5},workouts:[{id:'w1',date:'2026-08-01',name:'Bench'}],meals:[{id:'m1',date:'2026-08-01',name:'Meal'}],runs:[],body:[]};
  const cloudHistory={workouts:[{id:'w2',date:'2026-08-02',name:'Squat'}],meals:[],runs:[{id:'r1',date:'2026-08-03',distance:5}],body:[]};
  const merged=await Recovery.combineHistory(current,[{state:backup}],cloudHistory,null),result=Recovery.counts(merged);
  assert.equal(result.workouts,2,'recovery merge must restore unique workout records across backups and durable history');
  assert.equal(result.meals,1);assert.equal(result.runs,1);assert.equal(result.body,0);
  assert.equal(merged.workouts.some(x=>x.id==='w1'),true,'legacy inferred tombstone must not block recovery');
  assert.equal(current.workouts.length,0,'recovery preview must not mutate current state');
  console.log('data-recovery-v4: PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
