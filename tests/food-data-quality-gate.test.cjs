'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const Food=require('../02_core/food-data-foundation-v2.js');
const Safe=require('../02_core/food-corpus-safe-overrides-v1.js');
const foods=require('../04_data/knowledge/food-db.json');
const official=require('../04_data/knowledge/kfind-home-analyzed-v2.json');
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
assert.equal(official.version,'garang-kfind-home-analyzed-corpus-v2');
assert.equal(official.source.eligibleSourceRows,482,'eligible K-FIND source row count drifted');
assert.equal(official.source.exactCanonicalMatches,82,'exact canonical K-FIND match count drifted');
assert.equal(official.source.includedSafeBatchRows,81,'reviewed K-FIND safe batch count drifted');
assert.equal(official.source.newUpgradeRows,76,'new upgrade row count drifted');
assert.equal(official.source.excludedSemanticRows,1,'semantic exclusion count drifted');
assert.deepEqual(official.source.excludedNames,['라면']);
assert.equal(official.source.sha256,'1ef3551f9a1d0ee87891d6306fa22bbd6a7ffcc90f2c70a4a184dbfe3fce6ea6');
assert.equal(official.source.sha256,official.source.duplicateSha256,'duplicate Food DB upload must have identical hash');
assert.equal(official.records.length,81,'v2 source must contain exactly the reviewed 81 safe records');
assert.equal(new Set(official.records.map(row=>Food.normalizedName(row.name))).size,81,'v2 source names must be unique');
assert.ok(!official.records.some(row=>Food.normalizedName(row.name)===Food.normalizedName('라면')),'라면 must stay outside the automatic v2 source');

const nutrientKeys=['kcal','protein','fat','carbs','sugar','fiber','sodium','cholesterol','saturatedFat','transFat'];
const semanticPayload=official.records.map(row=>`${row.recordId}\t${row.name}\t${row.category}\t${nutrientKeys.map(key=>String(Number(row.nutrients[key]))).join(',')}`).join('\n');
assert.equal(crypto.createHash('sha256').update(semanticPayload).digest('hex'),'bc09e1ccc6ed256b03ad7cef7fa2691c008027e56af59a2cce54f00adacf1714','reviewed v2 official values drifted from Founder-provided workbook extraction');

const officialRows=Safe.materializeOfficial(official);
const officialByName=new Map(officialRows.map(row=>[Food.normalizedName(row.name),row]));
const targetByName=new Map(foods.map(row=>[Food.normalizedName(row.name),row]));
const alreadyApplied=[];
for(const officialRow of officialRows){
  const target=targetByName.get(Food.normalizedName(officialRow.name));
  assert.ok(target,`official v2 source must exact-match a canonical food: ${officialRow.name}`);
  const canonical=Food.canonicalize(target);
  if(canonical.quality==='verified'&&canonical.provenance.provider==='MFDS K-FIND'&&canonical.provenance.dataset==='KDDB_HOME_ANALYZED'&&canonical.provenance.recordId===officialRow.provenance.recordId)alreadyApplied.push({targetFoodId:canonical.foodId,targetName:canonical.name,official:officialRow});
}

const merge=Safe.merge(foods,official),plan=merge.plan;
assert.equal(merge.foods.length,foods.length,'safe merge cannot add or remove foods');
assert.equal(plan.summary.officialRecords,81);
assert.equal(plan.summary.rejectedOfficial,0,'all committed official rows must pass provenance/quality checks');
assert.equal(plan.summary.safeProposals+alreadyApplied.length,81,'all reviewed v2 rows must be safely proposed or already applied');
assert.deepEqual(plan.summary.projectedAfter,{verified:81,approximate:10,estimated:409,unknown:0},'v2 quality projection drifted');
assert.deepEqual(merge.foods.map(x=>x.food_id),foods.map(x=>x.food_id),'safe merge must preserve food IDs and order');
assert.deepEqual(merge.foods.map(x=>x.name),foods.map(x=>x.name),'safe merge must preserve canonical names');
assert.deepEqual(merge.foods.map(x=>x.category),foods.map(x=>x.category),'safe merge must preserve canonical categories');
assert.deepEqual(merge.foods.map(x=>x.serving),foods.map(x=>x.serving),'safe merge must preserve serving labels');
assert.ok(!plan.proposals.some(p=>Food.normalizedName(p.targetName)===Food.normalizedName('라면')),'라면 may never auto-merge');

const mergedByName=new Map(merge.foods.map(row=>[Food.normalizedName(row.name),row]));
for(const officialRow of officialRows){
  const merged=mergedByName.get(Food.normalizedName(officialRow.name));
  assert.ok(merged,`missing merged row ${officialRow.name}`);
  assert.equal(merged.nutrition_status,'verified');
  assert.equal(merged.provenance.provider,'MFDS K-FIND');
  assert.equal(merged.provenance.dataset,'KDDB_HOME_ANALYZED');
  assert.equal(merged.provenance.recordId,officialRow.provenance.recordId);
  for(const key of Safe.NUTRIENT_KEYS){const legacyKey=key==='saturatedFat'?'saturated_fat':key==='transFat'?'trans_fat':key;assert.equal(merged[legacyKey],officialRow.nutrients[key],`${merged.name} ${key} must equal official value`);}
}

assert.ok([5,81].includes(report.statusCounts.verified),'canonical DB must be at v1 baseline or fully applied v2 state while this PR is being materialized');
console.log(JSON.stringify({status:'PASS',total:report.total,statusCounts:report.statusCounts,warnings:report.warnings.length,duplicateNames:report.duplicateNames.length,aliasCollisions:report.aliasCollisions.length,officialSafeMerge:{...plan.summary,alreadyApplied:alreadyApplied.length}},null,2));
console.log('food-data-quality-gate: PASS');
