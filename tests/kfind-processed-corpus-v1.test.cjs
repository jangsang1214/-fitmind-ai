'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..','04_data','knowledge','food-db-supplemental-korea-processed-v1');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const meta=JSON.parse(fs.readFileSync(path.join(root,'meta.json'),'utf8'));
const canonical=require('../04_data/knowledge/food-db.json');
const usda=require('../04_data/knowledge/food-db-supplemental-usda-v1.json');
const kfindFood=require('../04_data/knowledge/food-db-supplemental-korea-v1/manifest.json');

assert.equal(manifest.status,'ready');
assert.equal(manifest.format,'compact-array-v1');
assert.equal(manifest.rawCount,316734);
assert.ok(manifest.count>=250000,'K-FIND processed corpus unexpectedly small');
assert.equal(meta.records,manifest.count);
assert.ok(meta.brandRows>=250000,'K-FIND brand coverage unexpectedly small');
assert.ok(meta.brandRate>.99,'K-FIND brand coverage below 99%');
assert.equal(meta.reportNoRate,1);
assert.ok(meta.uniqueBrands>0);
assert.ok(meta.brandRoutePrefixes>0);
assert.equal(meta.guardrails.singleShardOwnership,true);
assert.equal(meta.guardrails.brandRouteOnlyNoDuplicateRecords,true);
assert.equal(manifest.fixedProvenance?.provider,'식품의약품안전처 K-FIND');
assert.ok(Array.isArray(manifest.fields)&&manifest.fields.length>=18);

let materialized=0,maxShardBytes=0,maxShardFile='',sample=null;
for(const spec of Object.values(manifest.shards||{})){
  const file=path.join(root,spec.file);
  assert.ok(fs.existsSync(file),'missing processed shard '+spec.file);
  const bytes=fs.statSync(file).size;
  if(bytes>maxShardBytes){maxShardBytes=bytes;maxShardFile=spec.file;}
  assert.ok(bytes<20_000_000,'processed shard too large '+spec.file);
  const payload=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(payload.format,'compact-array-v1');
  assert.equal(payload.count,payload.records.length);
  assert.deepEqual(payload.fields,manifest.fields);
  for(const row of payload.records.slice(0,3)){
    assert.ok(Array.isArray(row));
    assert.equal(row.length,manifest.fields.length);
  }
  if(!sample&&payload.records.length)sample=payload.records[0];
  materialized+=payload.records.length;
}
assert.equal(materialized,manifest.count);
assert.ok(sample);
const obj=Object.fromEntries(manifest.fields.map((key,i)=>[key,sample[i]]));
assert.ok(String(obj.food_id).startsWith('kfind-processed:'));
assert.ok(String(obj.name||'').trim());
assert.ok(Number(obj.basis_g)>0);
for(const key of ['kcal','protein','carbs','fat'])assert.ok(Number.isFinite(Number(obj[key])),key+' missing');
assert.ok(obj.report_no);

const totalLookupRecords=canonical.length+usda.count+kfindFood.count+manifest.count;
assert.equal(totalLookupRecords,500+5721+2502+manifest.count);
assert.ok(totalLookupRecords>=273000);

const app=fs.readFileSync(require.resolve('../01_app/app.js'),'utf8');
assert.ok(app.includes("KOREAN_PROCESSED_MANIFEST_PATH='04_data/knowledge/food-db-supplemental-korea-processed-v1/manifest.json'"));
assert.ok(app.includes('inflateKoreanProcessedShard(payload,manifest)'));
assert.ok(app.includes('manifest?.brandPrefixBuckets?.[routeKey]'));
assert.ok(app.includes("?'korea-processed':'korea-official'"));
assert.ok(app.includes("payload?.format!=='compact-array-v1'"));

console.log(JSON.stringify({
 status:'PASS',
 rawProcessed:manifest.rawCount,
 processedRecords:manifest.count,
 brandRows:meta.brandRows,
 uniqueBrands:meta.uniqueBrands,
 brandRate:meta.brandRate,
 reportNoRate:meta.reportNoRate,
 shards:Object.keys(manifest.shards||{}).length,
 maxShardBytes,
 maxShardFile,
 materializedLookupRecords:totalLookupRecords
},null,2));
console.log('kfind-processed-corpus-v1: PASS');
