'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Server=require('../functions/src/memory-engine.cjs');
const root=path.resolve(__dirname,'..');
const context={console};context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'02_core/memory-intelligence-v1.js'),'utf8'),context);
const Client=context.GarangMemoryIntelligence;
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};
const now=new Date('2026-09-05T12:00:00Z');

test('browser and server freeze the same policy and memory classes',()=>{
 assert.equal(Client.POLICY_VERSION,Server.POLICY_VERSION);assert.deepEqual([...Client.MEMORY_CLASSES],[...Server.MEMORY_CLASSES]);
});

test('browser current-value conflict result matches server semantics',()=>{
 const input=[
  {id:'old',memoryClass:'semantic',type:'goal',key:'primary_goal',value:'cut',userConfirmed:true,observedAt:'2026-08-01T00:00:00Z'},
  {id:'new',memoryClass:'semantic',type:'goal',key:'primary_goal',value:'gain',userConfirmed:true,observedAt:'2026-09-01T00:00:00Z'}
 ];
 for(const engine of [Client,Server]){const out=engine.resolveConflicts(input,{now}),active=out.find(x=>x.status==='active'),old=out.find(x=>x.status==='superseded');assert.equal(active.value,'gain');assert.equal(old.value,'cut');assert.equal(old.supersededBy,active.id);}
});

test('browser and server hide unconfirmed memory from normal context',()=>{
 const memory={entries:[{id:'yes',type:'note',key:'yes',value:'confirmed',userConfirmed:true},{id:'no',type:'note',key:'no',value:'pending',userConfirmed:false}]};
 for(const engine of [Client,Server]){const out=engine.prepareMemoryContext(memory,{}, {now,query:'note'});assert.ok(out.entries.some(x=>x.id==='yes'));assert.ok(!out.entries.some(x=>x.id==='no'));}
});

test('live shell loads Memory Intelligence before Agent State Hook',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8')),sw=fs.readFileSync(path.join(root,'02_core/sw-runtime.js'),'utf8');
 const core='02_core/memory-intelligence-v1.js',hook='06_features/final/agent-state-hook-v1.js';assert.ok(manifest.scripts.includes(core));assert.ok(html.indexOf('./'+core)>0&&html.indexOf('./'+core)<html.indexOf('./'+hook));assert.ok(sw.includes('./'+core));
});

test('Agent State Hook exposes memory context and diagnostics bridge',()=>{
 const source=fs.readFileSync(path.join(root,'06_features/final/agent-state-hook-v1.js'),'utf8');for(const token of ['GarangMemoryIntelligence','getMemoryContext','getMemoryDiagnostics','semanticKey','deletedIds'])assert.ok(source.includes(token),token);
});

console.log(`${passed} memory intelligence parity tests passed`);
