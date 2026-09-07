'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const contract=JSON.parse(fs.readFileSync(path.join(root,'02_core/schema-contract-v1.json'),'utf8'));
const memoryContract=JSON.parse(fs.readFileSync(path.join(root,'02_core/memory-contract-v1.json'),'utf8'));
const ctx=vm.createContext({console,Date,Math,URL,AbortController,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(path.join(root,'02_core/data-schema.js'),'utf8'),ctx);
const G=ctx.GarangSchema;

assert.equal(contract.status,'frozen');
assert.equal(G.CONTRACT_VERSION,contract.contractVersion);
assert.equal(G.VERSION,contract.schemaVersion);
assert.deepEqual(Array.from(G.CONTRACT.topLevel),contract.topLevel);
assert.equal(contract.memoryContract,memoryContract.contractVersion,'state contract must pin the frozen memory sub-contract');
assert.equal(memoryContract.status,'frozen');
assert.deepEqual(memoryContract.container.arrayBuckets,contract.memoryBuckets,'state and memory contracts must agree on memory buckets');
for(const [legacy,canonical] of Object.entries(contract.compatibilityAliases))assert.equal(G.CONTRACT.compatibility[legacy],canonical);

const canonical=G.toTransport({
  profile:{name:'A',height:174,weight:67},
  workouts:[{id:'w1',date:'2026-09-08',name:'Bench',sets:3,reps:5,weight:80}],
  meals:[],runs:[],body:[],planner:[],dailyCheckins:[],aiChats:[],scoreHistory:[],memory:{entries:[],facts:[],preferences:[],goals:[],events:[],deletedIds:[],legacyMigrated:true}
});
assert.equal(G.validateContract(canonical).length,0);
const twice=G.toTransport(G.migrate(canonical));
assert.equal(JSON.stringify(twice),JSON.stringify(canonical),'frozen migration boundary must be idempotent');

assert.throws(()=>G.migrate({...canonical,schemaVersion:contract.schemaVersion+1}),/FUTURE_SCHEMA/,'future schema must fail closed');
assert.throws(()=>G.migrate({...canonical,contractVersion:'other-contract'}),/FOREIGN_CONTRACT/,'foreign contract must fail closed');

const withLocalOnly={...canonical,localTransient:{screen:'coach'},meta:{updatedAt:'2026-09-08T00:00:00.000Z'}};
const migrated=G.migrate(withLocalOnly);
assert.deepEqual(migrated.localTransient,{screen:'coach'},'local migration may preserve unknown current-version fields');
const transported=G.toTransport(withLocalOnly);
assert.equal('localTransient' in transported,false,'transport must strip non-canonical local fields');
assert.equal('meta' in transported,false,'transport must strip local meta container');

for(const key of contract.collectionDomains)assert.ok(Array.isArray(canonical[key]),`${key} must remain an array`);
for(const key of contract.memoryBuckets)assert.ok(Array.isArray(canonical.memory[key]),`memory.${key} must remain an array`);
console.log('schema-freeze-contract-v1: PASS',contract.freezeId,'memory',memoryContract.freezeId);
