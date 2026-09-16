'use strict';
const assert=require('node:assert/strict');
const {CONTRACT,sanitizeWantedDemoEnvelope}=require('../src/wanted-demo-boundary.cjs');

function fixture(){
 const checkins=Array.from({length:10},(_,i)=>({id:`c${i}`,date:`2026-09-${String(i+1).padStart(2,'0')}`,sleep:7,energy:4,stress:2,soreness:1,email:'drop@example.com'}));
 const meals=Array.from({length:20},(_,i)=>({id:`m${i}`,date:'2026-09-17',name:'합성 식사',kcal:500,protein:35,carbs:60,fat:12,notes:'drop me'}));
 return {contractVersion:CONTRACT,synthetic:true,state:{wantedDemo:true,meta:{createdAt:'2026-09-01T00:00:00Z',updatedAt:'2026-09-17T00:00:00Z',judgeDataset:{contractVersion:CONTRACT,synthetic:true,spanDays:14}},profile:{name:'GARANG Demo',email:'secret@example.com',goal:'퍼포먼스 향상',age:29,height:176,weight:74.2},onboarding:{goal:'퍼포먼스 향상',experience:'intermediate',weeklyFrequency:4,availableMinutes:45,preferences:'저녁 운동'},preferences:{language:'ko',unit:'metric'},checkins,meals,workouts:[{id:'w1',date:'2026-09-16',name:'스쿼트',sets:4,reps:5,weight:100,rpe:9,notes:'private'}],runs:[{id:'r1',date:'2026-09-14',distanceKm:5,durationMin:30,paceSecPerKm:360,rpe:5}],body:[{id:'b1',date:'2026-09-15',weight:74.2,bodyFat:17.8,muscleMass:33.6}],planner:[{id:'p1',date:'2026-09-16',type:'workout',title:'하체',status:'completed'}],memory:{entries:[{id:'mem1',type:'preference',key:'training_time',value:'저녁',userConfirmed:true},{id:'mem2',type:'identity',key:'email',value:'secret@example.com',userConfirmed:true}]},actionLog:[{id:'a1',action:'reduce_lower_intensity',reason:'high_soreness',at:'2026-09-17T00:00:00Z'}]}};
}

const clean=sanitizeWantedDemoEnvelope(fixture());
assert.equal(clean.wantedDemo,true);
assert.equal(clean.meta.judgeDataset.contractVersion,CONTRACT);
assert.equal(clean.profile.name,undefined);
assert.equal(clean.profile.email,undefined);
assert.equal(clean.workouts[0].notes,undefined);
assert.equal(clean.runs[0].distance,5);
assert.equal(clean.runs[0].duration,30);
assert.equal(clean.body[0].fatPercent,17.8);
assert.equal(clean.body[0].muscle,33.6);
assert.equal(clean.memory.entries.length,1);
assert.equal(JSON.stringify(clean).includes('secret@example.com'),false);
assert.equal(clean.meals.every(row=>row.source==='wanted_synthetic'),true);
assert.throws(()=>sanitizeWantedDemoEnvelope({...fixture(),contractVersion:'wrong'}),/WANTED_DEMO_CONTRACT_INVALID/);
const incomplete=fixture();incomplete.state.checkins=[];assert.throws(()=>sanitizeWantedDemoEnvelope(incomplete),/WANTED_DEMO_STATE_INCOMPLETE/);
console.log('wanted-demo-boundary: PASS');
