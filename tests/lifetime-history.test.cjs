'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const History=require('../02_core/lifetime-history.js');
const root=path.resolve(__dirname,'..');
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};
const state=(overrides={})=>({meta:{schemaVersion:5,updatedAt:'2026-09-06T00:00:00.000Z',syncTombstones:[]},workouts:[],meals:[],...overrides});

test('history core keeps account scoped collection mapping',()=>{
 assert.equal(History.ownerFromKey('garang_user_user-1_v3'),'user-1');
 assert.equal(History.collectionFor('workouts'),'workoutHistory');
 assert.equal(History.collectionFor('meals'),'mealHistory');
});

test('history core can merge records beyond snapshot limits',()=>{
 const workouts=Array.from({length:420},(_,i)=>({id:`w${i}`,updatedAt:new Date(Date.parse('2026-01-01T00:00:00Z')+i*1000).toISOString()}));
 const meals=Array.from({length:410},(_,i)=>({id:`m${i}`,updatedAt:new Date(Date.parse('2026-02-01T00:00:00Z')+i*1000).toISOString()}));
 const merged=History.mergeStateWithHistory(state({workouts:workouts.slice(-350),meals:meals.slice(-350)}),{workouts,meals});
 assert.equal(merged.workouts.length,420);assert.equal(merged.meals.length,410);
});

test('explicit tombstone still prevents resurrection',()=>{
 const deletedAt='2026-09-06T01:00:00.000Z';
 const current=state({meta:{schemaVersion:5,updatedAt:deletedAt,syncTombstones:[{domain:'workouts',id:'w1',deletedAt}]}});
 assert.equal(History.mergeStateWithHistory(current,{workouts:[{id:'w1',updatedAt:'2026-09-05T01:00:00.000Z'}]}).workouts.length,0);
});

test('live boot stays isolated from lifetime-history experimental runtime',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'02_core/sw-runtime.js'),'utf8');
 const runtime=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-lifetime-history-v1.js'),'utf8');
 assert.ok(html.includes('id="menuBtn"'),'hamburger/menu button must exist in markup');
 assert.ok(html.includes('./01_app/app.js'),'main app runtime must stay wired');
 for(const forbidden of ['./02_core/lifetime-history.js','./06_features/ui/runtime/garang-lifetime-history-v1.js','./06_features/ui/runtime/garang-boot-safety-v1.js','./03_styles/runtime/garang-interaction-safety-v1.css']){
   assert.equal(html.includes(forbidden),false,`${forbidden} must stay out of UI boot path`);
   assert.equal(sw.includes(forbidden),false,`${forbidden} must stay out of service-worker shell`);
 }
 for(const forbidden of ['setInterval(','location.reload','onAuthStateChanged','firebase.firestore','Storage.prototype','stopImmediatePropagation'])assert.equal(runtime.includes(forbidden),false,forbidden);
 assert.ok(runtime.includes('disabled:true'));
 assert.ok(/const CACHE='garang-[^']+';/.test(sw),'service worker must keep a versioned GARANG cache without pinning one obsolete version');
});

console.log(`${passed} lifetime history/recovery tests passed`);
