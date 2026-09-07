'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Server=require('../functions/src/memory-engine.cjs');
const root=path.resolve(__dirname,'..');
const contract=JSON.parse(fs.readFileSync(path.join(root,'02_core/memory-contract-v1.json'),'utf8'));
const context={console,Date,Math,JSON,Set,Map};context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'02_core/memory-intelligence-v1.js'),'utf8'),context);
const Client=context.GarangMemoryIntelligence;
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};const now=new Date('2026-09-05T12:00:00Z');

test('browser and server freeze the same memory sub-contract',()=>{
 assert.equal(contract.status,'frozen');
 for(const key of ['POLICY_VERSION','CONTRACT_VERSION','MEMORY_SCHEMA_VERSION'])assert.equal(Client[key],Server[key],key);
 assert.equal(Client.CONTRACT_VERSION,contract.contractVersion);assert.equal(Client.MEMORY_SCHEMA_VERSION,contract.schemaVersion);assert.equal(Client.POLICY_VERSION,contract.policyVersion);
 assert.deepEqual([...Client.MEMORY_CLASSES],[...Server.MEMORY_CLASSES]);assert.deepEqual([...Client.MEMORY_CLASSES],contract.memoryClasses);
 assert.deepEqual([...Client.ENTRY_STATUSES],[...Server.ENTRY_STATUSES]);
});

test('browser and server current-value conflict results are byte-equivalent',()=>{
 const input=[{id:'old',memoryClass:'semantic',type:'goal',key:'primary_goal',value:'cut',userConfirmed:true,observedAt:'2026-08-01T00:00:00Z'},{id:'new',memoryClass:'semantic',type:'goal',key:'primary_goal',value:'gain',userConfirmed:true,observedAt:'2026-09-01T00:00:00Z'}];
 assert.equal(JSON.stringify(Client.resolveConflicts(input,{now})),JSON.stringify(Server.resolveConflicts(input,{now})));
});

test('browser and server hide unconfirmed, deleted and foreign-owner memory from normal context',()=>{
 const memory={entries:[{id:'yes',ownerUid:'u1',type:'note',key:'yes',value:'confirmed',userConfirmed:true},{id:'no',ownerUid:'u1',type:'note',key:'no',value:'pending',userConfirmed:false},{id:'foreign',ownerUid:'u2',type:'note',key:'foreign',value:'other account',userConfirmed:true},{id:'gone',ownerUid:'u1',type:'note',key:'gone',value:'deleted',userConfirmed:true}],deletedIds:['gone']};
 const state={meta:{syncOwnerUid:'u1'}};
 for(const engine of [Client,Server]){const out=engine.prepareMemoryContext(memory,state,{now,query:'note'});assert.ok(out.entries.some(x=>x.id==='yes'));for(const id of ['no','foreign','gone'])assert.ok(!out.entries.some(x=>x.id===id),id);assert.ok(out.meta.usedChars<=out.meta.budgetChars);}
});

test('browser and server migration and container merge stay deterministic',()=>{
 const a={facts:['legacy'],entries:[{id:'x',type:'goal',key:'g',value:'A',observedAt:'2026-08-01T00:00:00Z'}],deletedIds:['gone']};
 const b={entries:[{id:'y',type:'goal',key:'g',value:'B',observedAt:'2026-09-01T00:00:00Z'},{id:'gone',type:'note',key:'gone',value:'stale'}]};
 const client=Client.mergeMemoryContainers(a,b,{now,ownerUid:'u1'}),server=Server.mergeMemoryContainers(a,b,{now,ownerUid:'u1'});
 assert.equal(JSON.stringify(client),JSON.stringify(server));assert.equal(JSON.stringify(Client.migrateMemory(client,{now,ownerUid:'u1'})),JSON.stringify(client));
});

test('AI context returns only the frozen context field allowlist and not raw legacy buckets',()=>{
 const out=Client.prepareMemoryContext({facts:['raw'],entries:[{id:'x',type:'note',key:'k',value:'visible',secret:'hidden'}]},{},{now,budgetChars:1000});
 assert.equal(Array.from(out.facts).length,0);assert.equal(out.meta.legacyBucketCounts.facts,1);
 for(const entry of Array.from(out.entries)){for(const key of Object.keys(entry))assert.ok(contract.contextEntryFields.includes(key),key);assert.equal('secret' in entry,false);assert.equal('ownerUid' in entry,false);}
});

test('live shell loads Memory Intelligence before Agent State Hook and dynamic PWA precache is active',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8')),sw=fs.readFileSync(path.join(root,'02_core/sw-runtime.js'),'utf8');
 const core='02_core/memory-intelligence-v1.js',hook='06_features/final/agent-state-hook-v1.js';
 assert.ok(manifest.scripts.includes(core));assert.ok(html.indexOf('./'+core)>0&&html.indexOf('./'+core)<html.indexOf('./'+hook));assert.ok(sw.includes('html.matchAll(/(?:src|href)'));assert.ok(sw.includes("CACHE_PREFIX='garang-app-shell-'"));
});

test('Agent State Hook exposes memory context and diagnostics bridge',()=>{
 const source=fs.readFileSync(path.join(root,'06_features/final/agent-state-hook-v1.js'),'utf8');for(const token of ['GarangMemoryIntelligence','getMemoryContext','getMemoryDiagnostics','semanticKey','deletedIds'])assert.ok(source.includes(token),token);
});

console.log(`${passed} memory intelligence parity tests passed`);
