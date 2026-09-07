'use strict';
const assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const Memory=require('../functions/src/memory-engine.cjs');
const now=new Date('2026-09-05T12:00:00Z');

const corpus=[
 {id:'goal',memoryClass:'semantic',type:'goal',key:'primary_goal',value:'10K under 45 minutes',importance:5,confidence:.99,utility:1,userConfirmed:true,updatedAt:'2026-09-04T00:00:00Z'},
 {id:'protein',memoryClass:'preference',type:'preference',key:'nutrition',value:'high protein meals',importance:4,confidence:.95,utility:.9,userConfirmed:true,updatedAt:'2026-09-04T00:00:00Z'},
 {id:'morning',memoryClass:'preference',type:'preference',key:'training_time',value:'morning strength training',importance:4,confidence:.95,utility:.9,userConfirmed:true,updatedAt:'2026-09-04T00:00:00Z'},
 {id:'units',memoryClass:'procedural',type:'preference',key:'unit_system',value:'metric',importance:4,confidence:.99,utility:1,userConfirmed:true,updatedAt:'2026-09-04T00:00:00Z'},
 {id:'old',memoryClass:'semantic',type:'identity',key:'training_experience',value:'beginner',importance:3,confidence:.9,userConfirmed:true,observedAt:'2026-06-01T00:00:00Z'},
 {id:'new',memoryClass:'semantic',type:'identity',key:'training_experience',value:'intermediate',importance:3,confidence:.9,userConfirmed:true,observedAt:'2026-09-01T00:00:00Z'}
];

const retrievalCases=[['protein meals','protein'],['morning strength training','morning'],['10K 45 minutes','goal'],['metric unit','units'],['training experience intermediate','new']];
let retrievalHits=0;
for(const [query,expected] of retrievalCases){const top=Memory.selectMemory(corpus,{query,now,limit:1})[0];if(top?.id===expected)retrievalHits++;else console.error('BENCH retrieval miss',{query,expected,actual:top?.id});}
const precisionAt1=retrievalHits/retrievalCases.length;

const conflictCases=[
 [[{id:'a',type:'goal',key:'g',value:'cut',userConfirmed:true,observedAt:'2026-08-01T00:00:00Z'},{id:'b',type:'goal',key:'g',value:'gain',userConfirmed:true,observedAt:'2026-09-01T00:00:00Z'}],'b'],
 [[{id:'a',type:'preference',key:'time',value:'morning',userConfirmed:true,observedAt:'2026-08-01T00:00:00Z'},{id:'b',type:'preference',key:'time',value:'evening',userConfirmed:false,observedAt:'2026-09-01T00:00:00Z'}],'a'],
 [[{id:'a',type:'note',key:'x',value:'same',userConfirmed:true,observedAt:'2026-08-01T00:00:00Z'},{id:'b',type:'note',key:'x',value:'same',userConfirmed:true,observedAt:'2026-09-01T00:00:00Z'}],'a']
];
let conflictHits=0;
for(const [input,expected] of conflictCases){const out=Memory.resolveConflicts(input,{now}),active=out.find(x=>x.status==='active');if(active?.id===expected)conflictHits++;else console.error('BENCH conflict miss',{expected,actual:active?.id});}
const conflictAccuracy=conflictHits/conflictCases.length;

const replay={id:'replay',type:'goal',key:'g2',value:'same',evidenceCount:3,userConfirmed:true,updatedAt:'2026-09-04T00:00:00Z'};
let replayed=Memory.upsertMemory([],replay,{now});for(let i=0;i<5;i++)replayed=Memory.upsertMemory(replayed,replay,{now});
const replayIdempotent=replayed.length===1&&replayed[0].evidenceCount===3;

const merged=Memory.mergeMemoryContainers({entries:[],deletedIds:['gone']},{entries:[{id:'gone',type:'note',key:'x',value:'stale'},{id:'keep',type:'note',key:'y',value:'current'}]},{now,ownerUid:'u1'});
const tombstoneAccuracy=!merged.entries.some(x=>x.id==='gone')&&merged.entries.some(x=>x.id==='keep');

const context=Memory.prepareMemoryContext({facts:['legacy raw'],entries:[...corpus,{id:'pending',type:'note',key:'p',value:'hidden',userConfirmed:false,secret:'x'}]},{profile:{goal:'10K under 45 minutes'},preferences:{language:'en',unit:'metric'}},{query:'protein meals',now,limit:3,budgetChars:900});
const budgetStrict=context.meta.usedChars<=context.meta.budgetChars;
const contextSafe=context.facts.length===0&&!context.entries.some(x=>x.userConfirmed===false||'secret' in x||'ownerUid' in x);

const sample=Array.from({length:300},(_,i)=>({id:`bench-${i}`,type:i%5===0?'preference':'note',key:`k${i}`,value:`training memory ${i} protein strength recovery`,importance:(i%5)+1,confidence:.8,userConfirmed:true,updatedAt:new Date(Date.parse('2026-08-01T00:00:00Z')+i*60000).toISOString()}));
const start=performance.now();for(let i=0;i<100;i++)Memory.selectMemory(sample,{query:i%2?'protein training':'recovery strength',now,limit:12,budgetChars:4000});const retrieval100Ms=Number((performance.now()-start).toFixed(2));

const migrated=Memory.migrateMemory({entries:corpus,deletedIds:['z','z']},{now}),migrationIdempotent=JSON.stringify(migrated)===JSON.stringify(Memory.migrateMemory(migrated,{now}));

const result={policyVersion:Memory.POLICY_VERSION,contractVersion:Memory.CONTRACT_VERSION,retrievalPrecisionAt1:precisionAt1,conflictAccuracy,replayIdempotent,tombstoneAccuracy,budgetStrict,contextSafe,migrationIdempotent,selectedCount:context.entries.length,historyCount:context.meta.historyCount,usedChars:context.meta.usedChars,budgetChars:context.meta.budgetChars,retrieval100Ms};
console.log('MEMORY_FREEZE_BENCHMARK',JSON.stringify(result));
assert.ok(precisionAt1>=0.8,`retrievalPrecisionAt1 ${precisionAt1}`);
assert.equal(conflictAccuracy,1);
assert.equal(replayIdempotent,true);
assert.equal(tombstoneAccuracy,true);
assert.equal(budgetStrict,true);
assert.equal(contextSafe,true);
assert.equal(migrationIdempotent,true);
assert.ok(context.entries.length<=3);
assert.ok(retrieval100Ms<7500,`retrieval100Ms ${retrieval100Ms}`);
