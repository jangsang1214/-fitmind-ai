'use strict';
const assert=require('node:assert/strict');
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

const retrievalCases=[
 ['protein meals','protein'],
 ['morning strength training','morning'],
 ['10K 45 minutes','goal'],
 ['metric unit','units'],
 ['training experience intermediate','new']
];
let retrievalHits=0;
for(const [query,expected] of retrievalCases){const top=Memory.selectMemory(corpus,{query,now,limit:1})[0];if(top?.id===expected)retrievalHits++;else console.error('BENCH retrieval miss',{query,expected,actual:top?.id});}
const precisionAt1=retrievalHits/retrievalCases.length;

const conflictCases=[
 [{id:'a',type:'goal',key:'g',value:'cut',userConfirmed:true,observedAt:'2026-08-01T00:00:00Z'},{id:'b',type:'goal',key:'g',value:'gain',userConfirmed:true,observedAt:'2026-09-01T00:00:00Z'}],'b'],
 [{id:'a',type:'preference',key:'time',value:'morning',userConfirmed:true,observedAt:'2026-08-01T00:00:00Z'},{id:'b',type:'preference',key:'time',value:'evening',userConfirmed:false,observedAt:'2026-09-01T00:00:00Z'}],'a'],
 [{id:'a',type:'note',key:'x',value:'same',userConfirmed:true,observedAt:'2026-08-01T00:00:00Z'},{id:'b',type:'note',key:'x',value:'same',userConfirmed:true,observedAt:'2026-09-01T00:00:00Z'}],'a']
];
let conflictHits=0;
for(const [input,expected] of conflictCases){const out=Memory.resolveConflicts(input,{now}),active=out.find(x=>x.status==='active');if(active?.id===expected)conflictHits++;else console.error('BENCH conflict miss',{expected,actual:active?.id});}
const conflictAccuracy=conflictHits/conflictCases.length;

const context=Memory.prepareMemoryContext({entries:corpus},{profile:{goal:'10K under 45 minutes'},preferences:{language:'en',unit:'metric'}},{query:'protein meals',now,limit:3,budgetChars:900});
const result={policyVersion:Memory.POLICY_VERSION,retrievalPrecisionAt1:precisionAt1,conflictAccuracy,selectedCount:context.entries.length,historyCount:context.meta.historyCount};
console.log('MEMORY_STAGE1_BENCHMARK',JSON.stringify(result));
assert.ok(precisionAt1>=0.8,`retrievalPrecisionAt1 ${precisionAt1}`);
assert.ok(conflictAccuracy>=1,`conflictAccuracy ${conflictAccuracy}`);
assert.ok(context.entries.length<=3);
