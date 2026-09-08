'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Core=require('../06_features/ui/runtime/garang-core-loop-v1.js');

const state={
 planner:[
  {id:'p1',date:'2026-09-09',title:'Lower',completed:true},
  {id:'p2',date:'2026-09-09',title:'Walk',completed:false}
 ],
 workouts:[{id:'w1',date:'2026-09-08',name:'Squat',sets:3,reps:5,weight:80,rpe:8,duration:45}],
 meals:[{id:'m1',date:'2026-09-08',name:'Chicken bowl',kcal:700,protein:48,items:[{name:'Chicken',grams:180,kcal:330,protein:45,carbs:0,fat:8}]}],
 runs:[{id:'r1',date:'2026-09-07',distance:5.2,duration:30}],
 body:[{id:'b1',date:'2026-08-20',weight:70,fatPercent:15},{id:'b2',date:'2026-09-08',weight:69.2,fatPercent:14.5}],
 checkins:[{id:'c1',date:'2026-09-08',sleep:7.2,energy:4}],
 memory:{entries:[]},preferences:{language:'ko'}
};

const today=Core.deriveToday(state,{date:'2026-09-09',lang:'ko'});
assert.equal(today.plans,2);assert.equal(today.done,1);assert.equal(today.completion,50);assert.match(today.headline,/남은 계획/);
const recent=Core.deriveRecent(state,{lang:'ko'});
assert.deepEqual(recent.map(x=>x.route),['workout','nutrition','running','body']);
assert.equal(recent[0].payload.name,'Squat');assert.equal(recent[1].payload.name,'Chicken');
const actions=Core.deriveCoachActions(state,{date:'2026-09-09',lang:'ko'});
assert.ok(actions.some(x=>x.id==='adjust'));assert.ok(actions.some(x=>x.id==='nutrition'));assert.ok(actions.every(x=>x.prompt.length>10));
const accumulation=Core.deriveAccumulation(state,{date:'2026-09-09',days:30,lang:'ko'});
assert.equal(accumulation.workouts,1);assert.equal(accumulation.runs,1);assert.equal(accumulation.totalDistance,5.2);assert.equal(accumulation.bodyDelta,-0.8);assert.ok(accumulation.rhythm.length===7);

const source=fs.readFileSync(path.join(__dirname,'../06_features/ui/runtime/garang-core-loop-v1.js'),'utf8');
for(const forbidden of ['localStorage.setItem','firebase.firestore','applyWrite('])assert.equal(source.includes(forbidden),false,`core loop must stay write-free: ${forbidden}`);
assert.match(source,/g2-composer textarea/,'Coach actions must use canonical composer');
assert.match(source,/GarangRouter\?\.navigate/,'Record reuse must route through canonical Router');
console.log('core-loop-v1: PASS');
