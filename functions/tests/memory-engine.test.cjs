'use strict';

const assert=require('node:assert/strict');
const {
 POLICY_VERSION,upsertMemory,compactMemory,selectMemory,deriveStructuredCandidates,extractExplicitCandidates,prepareMemoryContext
}=require('../src/memory-engine.cjs');

let passed=0;
function test(name,run){run();passed++;console.log(`PASS ${name}`);}
const now=new Date('2026-09-05T06:00:00.000Z');

try{
 test('same semantic key is merged instead of duplicated',()=>{
  let entries=upsertMemory([],{id:'a',type:'goal',key:'primary_goal',value:'근육 증가',importance:4,confidence:.8,userConfirmed:true,updatedAt:'2026-09-01T00:00:00.000Z'},{now});
  entries=upsertMemory(entries,{id:'b',type:'goal',key:'primary_goal',value:'근육 증가',importance:5,confidence:.95,userConfirmed:true,updatedAt:'2026-09-04T00:00:00.000Z'},{now});
  assert.equal(entries.length,1);
  assert.equal(entries[0].importance,5);
  assert.equal(entries[0].evidenceCount,2);
 });

 test('expired and deleted memories are removed',()=>{
  const entries=compactMemory([
   {id:'active',type:'note',value:'keep',userConfirmed:true},
   {id:'expired',type:'note',value:'drop expired',expiresAt:'2026-09-04T00:00:00.000Z'},
   {id:'deleted',type:'note',value:'drop deleted'}
  ],{now,deletedIds:['deleted']});
  assert.deepEqual(entries.map(x=>x.id),['active']);
 });

 test('confirmed important memory outranks weak memory',()=>{
  const selected=selectMemory([
   {id:'weak',type:'note',value:'old note',importance:1,confidence:.4,userConfirmed:true,updatedAt:'2025-01-01T00:00:00.000Z'},
   {id:'strong',type:'goal',value:'run a marathon',importance:5,confidence:.99,userConfirmed:true,updatedAt:'2026-09-04T00:00:00.000Z'}
  ],{now,limit:2});
  assert.equal(selected[0].id,'strong');
 });

 test('query relevance changes retrieval priority',()=>{
  const entries=[
   {id:'training',type:'preference',value:'I prefer morning strength training',importance:3,userConfirmed:true,updatedAt:'2026-09-04T00:00:00.000Z'},
   {id:'nutrition',type:'preference',value:'I prefer high protein meals',importance:3,userConfirmed:true,updatedAt:'2026-09-04T00:00:00.000Z'}
  ];
  assert.equal(selectMemory(entries,{query:'protein meals',now,limit:1})[0].id,'nutrition');
  assert.equal(selectMemory(entries,{query:'strength training',now,limit:1})[0].id,'training');
 });

 test('user model creates deterministic confirmed candidates',()=>{
  const candidates=deriveStructuredCandidates({profile:{goal:'체지방 감소'},userModel:{preferences:'저녁 운동',weeklyFrequency:4,availableMinutes:60,experience:'intermediate'}},{now});
  const keys=new Set(candidates.map(x=>x.key));
  for(const key of ['primary_goal','training_preferences','training_frequency_per_week','available_training_minutes','training_experience'])assert.ok(keys.has(key),key);
  assert.ok(candidates.every(x=>x.userConfirmed===true));
 });

 test('explicit Korean and English statements yield conservative candidates',()=>{
  const ko=extractExplicitCandidates('제 목표는 10km 완주입니다. 저는 저녁 운동을 선호해요.',{now});
  assert.ok(ko.some(x=>x.type==='goal'&&x.value.includes('10km')));
  assert.ok(ko.some(x=>x.type==='preference'&&x.value.includes('저녁 운동')));
  const en=extractExplicitCandidates('My goal is a sub-45 10K. I prefer morning training.',{now});
  assert.ok(en.some(x=>x.type==='goal'&&/sub-45/i.test(x.value)));
  assert.ok(en.some(x=>x.type==='preference'&&/morning training/i.test(x.value)));
 });

 test('unconfirmed memories stay out of agent context by default',()=>{
  const context=prepareMemoryContext({entries:[
   {id:'confirmed',type:'note',value:'visible',userConfirmed:true},
   {id:'pending',type:'note',value:'hidden',userConfirmed:false}
  ]},{},{now});
  assert.deepEqual(context.entries.map(x=>x.id),['confirmed']);
  assert.equal(context.meta.policyVersion,POLICY_VERSION);
 });

 test('structured user goal is available without exposing a Memory UI',()=>{
  const context=prepareMemoryContext({entries:[]},{profile:{goal:'Performance improvement'},userModel:{preferences:'Avoid knee impact'}},{now,query:'goal'});
  assert.ok(context.entries.some(x=>x.key==='primary_goal'));
  assert.ok(context.entries.some(x=>x.key==='training_preferences'));
  assert.equal(context.meta.queryAware,true);
 });

 console.log(`${passed} memory engine tests passed`);
}catch(error){console.error(error);process.exitCode=1;}
