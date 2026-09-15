from pathlib import Path

p=Path('tests/food-data-quality-gate.test.cjs')
s=p.read_text()
s=s.replace("const crypto=require('node:crypto');", "const crypto=require('node:crypto');\nconst fs=require('node:fs');", 1)
s=s.replace("const official=require('../04_data/knowledge/kfind-home-analyzed-v2.json');", "const official=require('../04_data/knowledge/kfind-home-analyzed-v2.json');\nconst v3=require('../04_data/knowledge/official-food-corpus-v3.json');", 1)
old="assert.deepEqual(plan.summary.projectedAfter,{verified:81,approximate:10,estimated:409,unknown:0},'v2 quality projection drifted');"
new="assert.deepEqual(plan.summary.projectedAfter,{verified:232,approximate:3,estimated:265,unknown:0},'current quality projection drifted after v3 materialization');"
if old not in s:
    raise SystemExit('v2 projection assertion not found')
s=s.replace(old,new,1)
old="assert.ok([5,81].includes(report.statusCounts.verified),'canonical DB must be at v1 baseline or fully applied v2 state while this PR is being materialized');"
new="""assert.equal(v3.version,'garang-official-food-corpus-v3');
assert.equal(v3.result.changedRows,151,'v3 must change exactly the reviewed 151 rows');
assert.equal(v3.result.unchangedRows,349,'v3 must preserve the other 349 rows');
assert.deepEqual(v3.result.quality,{verified:232,approximate:3,estimated:265,unknown:0});
assert.deepEqual(v3.result.sourceContribution,{D:86,K:63,P:2});
assert.deepEqual(v3.result.remainingApproximate,['라면','오트밀','그릭요거트']);
assert.equal(v3.result.identitySha256,'29cf92749dfc578d51bda4b17608f2edb52abb365a36879ea5af1b83a8225cce');
assert.equal(v3.result.canonicalSha256,'1cd82e86a3df4da40afdb1ddc65480e2c911809fa9dcc2e48ec059c4d8b73956');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../04_data/knowledge/food-db.json'))).digest('hex'),v3.result.canonicalSha256,'canonical food DB bytes drifted');
assert.equal(v3.records.length,151,'v3 audit must contain exactly 151 reviewed upgrades');
const foodById=new Map(foods.map(row=>[row.food_id,row]));
for(const entry of v3.records){
  const [foodId,sourceKey,recordId,sourceRowName,matchRule,...values]=entry;
  const row=foodById.get(foodId),source=v3.sources[sourceKey];
  assert.ok(row&&source,`v3 audit reference missing for ${foodId}`);
  assert.equal(row.nutrition_status,'verified');
  assert.equal(row.provenance.provider,source.provider);
  assert.equal(row.provenance.dataset,source.dataset);
  assert.equal(row.provenance.recordId,String(recordId));
  assert.equal(row.provenance.sourceFileSha256,source.sha256);
  assert.equal(row.provenance.sourceRowName,sourceRowName);
  assert.equal(row.provenance.matchRule,matchRule);
  for(let i=0;i<v3.nutrientOrder.length;i++)assert.equal(row[v3.nutrientOrder[i]],Number(values[i]),`${row.name} ${v3.nutrientOrder[i]} must equal reviewed official v3 value`);
}
assert.deepEqual(report.statusCounts,{verified:232,approximate:3,estimated:265,unknown:0},'canonical quality state must match reviewed v3 result');
const ramen=foods.find(row=>row.name==='라면');
assert.ok(ramen,'generic 라면 canonical row must exist');
assert.notEqual(ramen.nutrition_status,'verified','generic 라면 must remain fail-closed');"""
if old not in s:
    raise SystemExit('legacy final quality assertion not found')
s=s.replace(old,new,1)
p.write_text(s)
