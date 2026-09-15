'use strict';
const assert=require('node:assert/strict');
const Food=require('../02_core/food-data-foundation-v2.js');
const Safe=require('../02_core/food-corpus-safe-overrides-v1.js');
const foods=require('../04_data/knowledge/food-db.json');
const official=require('../04_data/knowledge/kfind-home-analyzed-v1.json');
const registry=require('../04_data/knowledge/food-source-registry-v2.json');

assert.ok(Array.isArray(foods)&&foods.length>0,'Food DB must contain rows');
const report=Food.audit(foods);
assert.equal(report.errors.length,0,`Food DB structural errors: ${JSON.stringify(report.errors.slice(0,20))}`);
assert.equal(registry.version,'garang-food-source-registry-v2');
assert.ok(registry.sources.some(source=>source.id==='kfind'&&source.official===true));
assert.ok(registry.sources.some(source=>source.id==='usda-fdc'&&source.official===true));
assert.deepEqual(registry.policy.qualityStates,['verified','approximate','estimated','unknown']);
for(const row of foods){if(/임의\s*추정|estimated/i.test(String(row.source||'')))assert.notEqual(String(row.nutrition_status||'').toLowerCase(),'verified',`estimated source cannot be verified: ${row.food_id||row.name}`);}

assert.equal(foods.length,500,'GARANG canonical food corpus must remain 500 rows');
assert.equal(official.source.eligibleSourceRows,482,'official K-FIND eligible source row count drifted');
assert.equal(official.source.includedSafeBatchRows,5,'official safe batch row count drifted');
assert.equal(official.source.sha256,'1ef3551f9a1d0ee87891d6306fa22bbd6a7ffcc90f2c70a4a184dbfe3fce6ea6');
assert.equal(official.source.sha256,official.source.duplicateSha256,'duplicate Food DB upload must have identical hash');

const officialRows=Safe.materializeOfficial(official);
const officialByName=new Map(officialRows.map(row=>[Food.normalizedName(row.name),row]));
const alreadyApplied=[];
for(const row of foods){
  const officialRow=officialByName.get(Food.normalizedName(row.name));
  if(!officialRow)continue;
  const canonical=Food.canonicalize(row);
  if(canonical.quality==='verified'&&canonical.provenance.provider==='MFDS K-FIND'&&canonical.provenance.dataset==='KDDB_HOME_ANALYZED'&&canonical.provenance.recordId===officialRow.provenance.recordId)alreadyApplied.push({targetFoodId:canonical.foodId,targetName:canonical.name,official:officialRow});
}

const merge=Safe.merge(foods,official),plan=merge.plan;
assert.equal(merge.foods.length,foods.length,'safe merge cannot add or remove foods');
assert.equal(plan.summary.officialRecords,5);
assert.equal(plan.summary.rejectedOfficial,0,'all committed official rows must pass provenance/quality checks');
assert.equal(plan.summary.safeProposals+alreadyApplied.length,5,'all five v1 official rows must be safely proposed or already applied');
assert.deepEqual(merge.foods.map(x=>x.food_id),foods.map(x=>x.food_id),'safe merge must preserve food IDs and order');
assert.ok(!plan.proposals.some(p=>Food.normalizedName(p.targetName)===Food.normalizedName('라면')),'라면 may never auto-merge');

const expectedById=new Map([...plan.proposals,...alreadyApplied].map(item=>[item.targetFoodId,item.official]));
const byId=new Map(merge.foods.map(x=>[x.food_id,x]));
for(const [targetFoodId,officialRow] of expectedById){
  const merged=byId.get(targetFoodId);
  assert.ok(merged,`missing merged row ${targetFoodId}`);
  assert.equal(Food.normalizedName(merged.name),Food.normalizedName(officialRow.name),'only exact primary-name matches may auto-merge');
  assert.equal(merged.nutrition_status,'verified');
  assert.equal(merged.provenance.provider,'MFDS K-FIND');
  assert.equal(merged.provenance.dataset,'KDDB_HOME_ANALYZED');
  assert.equal(merged.provenance.recordId,officialRow.provenance.recordId);
  for(const key of Safe.NUTRIENT_KEYS){const legacyKey=key==='saturatedFat'?'saturated_fat':key==='transFat'?'trans_fat':key;assert.equal(merged[legacyKey],officialRow.nutrients[key],`${merged.name} ${key} must equal official value`);}
}

for(const name of ['현미밥','잡곡밥','보리밥','하이라이스','카스텔라']){
  const target=foods.find(x=>Food.normalizedName(x.name)===Food.normalizedName(name));
  assert.ok(target,`${name} must exist in canonical food corpus`);
  const officialRow=officialByName.get(Food.normalizedName(name));
  const canonical=Food.canonicalize(target);
  const applied=canonical.quality==='verified'&&canonical.provenance.recordId===officialRow.provenance.recordId;
  assert.ok(applied||plan.proposals.some(p=>p.targetFoodId===target.food_id),`${name} must be safely proposed or already applied`);
}

console.log(JSON.stringify({status:'PASS',total:report.total,statusCounts:report.statusCounts,warnings:report.warnings.length,duplicateNames:report.duplicateNames.length,aliasCollisions:report.aliasCollisions.length,officialSafeMerge:{...plan.summary,alreadyApplied:alreadyApplied.length}},null,2));
console.log('food-data-quality-gate: PASS');
