'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const History=require('../02_core/lifetime-history.js');
const root=path.resolve(__dirname,'..');
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};
const state=(overrides={})=>({
 meta:{schemaVersion:5,updatedAt:'2026-09-06T00:00:00.000Z',syncTombstones:[]},
 workouts:[],meals:[],...overrides
});

test('history collections are account scoped and stable',()=>{
 assert.equal(History.ownerFromKey('garang_user_user-1_v3'),'user-1');
 assert.equal(History.collectionFor('workouts'),'workoutHistory');
 assert.equal(History.collectionFor('meals'),'mealHistory');
 assert.equal(History.isStateKey('garang_demo_state_v3'),false);
});

test('archive restore keeps workout and meal records beyond snapshot limits',()=>{
 const archivedWorkouts=Array.from({length:420},(_,i)=>({id:`w${i}`,name:`workout-${i}`,updatedAt:new Date(Date.parse('2026-01-01T00:00:00Z')+i*1000).toISOString()}));
 const archivedMeals=Array.from({length:410},(_,i)=>({id:`m${i}`,name:`meal-${i}`,updatedAt:new Date(Date.parse('2026-02-01T00:00:00Z')+i*1000).toISOString()}));
 const current=state({workouts:archivedWorkouts.slice(-350),meals:archivedMeals.slice(-350)});
 const merged=History.mergeStateWithHistory(current,{workouts:archivedWorkouts,meals:archivedMeals});
 assert.equal(merged.workouts.length,420);assert.equal(merged.meals.length,410);
 assert.equal(merged.workouts[0].id,'w0');assert.equal(merged.meals[0].id,'m0');
});

test('explicit tombstone prevents archived record resurrection',()=>{
 const deletedAt='2026-09-06T01:00:00.000Z';
 const current=state({meta:{schemaVersion:5,updatedAt:deletedAt,syncTombstones:[{domain:'workouts',id:'w1',deletedAt}]}});
 const merged=History.mergeStateWithHistory(current,{workouts:[{id:'w1',name:'old',updatedAt:'2026-09-05T01:00:00.000Z'}]});
 assert.equal(merged.workouts.length,0);
});

test('archive diff mirrors new records and explicit deletions only',()=>{
 const before=state({workouts:[{id:'w1',name:'bench',updatedAt:'2026-09-06T00:00:00.000Z'}]});
 const after=state({meals:[{id:'m1',name:'rice',updatedAt:'2026-09-06T01:00:00.000Z'}],meta:{schemaVersion:5,updatedAt:'2026-09-06T01:00:00.000Z',syncTombstones:[{domain:'workouts',id:'w1',deletedAt:'2026-09-06T01:00:00.000Z'}]}});
 const diff=History.diffForArchive(before,after);
 assert.deepEqual(diff.upserts.map(x=>`${x.domain}:${x.record.id}`),['meals:m1']);
 assert.deepEqual(diff.deletes.map(x=>`${x.domain}:${x.id}`),['workouts:w1']);
});

test('archive payload preserves original record and account owner',()=>{
 const payload=History.archivePayload('meals',{id:'m1',name:'protein',date:'2026-09-06'},'u1',{archivedAt:'2026-09-06T02:00:00.000Z'});
 assert.equal(payload.ownerUid,'u1');assert.equal(payload.domain,'meals');assert.equal(payload.record.id,'m1');
 assert.equal(History.hydrateArchiveDoc(payload).name,'protein');
});

test('runtime is wired before app state capture and PWA shell caches it',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'02_core/sw-runtime.js'),'utf8'),runtime=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-lifetime-history-v1.js'),'utf8');
 const core=html.indexOf('./02_core/lifetime-history.js'),historyRuntime=html.indexOf('./06_features/ui/runtime/garang-lifetime-history-v1.js'),agent=html.indexOf('./06_features/final/agent-state-hook-v1.js'),app=html.indexOf('./01_app/app.js');
 assert.ok(core>0&&historyRuntime>core&&historyRuntime<agent&&agent<app);
 for(const token of ['workoutHistory','mealHistory','batch.commit','mergeStateWithHistory','syncTombstones','backfillIfNeeded','#logoutBtn,#settingsLogout','stopImmediatePropagation','return flush(uid)'])assert.ok(runtime.includes(token),token);
 for(const token of ['./02_core/lifetime-history.js','./06_features/ui/runtime/garang-lifetime-history-v1.js'])assert.ok(sw.includes(token),token);
});

console.log(`${passed} lifetime history tests passed`);
