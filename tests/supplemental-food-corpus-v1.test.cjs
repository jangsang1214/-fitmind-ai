'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Food=require('../02_core/food-data-foundation-v2.js');
const Intelligence=require('../02_core/food-intelligence-v2.js');
const canonical=require('../04_data/knowledge/food-db.json');
const corpus=require('../04_data/knowledge/food-db-supplemental-usda-v1.json');
const meta=require('../04_data/knowledge/food-db-supplemental-usda-v1.meta.json');

assert.equal(corpus.version,'garang-usda-supplemental-corpus-v1');
assert.ok(Array.isArray(corpus.records));
assert.equal(corpus.records.length,meta.count);
assert.ok(corpus.records.length>=5000,'supplemental corpus must preserve meaningful scale');
assert.equal(canonical.length,500,'canonical Korean corpus must remain the primary curated 500-row set');
assert.equal(meta.audit.pass,true);
assert.equal(meta.audit.errors,0);
assert.equal(meta.audit.statusCounts.verified,corpus.records.length);
assert.equal(meta.audit.coverage.traceableProvenanceRate,1);
assert.equal(meta.guardrails.canonicalPrimary,true);
assert.equal(meta.guardrails.noAutomaticCanonicalOverwrite,true);
assert.equal(meta.guardrails.noFabricatedAliases,true);
assert.ok(meta.sourceCounts.Foundation>=250,'Foundation coverage unexpectedly small');
assert.ok(meta.sourceCounts.FNDDS>=5000,'FNDDS coverage unexpectedly small');

const ids=new Set(),names=new Set();
for(const row of corpus.records){
 assert.equal(row.nutrition_status,'verified');
 assert.ok(String(row.food_id||'').startsWith('usda-fdc:'),`unexpected supplemental id: ${row.food_id}`);
 assert.ok(row.provenance?.provider==='USDA FoodData Central');
 assert.ok(row.provenance?.dataset);
 assert.ok(row.provenance?.recordId);
 assert.ok(Number(row.basis_g)>0);
 for(const key of ['kcal','protein','carbs','fat'])assert.ok(Number.isFinite(Number(row[key])),`${row.food_id} missing ${key}`);
 assert.ok(!ids.has(row.food_id),`duplicate supplemental id ${row.food_id}`);ids.add(row.food_id);
 const key=Food.normalizedName(row.name);assert.ok(key);assert.ok(!names.has(key),`duplicate normalized supplemental name ${row.name}`);names.add(key);
}
assert.ok(corpus.records.some(row=>row.provenance.dataset==='Foundation'));
assert.ok(corpus.records.some(row=>row.provenance.dataset==='FNDDS'));

for(const dataset of ['Foundation','FNDDS']){
 const sample=corpus.records.find(row=>row.provenance.dataset===dataset);
 assert.ok(sample,`missing ${dataset} sample`);
 const hit=Intelligence.resolve(corpus.records,sample.name,{mode:'manual'});
 assert.equal(hit.status,'matched',`${dataset} exact sample should resolve`);
 assert.equal(hit.food.food_id,sample.food_id);
}

const app=fs.readFileSync(require.resolve('../01_app/app.js'),'utf8');
assert.ok(app.includes("SUPPLEMENTAL_FOOD_DB_PATH='04_data/knowledge/food-db-supplemental-usda-v1.json'"));
assert.ok(app.includes('lookupMealScanSupplemental(needsLookup)'),'Meal Scan must check supplemental corpus before web lookup');
assert.ok(app.includes('lookupMealScanNutrition(supplemental.unresolved)'),'web lookup must receive only supplemental misses');
assert.ok(app.includes("cache:'force-cache'"),'supplemental corpus should not be re-downloaded on every miss');

console.log(JSON.stringify({
 status:'PASS',
 canonical:canonical.length,
 supplemental:corpus.records.length,
 effectiveCoverage:canonical.length+corpus.records.length,
 sourceCounts:meta.sourceCounts,
 audit:meta.audit
},null,2));
console.log('supplemental-food-corpus-v1: PASS');
