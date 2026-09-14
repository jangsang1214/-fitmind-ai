'use strict';
const assert=require('node:assert/strict');
const Food=require('../02_core/food-data-foundation-v2.js');
const foods=require('../04_data/knowledge/food-db.json');
const registry=require('../04_data/knowledge/food-source-registry-v2.json');

assert.ok(Array.isArray(foods)&&foods.length>0,'Food DB must contain rows');
const report=Food.audit(foods);
assert.equal(report.errors.length,0,`Food DB structural errors: ${JSON.stringify(report.errors.slice(0,20))}`);
assert.equal(registry.version,'garang-food-source-registry-v2');
assert.ok(registry.sources.some(source=>source.id==='kfind'&&source.official===true));
assert.ok(registry.sources.some(source=>source.id==='usda-fdc'&&source.official===true));
assert.deepEqual(registry.policy.qualityStates,['verified','approximate','estimated','unknown']);
for(const row of foods){
  if(/임의\s*추정|estimated/i.test(String(row.source||'')))assert.notEqual(String(row.nutrition_status||'').toLowerCase(),'verified',`estimated source cannot be verified: ${row.food_id||row.name}`);
}
console.log(JSON.stringify({status:'PASS',total:report.total,statusCounts:report.statusCounts,warnings:report.warnings.length,duplicateNames:report.duplicateNames.length,aliasCollisions:report.aliasCollisions.length},null,2));
console.log('food-data-quality-gate: PASS');
