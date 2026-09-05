'use strict';

const assert=require('node:assert/strict');
const {
 POLICY_VERSION,MEMORY_CLASSES,upsertMemory,compactMemory,selectMemory,deriveStructuredCandidates,extractExplicitCandidates,prepareMemoryContext,resolveConflicts,diagnostics
}=require('../src/memory-engine.cjs');

let passed=0;
function test(name,run){run();passed++;console.log(`PASS ${name}`);}
const now=new Date('2026-09-05T06:00:00.000Z');

try{
 test('stage 1 contract exposes five canonical memory classes',()=>{
  assert.equal(POLICY_VERSION,'memory-intelligence-v1');
  assert.deepEqual([...MEMORY_CLASSES],['episodic','semantic','procedural','preference','state']);
 });

 test('same semantic value is merged instead of duplicated',()=>{
  let entries=upsertMemory([],{id:'a',memoryClass:'semantic',type:'goal',key:'primary_goal',value:'근육 증가',importance:4,confidence:.8,userConfirmed:true,updatedAt:'2026-09-01T00:00:00.000Z'},{now});
  entries=upsertMemory(entries,{id:'b',memoryClass:'semantic',type:'goal',key:'primary_goal',value:'근육 증가',importance:5,confidence:.95,userConfirmed:true,updatedAt:'2026-09-04T00:00:00.000Z'},{now});
  assert.equal(entries.length,1);assert.equal(entries[0].importance,5);assert.equal(entries[0].evidenceCount,2);assert.equal(entries[0].status,'active');
 });

 test('changed semantic value preserves temporal history instead of overwriting it',()=>{
  let entries=upsertMemory([],{id:'old',memoryClass:'semantic',type:'goal',key:'primary_goal',value:'체중 감량',userConfirmed:true,observedAt:'2026-08-01T00:00:00Z',updatedAt:'2026-08-01T00:00:00Z'},{now});
  entries=upsertMemory(entries,{id:'new',memoryClass:'semantic',type:'goal',key:'primary_goal',value:'근육 증가',userConfirmed:true,observedAt:'2026-09-04T00:00:00Z',updatedAt:'2026-09-04T00:00:00Z'},{now});
  assert.equal(entries.length,2);const active=entries.find(x=>x.status==='active'),history=entries.find(x=>x.status==='superseded');
  assert.equal(active.value,'근육 증가');assert.equal(history.value,'체중 감량');assert.equal(history.supersededBy,active.id);assert.ok(history.validTo);
 });

 test('explicit user confirmation outranks a newer unconfirmed conflict',()=>{
  const entries=resolveConflicts([
   {id:'confirmed',type:'preference',key:'training_time',value:'morning',userConfirmed:true,observedAt:'2026-09-01T00:00:00Z'},
   {id:'guess',type:'preference',key:'training_time',value:'evening',userConfirmed:false,observedAt:'2026-09-04T00:00:00Z'}
  ],{now});
  assert.equal(entries.find(x=>x.status==='active').id,'confirmed');
 });

 test('expired and deleted memories stay out of active context',()=>{
  const entries=compactMemory([
   {id:'active',type:'note',value:'keep',userConfirmed:true},
   {id:'expired',type:'note',key:'expired',value:'drop expired',expiresAt:'2026-09-04T00:00:00.000Z'},
   {id:'deleted',type:'note',key:'deleted',value:'drop deleted'}
  ],{now,deletedIds:['deleted'],includeHistory:false});
  assert.deepEqual(entries.map(x=>x.id),['active']);
 });

 test('confirmed important memory outranks weak memory',()=>{
  const selected=selectMemory([
   {id:'weak',type:'note',key:'weak',value:'old note',importance:1,confidence:.4,userConfirmed:true,updatedAt:'2025-01-01T00:00:00.000Z'},
   {id:'strong',type:'goal',key:'goal',value:'run a marathon',importance:5,confidence:.99,utility:1,userConfirmed:true,updatedAt:'2026-09-04T00:00:00.000Z'}
  ],{now,limit:2});assert.equal(selected[0].id,'strong');
 });

 test('query relevance changes retrieval priority and suppresses irrelevant memory',()=>{
  const entries=[
   {id:'training',type:'preference',key:'training',value:'I prefer morning strength training',importance:3,userConfirmed:true,updatedAt:'2026-09-04T00:00:00.000Z'},
   {id:'nutrition',type:'preference',key:'nutrition',value:'I prefer high protein meals',importance:3,userConfirmed:true,updatedAt:'2026-09-04T00:00:00.000Z'}
  ];assert.equal(selectMemory(entries,{query:'protein meals',now,limit:1})[0].id,'nutrition');assert.equal(selectMemory(entries,{query:'strength training',now,limit:1})[0].id,'training');
 });

 test('context budget prevents memory payload from growing without bound',()=>{
  const entries=Array.from({length:20},(_,i)=>({id:`m${i}`,type:'note',key:`k${i}`,value:`memory ${i} ${'x'.repeat(180)}`,importance:3,userConfirmed:true,updatedAt:'2026-09-04T00:00:00Z'}));
  const selected=selectMemory(entries,{query:'memory',now,limit:20,budgetChars:800});assert.ok(selected.length<20);assert.ok(selected.length>=1);
 });

 test('user model creates deterministic typed candidates',()=>{
  const candidates=deriveStructuredCandidates({profile:{goal:'체지방 감소'},userModel:{preferences:'저녁 운동',weeklyFrequency:4,availableMinutes:60,experience:'intermediate'},preferences:{language:'ko',unit:'metric'}},{now});
  const keys=new Set(candidates.map(x=>x.key));for(const key of ['primary_goal','training_preferences','training_frequency_per_week','available_training_minutes','training_experience','language','unit_system'])assert.ok(keys.has(key),key);
  assert.ok(candidates.every(x=>x.userConfirmed===true));assert.ok(candidates.some(x=>x.memoryClass==='procedural'));
 });

 test('explicit Korean and English statements yield conservative candidates',()=>{
  const ko=extractExplicitCandidates('제 목표는 10km 완주입니다. 저는 저녁 운동을 선호해요.',{now});assert.ok(ko.some(x=>x.type==='goal'&&x.value.includes('10km')));assert.ok(ko.some(x=>x.type==='preference'&&x.value.includes('저녁 운동')));
  const en=extractExplicitCandidates('My goal is a sub-45 10K. I prefer morning training.',{now});assert.ok(en.some(x=>x.type==='goal'&&/sub-45/i.test(x.value)));assert.ok(en.some(x=>x.type==='preference'&&/morning training/i.test(x.value)));
 });

 test('unconfirmed memories stay out of agent context by default',()=>{
  const context=prepareMemoryContext({entries:[{id:'confirmed',type:'note',key:'c',value:'visible',userConfirmed:true},{id:'pending',type:'note',key:'p',value:'hidden',userConfirmed:false}]},{},{now});
  assert.ok(context.entries.some(x=>x.id==='confirmed'));assert.ok(!context.entries.some(x=>x.id==='pending'));assert.equal(context.meta.policyVersion,POLICY_VERSION);
 });

 test('structured current goal supersedes old stored goal while history is counted',()=>{
  const context=prepareMemoryContext({entries:[{id:'old',memoryClass:'semantic',type:'goal',key:'primary_goal',value:'Weight loss',userConfirmed:true,observedAt:'2026-08-01T00:00:00Z'}]},{profile:{goal:'Performance improvement'}},{now,query:'goal'});
  assert.ok(context.entries.some(x=>x.key==='primary_goal'&&x.value==='Performance improvement'));assert.ok(!context.entries.some(x=>x.value==='Weight loss'));assert.ok(context.meta.historyCount>=1);
 });

 test('diagnostics reports active/history distribution without exposing values',()=>{
  const entries=resolveConflicts([{id:'a',type:'goal',key:'g',value:'A',observedAt:'2026-08-01T00:00:00Z'},{id:'b',type:'goal',key:'g',value:'B',observedAt:'2026-09-01T00:00:00Z'}],{now});
  const report=diagnostics(entries,{now});assert.equal(report.total,2);assert.equal(report.active,1);assert.equal(report.superseded,1);assert.equal(report.classes.semantic,2);assert.equal(Object.prototype.hasOwnProperty.call(report,'value'),false);
 });

 console.log(`${passed} memory engine tests passed`);
}catch(error){console.error(error);process.exitCode=1;}
